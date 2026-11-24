import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, referenceData } from '../../test/catalog';
import { type TestContext, createTestApp, prisma, resetState } from '../../test/helpers';
import {
  DAY_MS,
  buyPremium,
  charge,
  deliver,
  gstinFor,
  nextPaymentId,
  premiumOwner,
  startCheckout,
  webhookSecret,
} from '../../test/payments';
import { chargedEvent } from './fake-razorpay';
import { financialYearOf } from './gst';
import { renderInvoicePdf } from './invoice.pdf';

let ctx: TestContext;
let refs: ReferenceData;

beforeAll(async () => {
  ctx = await createTestApp();
  refs = await referenceData();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(resetState);

describe('invoice numbers', () => {
  it('issues one invoice per payment, numbered in sequence per financial year', async () => {
    const owner = await premiumOwner(ctx, refs);
    const { providerSubscriptionId } = await buyPremium(ctx, owner);
    await charge(ctx, providerSubscriptionId);
    const fy = financialYearOf(new Date());
    const rows = await prisma.invoice.findMany({ orderBy: { sequence: 'asc' } });
    expect(rows.map((row) => row.number)).toEqual([`SUP/${fy}/000001`, `SUP/${fy}/000002`]);
    expect(new Set(rows.map((row) => row.paymentId)).size).toBe(2);
  });

  it('stays unique and gapless when many payments are applied at the same moment', async () => {
    const owners = await Promise.all(Array.from({ length: 10 }, () => premiumOwner(ctx, refs)));
    const subs = await Promise.all(owners.map((owner) => startCheckout(ctx, owner)));
    // Store 10 charge deliveries, then apply them all in parallel, as ten workers would.
    for (const sub of subs) {
      const delivery = chargedEvent(webhookSecret(ctx), {
        providerSubscriptionId: sub.checkout.providerSubscriptionId,
        providerPaymentId: nextPaymentId(),
        amountPaise: 99_900,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 365 * DAY_MS),
      });
      expect((await deliver(ctx, delivery)).statusCode).toBe(200);
    }
    const events = await prisma.webhookEvent.findMany({ select: { id: true } });
    const results = await Promise.all(
      events.map((event) => ctx.app.services.payments.processor.process(event.id)),
    );
    expect(results.every((result) => result === 'processed')).toBe(true);

    const rows = await prisma.invoice.findMany({ orderBy: { sequence: 'asc' } });
    expect(rows.map((row) => row.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(rows.map((row) => row.number)).size).toBe(10);
  });

  it('gives a number back when the payment it belonged to is rolled back (no gaps)', async () => {
    const owner = await premiumOwner(ctx, refs);
    const { subscriptionId } = await startCheckout(ctx, owner);
    const payment = await prisma.payment.create({
      data: {
        subscriptionId,
        businessId: owner.businessId,
        providerPaymentId: nextPaymentId(),
        status: 'captured',
        amountPaise: 99_900n,
        capturedAt: new Date(),
      },
    });
    const { invoices } = ctx.app.services;
    await expect(
      prisma.$transaction(async (tx) => {
        await invoices.issue(tx, payment.id, new Date());
        throw new Error('the payment transaction failed after numbering');
      }),
    ).rejects.toThrow('after numbering');
    await prisma.$transaction((tx) => invoices.issue(tx, payment.id, new Date()));
    expect((await prisma.invoice.findFirstOrThrow()).sequence).toBe(1);
  });

  it('restarts the sequence in a new financial year', async () => {
    const owner = await premiumOwner(ctx, refs);
    const { subscriptionId } = await startCheckout(ctx, owner);
    const issue = async (when: string) => {
      const payment = await prisma.payment.create({
        data: {
          subscriptionId,
          businessId: owner.businessId,
          providerPaymentId: nextPaymentId(),
          status: 'captured',
          amountPaise: 99_900n,
          capturedAt: new Date(when),
        },
      });
      await prisma.$transaction((tx) =>
        ctx.app.services.invoices.issue(tx, payment.id, new Date(when)),
      );
    };
    await issue('2027-03-31T10:00:00+05:30');
    await issue('2027-03-31T12:00:00+05:30');
    await issue('2027-04-01T10:00:00+05:30');
    const numbers = (await prisma.invoice.findMany({ orderBy: { number: 'asc' } })).map(
      (i) => i.number,
    );
    expect(numbers).toEqual(['SUP/2026-27/000001', 'SUP/2026-27/000002', 'SUP/2027-28/000001']);
  });
});

describe('invoice PDF', () => {
  it('stores the PDF under a private prefix and links it with a short-lived signature', async () => {
    const owner = await premiumOwner(ctx, refs);
    await buyPremium(ctx, owner);
    const row = await prisma.invoice.findFirstOrThrow();
    const { invoices } = ctx.app.services;

    const before = await invoices.get(owner.businessId, row.id);
    expect(before).toMatchObject({ isPdfReady: false, downloadUrl: null });

    expect(await invoices.generatePdf(row.id)).toBe(true);
    const stored = await prisma.invoice.findUniqueOrThrow({ where: { id: row.id } });
    expect(stored.pdfKey).toBe(`invoices/${owner.businessId}/${row.id}.pdf`);

    const after = await invoices.get(owner.businessId, row.id);
    expect(after.isPdfReady).toBe(true);
    const link = new URL(after.downloadUrl ?? '');
    expect(link.searchParams.get('X-Amz-Expires')).toBe('300');
    const file = await fetch(link);
    expect(file.status).toBe(200);
    expect(file.headers.get('content-type')).toBe('application/pdf');
    const bytes = Buffer.from(await file.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.toString('latin1')).toContain(row.number);
    // The bare key is not readable without the signature.
    expect((await fetch(`${link.origin}${link.pathname}`)).status).toBe(403);
  });

  it('is only readable through the business that owns it', async () => {
    const owner = await premiumOwner(ctx, refs);
    const other = await premiumOwner(ctx, refs);
    await buyPremium(ctx, owner);
    const row = await prisma.invoice.findFirstOrThrow();
    await expect(ctx.app.services.invoices.get(other.businessId, row.id)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('writes a well-formed PDF with the GSTINs, SAC and tax lines', () => {
    const pdf = renderInvoicePdf({
      number: 'SUP/2026-27/000123',
      issuedAt: new Date('2026-11-14T10:00:00Z'),
      totalPaise: 99_900,
      details: {
        seller: {
          name: 'Supporters (Pvt) Ltd',
          gstin: '27AAPFU0939F1ZV',
          address: '1 Test Street',
          stateCode: '27',
        },
        buyer: { name: 'Asha Traders', gstin: gstinFor('27'), address: 'Mumbai', stateCode: '27' },
        sac: '998439',
        description: 'Supporters Premium, 1 year',
        periodStart: '2026-11-14T10:00:00.000Z',
        periodEnd: '2027-11-14T10:00:00.000Z',
        breakup: {
          taxablePaise: 84_661,
          cgstPaise: 7_619,
          sgstPaise: 7_620,
          igstPaise: 0,
          ratePercent: 18,
        },
        paymentReference: 'pay_x',
        placeOfSupplyStateCode: '27',
      },
    });
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('SUP/2026-27/000123');
    expect(text).toContain('27AAPFU0939F1ZV');
    expect(text).toContain('998439');
    expect(text).toContain('CGST @ 9%');
    expect(text).toContain('Supporters \\(Pvt\\) Ltd');
    // The cross-reference offsets point at the objects.
    const xref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(xref, xref + 4)).toBe('xref');
    expect(text).toContain('999.00');
  });
});
