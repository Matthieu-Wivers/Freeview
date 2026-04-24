export const START_FEN = 'start';
export const ENGINE_DEPTH = 2;

export const PIECE_VALUES = {
    p: 1,
    n: 3.15,
    b: 3.3,
    r: 5.1,
    q: 9.4,
    k: 0,
};

export const CATEGORY_ORDER = [
    'theory',
    'best',
    'excellent',
    'good',
    'inaccuracy',
    'miss',
    'mistake',
    'blunder',
];

export const CATEGORY_LABELS = {
    theory: '📖',
    best: '!!',
    excellent: '!',
    good: '★',
    inaccuracy: '≈',
    miss: '?!',
    mistake: '?',
    blunder: '??',
};

export const CATEGORY_COMMENTS = {
    theory: 'Still in theory. This is a known, on-book continuation.',
    best: 'Brilliant-like move: a rare best move with a real sacrifice or uniquely strong idea.',
    excellent: 'Excellent move. Best or near-best without the special conditions for a brilliant move.',
    good: 'Healthy and playable move, even if a slightly stronger option existed.',
    inaccuracy: 'The idea works, but you leave a little advantage to the opponent.',
    miss: 'You missed a strong tactical or winning opportunity, but the move was not a total collapse.',
    mistake: 'A clear mistake that worsens the position.',
    blunder: 'A very serious error that throws away major value or the game.',
};

export const CATEGORY_ACCURACY = {
    theory: 100,
    best: 100,
    excellent: 92,
    good: 80,
    inaccuracy: 62,
    miss: 50,
    mistake: 35,
    blunder: 10,
};
