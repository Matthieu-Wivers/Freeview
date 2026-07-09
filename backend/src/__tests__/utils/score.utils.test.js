import { describe, expect, it } from 'vitest';

import { extractMultiPv, extractPvMove, scoreWhiteFromInfoLine } from '../../utils/score.utils.js';

describe('score.utils', () => {
  it('extracts centipawn score from Stockfish info lines relative to white', () => {
    expect(scoreWhiteFromInfoLine('info depth 12 score cp 42 nodes 10 pv e2e4 e7e5', 'w')).toBe(0.42);
    expect(scoreWhiteFromInfoLine('info depth 12 score cp 42 nodes 10 pv e2e4 e7e5', 'b')).toBe(-0.42);
  });

  it('extracts mate score from Stockfish info lines relative to white', () => {
    expect(scoreWhiteFromInfoLine('info depth 12 score mate 3 pv h5f7', 'w')).toBe(997);
    expect(scoreWhiteFromInfoLine('info depth 12 score mate -2 pv h5f7', 'w')).toBe(-998);
    expect(scoreWhiteFromInfoLine('info depth 12 score mate 3 pv h5f7', 'b')).toBe(-997);
  });

  it('returns null when no score exists', () => {
    expect(scoreWhiteFromInfoLine('info depth 12 nodes 10 pv e2e4', 'w')).toBeNull();
  });

  it('extracts PV move and MultiPV index safely', () => {
    expect(extractPvMove('info depth 12 multipv 3 score cp 10 pv e7e8q a7a8q')).toBe('e7e8q');
    expect(extractPvMove('info depth 12 score cp 10')).toBeNull();
    expect(extractMultiPv('info depth 12 multipv 4 score cp 10 pv e2e4')).toBe(4);
    expect(extractMultiPv('info depth 12 score cp 10 pv e2e4')).toBe(1);
  });
});
