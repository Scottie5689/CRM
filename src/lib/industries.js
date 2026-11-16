// Groups companies by industry for the pie chart and the table filter.
export const NONE = '__none__';
export const OTHER = '__other__';
const MAX_COLORED = 4; // validated palette size; the rest fold into "Other"

export const industryKey = (company) => (company.industry ?? '').trim().toLowerCase() || NONE;

/** Returns slices: { key, label, count, color, keys } ordered largest first, then Other, then No industry. */
export function industrySlices(companies) {
  const groups = new Map();
  for (const c of companies) {
    const key = industryKey(c);
    const g = groups.get(key) ?? { key, label: key === NONE ? 'No industry' : c.industry.trim(), count: 0 };
    g.count++;
    groups.set(key, g);
  }
  const none = groups.get(NONE);
  groups.delete(NONE);
  const named = [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const slices = named.slice(0, MAX_COLORED).map((g, i) => ({ ...g, keys: [g.key], color: `var(--series-${i + 1})` }));
  const rest = named.slice(MAX_COLORED);
  if (rest.length) {
    slices.push({
      key: OTHER,
      label: `Other (${rest.length})`,
      count: rest.reduce((n, g) => n + g.count, 0),
      keys: rest.map((g) => g.key),
      color: 'var(--series-other)'
    });
  }
  if (none) slices.push({ ...none, keys: [NONE], color: 'url(#pie-hatch)', swatch: 'hatch' });
  return slices;
}
