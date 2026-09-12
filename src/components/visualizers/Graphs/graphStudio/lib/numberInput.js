export const normalizeNumberInput = (
  raw,
  { min = -Infinity, max = Infinity, step = 'any' } = {}
) => {
  if (String(raw ?? '').trim() === '') return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  const low = Number(min),
    high = Number(max);
  const bounded = Math.max(low, Math.min(high, parsed));
  const increment = Number(step);
  if (!Number.isFinite(increment) || increment <= 0) return bounded;
  const anchor = Number.isFinite(low) ? low : 0;
  const stepped =
    anchor + Math.round((bounded - anchor) / increment) * increment;
  const decimals = Math.min(
    12,
    Math.max(0, Math.ceil(-Math.log10(increment)) + 2)
  );
  return Number(Math.max(low, Math.min(high, stepped)).toFixed(decimals));
};
