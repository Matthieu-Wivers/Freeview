const BADGE_STYLES = {
    theory: {
        background: 'rgba(59, 130, 246, 0.18)',
        color: '#93c5fd',
        borderColor: 'rgba(59, 130, 246, 0.32)',
    },
    best: {
        background: 'rgba(6, 182, 212, 0.18)',
        color: '#67e8f9',
        borderColor: 'rgba(6, 182, 212, 0.35)',
    },
    excellent: {
        background: 'rgba(34, 197, 94, 0.18)',
        color: '#86efac',
        borderColor: 'rgba(34, 197, 94, 0.35)',
    },
    good: {
        background: 'rgba(132, 204, 22, 0.18)',
        color: '#bef264',
        borderColor: 'rgba(132, 204, 22, 0.35)',
    },
    inaccuracy: {
        background: 'rgba(250, 204, 21, 0.18)',
        color: '#fde047',
        borderColor: 'rgba(250, 204, 21, 0.32)',
    },
    miss: {
        background: 'rgba(251, 146, 60, 0.18)',
        color: '#fdba74',
        borderColor: 'rgba(251, 146, 60, 0.32)',
    },
    mistake: {
        background: 'rgba(244, 114, 182, 0.18)',
        color: '#f9a8d4',
        borderColor: 'rgba(244, 114, 182, 0.32)',
    },
    blunder: {
        background: 'rgba(239, 68, 68, 0.18)',
        color: '#fca5a5',
        borderColor: 'rgba(239, 68, 68, 0.32)',
    },
};

export function ReviewBadge({ category, label }) {
    return (
    <span 
        className={`review-badge review-badge--${category}`} 
        style={BADGE_STYLES[category]} 
        title={category}
    >
      {label}
    </span>);
}
