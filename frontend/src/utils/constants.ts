import type { ReviewCategory } from '../types/chess';

export const START_FEN = 'start';
export const ENGINE_DEPTH = 2;

export const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3.15,
  b: 3.3,
  r: 5.1,
  q: 9.4,
  k: 0,
};

export const CATEGORY_ORDER: ReviewCategory[] = [
  'theory',
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
];

export const CATEGORY_LABELS: Record<ReviewCategory, string> = {
  theory: '📖',
  best: '!!',
  excellent: '!',
  good: '★',
  inaccuracy: '≈',
  mistake: '?',
  blunder: '??',
};

export const CATEGORY_COMMENTS: Record<ReviewCategory, string> = {
  theory: 'Consistent and natural start. Nothing to report here.',
  best: 'Consistent and natural start. Nothing to report here.',
  excellent: 'Very good choice, almost at the level of the best shot.',
  good: 'Healthy and playable move, even if a slightly stronger option existed.',
  inaccuracy: 'The idea works, but you leave a little advantage to the opponent.',
  mistake: 'The move clearly degrades the position and is worth revisiting.',
  blunder: 'The move leaks way too much value in the position.',
};

export const CATEGORY_ACCURACY: Record<ReviewCategory, number> = {
  theory: 100,
  best: 100,
  excellent: 92,
  good: 80,
  inaccuracy: 62,
  mistake: 35,
  blunder: 10,
};
