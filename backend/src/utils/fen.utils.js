import { Chess } from 'chess.js';

export function parseFen(fen) {
  if (typeof fen !== 'string') {
    return { ok: false, message: 'La FEN doit être une chaîne de caractères.' };
  }

  const normalizedFen = fen.trim().replace(/\s+/g, ' ');

  if (normalizedFen.length === 0 || normalizedFen.length > 120) {
    return { ok: false, message: 'La FEN est vide ou trop longue.' };
  }

  try {
    const chess = new Chess(normalizedFen);
    return {
      ok: true,
      fen: normalizedFen,
      turn: chess.turn(),
    };
  } catch {
    return { ok: false, message: 'FEN invalide.' };
  }
}
