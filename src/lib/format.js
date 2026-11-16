const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

export const money = (n) => currency.format(Number(n) || 0);

export const today = () => new Date().toLocaleDateString('en-CA');

/** Format a YYYY-MM-DD string without timezone drift. */
export function shortDate(s) {
  if (!s) return '';
  return new Date(s + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const isOverdue = (s) => !!s && s < today();
export const isToday = (s) => s === today();

export const matches = (q, ...fields) =>
  !q || fields.some((f) => String(f ?? '').toLowerCase().includes(q.toLowerCase()));
