export function formatDate(raw) {
    if (!raw)return 'Date inconnue';
    return raw.replace(/\./g, '-');
}

export function formatEval(score) {
    if (!Number.isFinite(score))return '0.0';
    return `${score > 0 ? '+' : ''}${score.toFixed(1)}`;
}

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function toPercent(value) {
    return `${Math.round(value)}%`;
}

export function plyToLabel(ply) {
    const moveNumber = Math.ceil(ply / 2);
    const suffix = ply % 2 === 1 ? '... blanc' : '... noir';
    return `${moveNumber} (${suffix})`;
}
