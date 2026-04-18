export function formatDate(raw?: string): string {
  if (!raw) return 'Date inconnue';
  return raw.replace(/\./g, '-');
}

export function formatEval(score: number): string {
  if (!Number.isFinite(score)) return '0.0';
  return `${score > 0 ? '+' : ''}${score.toFixed(1)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function toPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function plyToLabel(ply: number): string {
  const moveNumber = Math.ceil(ply / 2);
  const suffix = ply % 2 === 1 ? '... blanc' : '... noir';
  return `${moveNumber} (${suffix})`;
}
