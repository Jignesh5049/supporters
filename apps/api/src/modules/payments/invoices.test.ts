import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, referenceData } from '../../test/catalog';
import {
  type TestContext,
  createTestApp,
  prisma,
  registerMobile,
  resetState,
} from '../../test/helpers';
import {
  DAY_MS,
  type PremiumOwner,
  api,
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

const invoicesOf = (owner: PremiumOwner) =>
  api(ctx, 'GET', '/v1/me/business/invoices', { as: owner.session });

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

describe('invoice content', () => {
  it('splits CGST and SGST when buyer and supplier are in the same state', async () => {
    const owner = await premiumOwner(ctx, refs); // Mumbai, Maharashtra; the supplier is code 27
    await buyPremium(ctx, owner);
    const [invoice] = (await invoicesOf(owner)).json<{ data: { id: string }[] }>().data;
    const detail = (
      await api(ctx, 'GET', `/v1/me/business/invoices/${invoice?.id}`, { as: owner.session })
    ).json();
    expect(detail).toMatchObject({
      total: { amountPaise: 99_900, currency: 'INR' },
      taxable: { amountPaise: 84_661 },
      tax: { amountPaise: 15_239 },
      taxBreakup: {
        ratePercent: 18,
        cgst: { amountPaise: 7_619 },
        sgst: { amountPaise: 7_620 },
        igst: { amountPaise: 0 },
      },
    });
  });

  it('charges IGST across states, and prefers the buyer GSTIN given at checkout', async () => {
    const gujarat = await premiumOwner(ctx, refs, {
      cityId: (await prisma.city.findFirstOrThrow({ where: { state: { code: 'GJ' } } })).id,
    });
    await buyPremium(ctx, gujarat);
    const [first] = (await invoicesOf(gujarat)).json<{ data: { id: string }[] }>().data;
    const igst = (
      await api(ctx, 'GET', `/v1/me/business/invoices/${first?.id}`, { as: gujarat.session })
    ).json<{ taxBreakup: { igst: { amountPaise: number }; cgst: { amountPaise: number } } }>();
    expect(igst.taxBreakup).toMatchObject({
      igst: { amountPaise: 15_239 },
      cgst: { amountPaise: 0 },
    });

    // A Mumbai business that gives a Karnataka GSTIN is billed as inter-state, with that GSTIN.
    const mumbai = await premiumOwner(ctx, refs);
    const buyerGstin = gstinFor('29');
    await buyPremium(ctx, mumbai, { buyerGstin });
    const [second] = (await invoicesOf(mumbai)).json<{ data: { id: string }[] }>().data;
    const detail = (
      await api(ctx, 'GET', `/v1/me/business/invoices/${second?.id}`, { as: mumbai.session })
    ).json<{ buyerGstin: string; taxBreakup: { igst: { amountPaise: number } } }>();
    expect(detail).toMatchObject({ buyerGstin, taxBreakup: { igst: { amountPaise: 15_239 } } });
  });
});

describe('invoice access and PDF', () => {
  it('is for the owner only: guests 401, other owners 404, users without a business 403', async () => {
    const owner = await premiumOwner(ctx, refs);
    await buyPremium(ctx, owner);
    const [invoice] = (await invoicesOf(owner)).json<{ data: { id: string }[] }>().data;
    const url = `/v1/me/business/invoices/${invoice?.id}`;

    expect((await api(ctx, 'GET', '/v1/me/business/invoices')).statusCode).toBe(401);
    expect((await api(ctx, 'GET', url)).statusCode).toBe(401);

    const other = await premiumOwner(ctx, refs);
    expect((await api(ctx, 'GET', url, { as: other.session })).statusCode).toBe(404);
    expect((await invoicesOf(other)).json()).toEqual({ data: [], nextCursor: null });

    const stranger = await registerMobile(ctx);
    expect((await api(ctx, 'GET', url, { as: stranger })).statusCode).toBe(403);
    expect((await api(ctx, 'GET', url, { as: owner.session })).statusCode).toBe(200);
  });

  it('serves the PDF through a short-lived signed link under a private prefix', async () => {
    const owner = await premiumOwner(ctx, refs);
    await buyPremium(ctx, owner);
    const row = await prisma.invoice.findFirstOrThrow();
    const url = `/v1/me/business/invoices/${row.id}`;

    const before = (await api(ctx, 'GET', url, { as: owner.session })).json<{
      isPdfReady: boolean;
      downloadUrl: string | null;
    }>();
    expect(before).toMatchObject({ isPdfReady: false, downloadUrl: null });

    expect(await ctx.app.services.invoices.generatePdf(row.id)).toBe(true);
    const stored = await prisma.invoice.findUniqueOrThrow({ where: { id: row.id } });
    expect(stored.pdfKey).toBe(`invoices/${owner.businessId}/${row.id}.pdf`);
    expect(stored.pdfKey?.startsWith('public/')).toBe(false);

    const after = (await api(ctx, 'GET', url, { as: owner.session })).json<{
      isPdfReady: boolean;
      downloadUrl: string;
    }>();
    expect(after.isPdfReady).toBe(true);
    expect(new URL(after.downloadUrl).searchParams.get('X-Amz-Expires')).toBe('300');

    const file = await fetch(after.downloadUrl);
    expect(file.status).toBe(200);
    expect(file.headers.get('content-type')).toBe('application/pdf');
    const bytes = Buffer.from(await file.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.toString('latin1')).toContain(row.number.replaceAll('(', '\\('));

    // The bare key is not readable without the signature.
    const bare = await fetch(after.downloadUrl.split('?')[0] ?? '');
    expect(bare.status).toBe(403);
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
