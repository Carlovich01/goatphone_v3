export function formatArs(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

export function scoreColor(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 55) return '#84cc16';
  if (score >= 40) return '#eab308';
  return '#f97316';
}

export function specValueLabel(value: unknown, unit?: string, decimals?: number): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') {
    const d = decimals ?? 2;
    const factor = Math.pow(10, d);
    const rounded = Math.round(value * factor) / factor;
    return unit ? `${rounded} ${unit}` : String(rounded);
  }
  return String(value);
}
