/**
 * A tiny single-page PDF writer for the GST invoice: Helvetica text and rules, no dependencies.
 * Text is WinAnsi (Latin-1), so characters outside it print as "?" and the rupee sign is written as
 * "INR". Embedding a Unicode font (for names in Devanagari and other scripts) is a follow-up.
 */

export interface InvoiceDetails {
  seller: {
    name: string;
    gstin: string | null;
    address: string | null;
    stateCode: string | null;
  };
  buyer: {
    name: string;
    gstin: string | null;
    address: string | null;
    stateCode: string | null;
  };
  /** HSN/SAC printed on the line. A placeholder until the client's accountant confirms it. */
  sac: string;
  description: string;
  periodStart: string;
  periodEnd: string;
  breakup: {
    taxablePaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    ratePercent: number;
  };
  /** The provider payment reference, so a bank statement line can be matched to the invoice. */
  paymentReference: string;
  placeOfSupplyStateCode: string | null;
}

export interface InvoiceForPdf {
  number: string;
  issuedAt: Date;
  totalPaise: number;
  details: InvoiceDetails;
}

const PAGE = { width: 595, height: 842 };
const MARGIN = 48;

/** WinAnsi-safe, with the characters PDF strings treat specially escaped. */
export const pdfText = (value: string) =>
  Array.from(value.normalize('NFC'))
    .map((char) => {
      const code = char.codePointAt(0) ?? 63;
      if (code === 0x28 || code === 0x29 || code === 0x5c) return `\\${char}`;
      if (code < 0x20) return ' ';
      return code <= 0xff ? char : '?';
    })
    .join('');

export const formatPaise = (paise: number) =>
  `${Math.floor(paise / 100).toLocaleString('en-IN')}.${String(paise % 100).padStart(2, '0')}`;

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

class Page {
  private readonly ops: string[] = [];

  text(x: number, y: number, value: string, options: { size?: number; bold?: boolean } = {}) {
    const font = options.bold ? 'F2' : 'F1';
    this.ops.push(`BT /${font} ${options.size ?? 10} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET`);
  }

  rightText(
    xRight: number,
    y: number,
    value: string,
    options: { size?: number; bold?: boolean } = {},
  ) {
    // Helvetica averages about 0.5 em per character; enough to right-align figures.
    const width = value.length * (options.size ?? 10) * 0.5;
    this.text(xRight - width, y, value, options);
  }

  line(x1: number, y: number, x2: number) {
    this.ops.push(`0.5 w ${x1} ${y} m ${x2} ${y} l S`);
  }

  content() {
    return this.ops.join('\n');
  }
}

/** Wraps text on word boundaries at roughly `maxChars` per line. */
const wrap = (value: string, maxChars: number): string[] => {
  const lines: string[] = [];
  let current = '';
  for (const word of value.split(/\s+/).filter(Boolean)) {
    if (current && `${current} ${word}`.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
};

function layout(invoice: InvoiceForPdf): string {
  const { details } = invoice;
  const page = new Page();
  const right = PAGE.width - MARGIN;
  let y = PAGE.height - MARGIN;

  page.text(MARGIN, y, 'TAX INVOICE', { size: 20, bold: true });
  page.rightText(right, y, invoice.number, { size: 12, bold: true });
  y -= 18;
  page.rightText(right, y, `Date: ${formatDate(invoice.issuedAt)}`);
  y -= 14;
  page.line(MARGIN, y, right);
  y -= 22;

  const party = (title: string, x: number, who: InvoiceDetails['seller']) => {
    let cursor = y;
    page.text(x, cursor, title, { bold: true, size: 9 });
    cursor -= 14;
    page.text(x, cursor, who.name, { bold: true });
    for (const line of wrap(who.address ?? '', 40)) {
      cursor -= 13;
      page.text(x, cursor, line);
    }
    cursor -= 13;
    page.text(x, cursor, `GSTIN: ${who.gstin ?? 'not provided'}`);
    cursor -= 13;
    page.text(x, cursor, `State code: ${who.stateCode ?? '-'}`);
    return cursor;
  };
  const sellerEnd = party('SUPPLIER', MARGIN, details.seller);
  const buyerEnd = party('BILLED TO', MARGIN + 270, details.buyer);
  y = Math.min(sellerEnd, buyerEnd) - 14;
  page.text(MARGIN, y, `Place of supply (state code): ${details.placeOfSupplyStateCode ?? '-'}`);
  y -= 24;

  // Line items
  page.line(MARGIN, y + 14, right);
  page.text(MARGIN, y, 'Description', { bold: true, size: 9 });
  page.text(330, y, 'SAC', { bold: true, size: 9 });
  page.rightText(right, y, 'Taxable value (INR)', { bold: true, size: 9 });
  y -= 6;
  page.line(MARGIN, y, right);
  y -= 16;
  page.text(MARGIN, y, details.description);
  page.text(330, y, details.sac);
  page.rightText(right, y, formatPaise(details.breakup.taxablePaise));
  y -= 13;
  page.text(
    MARGIN,
    y,
    `Period: ${formatDate(details.periodStart)} to ${formatDate(details.periodEnd)}`,
    { size: 9 },
  );
  y -= 24;

  const { breakup } = details;
  const rate = breakup.ratePercent;
  const row = (label: string, paise: number, bold = false) => {
    page.text(330, y, label, { bold });
    page.rightText(right, y, formatPaise(paise), { bold });
    y -= 15;
  };
  row('Taxable value', breakup.taxablePaise);
  if (breakup.igstPaise > 0) {
    row(`IGST @ ${rate}%`, breakup.igstPaise);
  } else {
    row(`CGST @ ${rate / 2}%`, breakup.cgstPaise);
    row(`SGST @ ${rate / 2}%`, breakup.sgstPaise);
  }
  page.line(330, y + 10, right);
  y -= 4;
  row('Total (INR)', invoice.totalPaise, true);
  y -= 16;

  page.text(MARGIN, y, `Payment reference: ${details.paymentReference}`, { size: 9 });
  y -= 14;
  page.text(MARGIN, y, 'The price is inclusive of GST. This is a computer-generated invoice.', {
    size: 9,
  });
  return page.content();
}

/** Builds the PDF bytes. Offsets in the cross-reference table are byte offsets, so write as latin1. */
export function renderInvoicePdf(invoice: InvoiceForPdf): Buffer {
  const content = layout(invoice);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
