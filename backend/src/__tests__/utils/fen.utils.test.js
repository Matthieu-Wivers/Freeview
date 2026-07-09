import { describe, expect, it } from 'vitest';

import { parseFen } from '../../utils/fen.utils.js';

describe('fen.utils', () => {
  it('normalizes and validates a legal FEN', () => {
    expect(parseFen('  rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR   w   KQkq - 0 1  ')).toEqual({
      ok: true,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: 'w',
    });
  });

  it('rejects non-string values', () => {
    expect(parseFen(null)).toEqual({
      ok: false,
      message: 'La FEN doit être une chaîne de caractères.',
    });
  });

  it('rejects empty and too long values', () => {
    expect(parseFen('   ')).toEqual({
      ok: false,
      message: 'La FEN est vide ou trop longue.',
    });

    expect(parseFen('x'.repeat(121))).toEqual({
      ok: false,
      message: 'La FEN est vide ou trop longue.',
    });
  });

  it('rejects invalid chess positions', () => {
    expect(parseFen('not a valid fen')).toEqual({
      ok: false,
      message: 'FEN invalide.',
    });
  });
});
