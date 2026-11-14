/** Money is integer paise (BIGINT in PostgreSQL), never a float (backend spec, Architecture). */
export type Paise = bigint;

export const toMoney = (paise: bigint | number) => ({
  // Amounts stay far below 2^53, so a JSON number is exact.
  amountPaise: Number(paise),
  currency: 'INR' as const,
});
