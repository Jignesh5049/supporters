import type { InvoiceDetail, Invoice as InvoiceDto, Page } from '@supporters/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { notFound } from '../../lib/errors';
import { pageArgs, splitPage } from '../../lib/pagination';
import { GST_STATE_CODE, financialYearOf, formatInvoiceNumber, splitInclusiveGst } from './gst';
import type { InvoiceSeller } from './invoice-seller';
import { INVOICE_LINK_TTL_SEC, INVOICE_PREFIX, type InvoiceStore } from './invoice-store';
import { type InvoiceDetails, renderInvoicePdf } from './invoice.pdf';

const GSTIN_STATE = /^(\d{2})[A-Z0-9]{13}$/;

const money = (paise: bigint | number) => ({
  amountPaise: Number(paise),
  currency: 'INR' as const,
});

/** The queue job that renders and stores one PDF. */
export interface InvoicePdfJob {
  invoiceId: string;
}

export class InvoicesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly seller: InvoiceSeller,
    private readonly store: InvoiceStore | null,
    private readonly log?: FastifyBaseLogger,
  ) {}

  /**
   * Issues the invoice of a captured payment inside the caller's transaction. The number comes from
   * a per-financial-year counter bumped under its row lock in this same transaction, so concurrent
   * payments queue up on it, numbers never repeat, and a rollback gives the number back (no gaps).
   */
  async issue(tx: Prisma.TransactionClient, paymentId: string, issuedAt: Date) {
    const existing = await tx.invoice.findUnique({ where: { paymentId }, select: { id: true } });
    if (existing) return existing.id;
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: {
        subscription: true,
        business: {
          select: {
            id: true,
            name: true,
            gstin: true,
            address: true,
            pincode: true,
            state: { select: { code: true, name: true } },
            city: { select: { name: true } },
          },
        },
      },
    });
    const { business, subscription } = payment;
    const buyerGstin = subscription.buyerGstin ?? business.gstin;
    const buyerState =
      (buyerGstin ? GSTIN_STATE.exec(buyerGstin)?.[1] : undefined) ??
      GST_STATE_CODE[business.state.code] ??
      null;
    const isIntraState = buyerState !== null && buyerState === this.seller.stateCode;
    const breakup = splitInclusiveGst(Number(payment.amountPaise), isIntraState);

    const financialYear = financialYearOf(issuedAt);
    const [counter] = await tx.$queryRaw<{ last_value: number }[]>`
      INSERT INTO invoice_sequences (financial_year, last_value) VALUES (${financialYear}, 1)
      ON CONFLICT (financial_year) DO UPDATE SET last_value = invoice_sequences.last_value + 1
      RETURNING last_value`;
    if (!counter) throw new Error('invoice sequence returned no row');

    const place = [business.address, business.city.name, business.state.name, business.pincode]
      .filter(Boolean)
      .join(', ');
    const details: InvoiceDetails = {
      seller: {
        name: this.seller.name,
        gstin: this.seller.gstin,
        address: this.seller.address,
        stateCode: this.seller.stateCode,
      },
      buyer: { name: business.name, gstin: buyerGstin, address: place, stateCode: buyerState },
      sac: this.seller.sac,
      description: 'Supporters Premium, 1 year',
      periodStart: (subscription.currentPeriodStart ?? issuedAt).toISOString(),
      periodEnd: (subscription.currentPeriodEnd ?? issuedAt).toISOString(),
      breakup,
      paymentReference: payment.providerPaymentId,
      placeOfSupplyStateCode: buyerState,
    };
    const invoice = await tx.invoice.create({
      data: {
        paymentId,
        businessId: business.id,
        number: formatInvoiceNumber(financialYear, counter.last_value),
        financialYear,
        sequence: counter.last_value,
        issuedAt,
        details: details as unknown as Prisma.InputJsonObject,
        totalPaise: payment.amountPaise,
        taxablePaise: breakup.taxablePaise,
        taxPaise: breakup.cgstPaise + breakup.sgstPaise + breakup.igstPaise,
      },
    });
    // The worker renders the PDF after commit (`payments.invoice` is routed to the payments queue).
    await tx.outboxEvent.create({
      data: { type: 'payments.invoice', payload: { invoiceId: invoice.id } },
    });
    return invoice.id;
  }

  /** Renders and stores the PDF. Safe to run twice: it overwrites the same key. */
  async generatePdf(invoiceId: string): Promise<boolean> {
    if (!this.store) throw new Error('invoice store is not configured');
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return false;
    const key = `${INVOICE_PREFIX}${invoice.businessId}/${invoice.id}.pdf`;
    await this.store.put(
      key,
      renderInvoicePdf({
        number: invoice.number,
        issuedAt: invoice.issuedAt,
        totalPaise: Number(invoice.totalPaise),
        details: invoice.details as unknown as InvoiceDetails,
      }),
    );
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfKey: key, pdfGeneratedAt: new Date() },
    });
    return true;
  }

  async list(
    businessId: string,
    query: { cursor?: string | undefined; limit: number },
  ): Promise<Page<InvoiceDto>> {
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.invoice.findMany({
      ...page,
      where: { ...page.where, businessId },
    });
    const split = splitPage(rows, query.limit);
    return { data: split.rows.map(toDto), nextCursor: split.nextCursor };
  }

  /** Only the business owner reaches this (the route resolves the business from the session). */
  async get(businessId: string, id: string): Promise<InvoiceDetail> {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, businessId } });
    if (!invoice) throw notFound();
    const details = invoice.details as unknown as InvoiceDetails;
    let downloadUrl: string | null = null;
    if (invoice.pdfKey && this.store) {
      downloadUrl = await this.store.signedUrl(
        invoice.pdfKey,
        `${invoice.number.replaceAll('/', '-')}.pdf`,
        INVOICE_LINK_TTL_SEC,
      );
    } else if (!invoice.pdfKey) {
      this.log?.debug({ invoiceId: invoice.id }, 'invoice pdf not ready');
    }
    return {
      ...toDto(invoice),
      downloadUrl,
      taxBreakup: {
        ratePercent: details.breakup.ratePercent,
        cgst: money(details.breakup.cgstPaise),
        sgst: money(details.breakup.sgstPaise),
        igst: money(details.breakup.igstPaise),
      },
      buyerGstin: details.buyer.gstin,
    };
  }
}

const toDto = (row: {
  id: string;
  number: string;
  issuedAt: Date;
  totalPaise: bigint;
  taxablePaise: bigint;
  taxPaise: bigint;
  pdfKey: string | null;
}): InvoiceDto => ({
  id: row.id,
  number: row.number,
  issuedAt: row.issuedAt.toISOString(),
  total: money(row.totalPaise),
  taxable: money(row.taxablePaise),
  tax: money(row.taxPaise),
  isPdfReady: row.pdfKey !== null,
});
