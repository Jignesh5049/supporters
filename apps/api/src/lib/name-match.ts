/**
 * Fuzzy comparison of the profile name with the payout account's holder name (backend spec,
 * Payments and money). It is a review aid, not a gate: a mismatch flags the withdrawal for an
 * admin, who decides.
 */

const NOISE = new Set([
  'mr',
  'mrs',
  'ms',
  'miss',
  'shri',
  'shree',
  'smt',
  'sri',
  'dr',
  'kumari',
  'late',
  'm/s',
  'ms.',
  'pvt',
  'ltd',
  'private',
  'limited',
  'llp',
  'co',
  'company',
  'and',
  'sons',
  'son',
]);

const tokensOf = (name: string): string[] =>
  name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0 && !NOISE.has(token));

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j] ?? 0;
      row[j] = Math.min(
        above + 1,
        (row[j - 1] ?? 0) + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[b.length] ?? 0;
}

/** 'exact', 'near' (a typo), 'initial' ("K" for "Kumar") or null. */
function tokenMatch(a: string, b: string): 'exact' | 'near' | 'initial' | null {
  if (a === b) return 'exact';
  if (a.length === 1 && b.startsWith(a)) return 'initial';
  if (b.length === 1 && a.startsWith(b)) return 'initial';
  const allowed = Math.min(a.length, b.length) >= 8 ? 2 : Math.min(a.length, b.length) >= 5 ? 1 : 0;
  return allowed > 0 && editDistance(a, b) <= allowed ? 'near' : null;
}

/**
 * True when every word of the shorter name appears in the longer one (word order, case, titles,
 * company suffixes and single typos don't matter, and an initial stands for a word), and at least
 * one word matches in full. "Ravi K" matches "RAVI KUMAR SHARMA"; "Ravi Kumar" does not match
 * "Suresh Patel".
 */
export function isNameMatch(profileName: string, accountName: string): boolean {
  const a = tokensOf(profileName);
  const b = tokensOf(accountName);
  if (a.length === 0 || b.length === 0) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  const free = [...longer];
  let isFullWordMatched = false;
  for (const token of shorter) {
    const index = free.findIndex((candidate) => tokenMatch(token, candidate) !== null);
    if (index < 0) return false;
    const kind = tokenMatch(token, free[index] ?? '');
    if (kind === 'exact' || kind === 'near') isFullWordMatched = true;
    free.splice(index, 1);
  }
  return isFullWordMatched;
}
