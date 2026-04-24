import { Chess } from 'chess.js';

function clearEnPassantSquare(fen) {
    const parts = fen.trim().split(/\s+/);

    if (parts.length >= 4) {
        parts[3] = '-';
    }

    return parts.join(' ');
}

export function createChessFromFen(fen) {
    if (fen === 'start') return new Chess();

    try {
        return new Chess(fen);
    }

    catch (error) {
        const message = error instanceof Error ? error.message : '';

        if (message.includes('illegal en-passant square')) {
            return new Chess(clearEnPassantSquare(fen));
        }

        throw error;
    }
}

export function toggleFenTurn(fen) {
    const parts = fen.trim().split(/\s+/);
    parts[1] = parts[1] === 'w' ? 'b' : 'w';

    if (parts.length >= 4) {
        parts[3] = '-';
    }

    return parts.join(' ');
}
export function getFenAtPly(game, ply) {
    if (ply <= 0) return game.startFen;
    const clamped = Math.min(ply, game.moves.length);

    return game.moves[clamped - 1]?.fenAfter ?? game.startFen;
}
export function getMoveAtPly(game, ply) {
    return game.moves[ply - 1] ?? null;
}
export function getLastMoveSquares(game, ply) {
    const move = getMoveAtPly(game, ply);
    if (!move) return null;

    return {
        from: move.from,
        to: move.to,
    };
}
