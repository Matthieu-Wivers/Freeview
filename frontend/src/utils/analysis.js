import { CATEGORY_ACCURACY, CATEGORY_COMMENTS, CATEGORY_LABELS, ENGINE_DEPTH, PIECE_VALUES, } from './constants';
import { createChessFromFen, toggleFenTurn } from './chess';
import { average, clamp } from './format';

const CENTER_SQUARES = new Set(['d4', 'e4', 'd5', 'e5']);
const EXTENDED_CENTER = new Set([
    'c3', 'd3', 'e3', 'f3',
    'c4', 'd4', 'e4', 'f4',
    'c5', 'd5', 'e5', 'f5',
    'c6', 'd6', 'e6', 'f6',
]);

function squareName(row, col) {
    return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function pieceSquareBonus(type, color, row, col) {
    const rankFromWhite = color === 'w' ? 8 - row : row + 1;
    const fileDistance = Math.abs(3.5 - col);
    const centrality = (3.5 - fileDistance) * 0.03;

    switch (type) {
        case 'p':
            return rankFromWhite * 0.04 + centrality;
        case 'n':
            return centrality * 2 + (rankFromWhite >= 3 && rankFromWhite <= 6 ? 0.08 : -0.05);
        case 'b':
            return centrality * 1.6 + (rankFromWhite >= 3 ? 0.06 : 0);
        case 'r':
            return rankFromWhite >= 6 ? 0.12 : centrality * 0.5;
        case 'q':
            return centrality * 0.7;
        case 'k':
            return rankFromWhite >= 7 ? 0.18 : -0.12;
        default:
            return 0;
    }
}

function countMobility(fen) {
    const current = createChessFromFen(fen);
    const currentTurnMoves = current.moves().length;
    const otherTurn = createChessFromFen(toggleFenTurn(current.fen()));
    const otherTurnMoves = otherTurn.moves().length;

    return current.turn() === 'w'
        ? { white: currentTurnMoves, black: otherTurnMoves }
        : { white: otherTurnMoves, black: currentTurnMoves };
}

export function evaluatePositionWhite(fen) {
    const chess = createChessFromFen(fen);
    const board = chess.board();
    let score = 0;
    let whiteBishops = 0;
    let blackBishops = 0;

    for (let row = 0; row < board.length; row += 1) {
        for (let col = 0; col < board[row].length; col += 1) {
            const piece = board[row][col];
            if (!piece) continue;

            const sign = piece.color === 'w' ? 1 : -1;
            const base = PIECE_VALUES[piece.type] ?? 0;
            const square = squareName(row, col);
            let bonus = pieceSquareBonus(piece.type, piece.color, row, col);

            if (CENTER_SQUARES.has(square)) bonus += 0.1;
            else if (EXTENDED_CENTER.has(square)) bonus += 0.04;

            if (piece.type === 'b') {
                if (piece.color === 'w')
                    whiteBishops += 1;
                else
                    blackBishops += 1;
            }

            score += sign * (base + bonus);
        }
    }

    if (whiteBishops >= 2) score += 0.22;
    if (blackBishops >= 2) score -= 0.22;

    const currentFen = chess.fen();
    const [placement] = currentFen.split(' ');

    if (placement.includes('K')) {
        if (placement.includes('K') && (currentFen.includes(' w ') || currentFen.includes(' b '))) {
            const whiteCastled = placement.includes('R4RK1') || placement.includes('2KR3R') || placement.includes('R4K1R');
            const blackCastled = placement.includes('r4rk1') || placement.includes('2kr3r') || placement.includes('r4k1r');
            if (whiteCastled)
                score += 0.3;
            if (blackCastled)
                score -= 0.3;
        }
    }

    const mobility = countMobility(chess.fen());
    score += (mobility.white - mobility.black) * 0.02;

    return Number(score.toFixed(2));
}

function terminalScore(chess) {
    if (chess.isCheckmate()) {
        return chess.turn() === 'w' ? -999 : 999;
    }

    if (chess.isDraw() || chess.isStalemate() || chess.isInsufficientMaterial()) {
        return 0;
    }

    return evaluatePositionWhite(chess.fen());
}

function minimaxWhite(fen, depth, alpha, beta, cache) {
    const key = `${fen}|${depth}`;
    const cached = cache.get(key);

    if (cached !== undefined) return cached;
    const chess = createChessFromFen(fen);

    if (depth === 0 || chess.isGameOver()) {
        const finalScore = terminalScore(chess);
        cache.set(key, finalScore);
        return finalScore;
    }

    const legalMoves = chess.moves({ verbose: true });
    let bestScore = chess.turn() === 'w' ? -Infinity : Infinity;

    for (const move of legalMoves) {
        const next = createChessFromFen(fen);
        next.move({ from: move.from, to: move.to, promotion: move.promotion });
        const score = minimaxWhite(next.fen(), depth - 1, alpha, beta, cache);

        if (chess.turn() === 'w') {
            bestScore = Math.max(bestScore, score);
            alpha = Math.max(alpha, score);
        } else {
            bestScore = Math.min(bestScore, score);
            beta = Math.min(beta, score);
        }

        if (beta <= alpha) break;
    }

    cache.set(key, bestScore);
    return bestScore;
}

export function scorePositionMoves(fen, depth = ENGINE_DEPTH) {
    const chess = createChessFromFen(fen);
    const legalMoves = chess.moves({ verbose: true });
    const cache = new Map();

    const candidates = legalMoves.map((move) => {
        const next = createChessFromFen(fen);
        next.move({ from: move.from, to: move.to, promotion: move.promotion });
        return {
            san: move.san,
            uci: `${move.from}${move.to}${move.promotion ?? ''}`,
            from: move.from,
            to: move.to,
            scoreWhite: minimaxWhite(next.fen(), Math.max(depth - 1, 0), -Infinity, Infinity, cache),
        };
    });

    const turn = chess.turn();
    return candidates.sort((a, b) => (turn === 'w' ? b.scoreWhite - a.scoreWhite : a.scoreWhite - b.scoreWhite));
}

export function classifyMove(loss, ply) {
    if (ply <= 10 && loss <= 0.12)
        return 'theory';
    if (loss <= 0.08)
        return 'best';
    if (loss <= 0.28)
        return 'excellent';
    if (loss <= 0.65)
        return 'good';
    if (loss <= 1.2)
        return 'inaccuracy';
    if (loss <= 2.2)
        return 'mistake';
    return 'blunder';
}

function buildMoveReview(ply, fenBefore, fenAfter, playedSan, playedUci) {
    const candidates = scorePositionMoves(fenBefore);
    const best = candidates[0];
    const actual = candidates.find((candidate) => candidate.uci === playedUci) ?? best;
    const turn = createChessFromFen(fenBefore).turn();
    const loss = turn === 'w' ? best.scoreWhite - actual.scoreWhite : actual.scoreWhite - best.scoreWhite;
    const category = classifyMove(loss, ply);

    return {
        ply,
        playedSan,
        playedUci,
        bestSan: best.san,
        bestUci: best.uci,
        scoreBefore: evaluatePositionWhite(fenBefore),
        scoreAfter: evaluatePositionWhite(fenAfter),
        bestScoreWhite: best.scoreWhite,
        actualScoreWhite: actual.scoreWhite,
        loss: Number(Math.max(loss, 0).toFixed(2)),
        category,
        label: CATEGORY_LABELS[category],
        comment: CATEGORY_COMMENTS[category],
        accuracy: CATEGORY_ACCURACY[category],
        suggestions: candidates.slice(0, 3),
    };
}

export function analyzeGame(game) {
    const moveReviews = game.moves.map((move) => buildMoveReview(move.ply, move.fenBefore, move.fenAfter, move.san, move.uci));
    const whiteAccuracies = moveReviews.filter((_, index) => index % 2 === 0).map((review) => review.accuracy);
    const blackAccuracies = moveReviews.filter((_, index) => index % 2 === 1).map((review) => review.accuracy);
    const whiteLosses = moveReviews.filter((_, index) => index % 2 === 0).map((review) => review.loss);
    const blackLosses = moveReviews.filter((_, index) => index % 2 === 1).map((review) => review.loss);

    return {
        moveReviews,
        accuracyWhite: average(whiteAccuracies),
        accuracyBlack: average(blackAccuracies),
        averageLossWhite: average(whiteLosses),
        averageLossBlack: average(blackLosses),
        evaluations: [0, ...game.moves.map((move) => evaluatePositionWhite(move.fenAfter))],
        finalEvaluation: game.moves.length ? evaluatePositionWhite(game.moves[game.moves.length - 1].fenAfter) : 0,
    };
}

export function analyzeSandboxMove(fen, uci, san) {
    const candidates = scorePositionMoves(fen);
    const best = candidates[0];
    const actual = candidates.find((candidate) => candidate.uci === uci) ?? best;
    const turn = createChessFromFen(fen).turn();
    const loss = turn === 'w' ? best.scoreWhite - actual.scoreWhite : actual.scoreWhite - best.scoreWhite;
    const category = classifyMove(loss, 99);
    
    return {
        san,
        uci,
        bestSan: best.san,
        bestUci: best.uci,
        loss: Number(Math.max(loss, 0).toFixed(2)),
        category,
        comment: CATEGORY_COMMENTS[category],
        accuracy: clamp(CATEGORY_ACCURACY[category], 0, 100),
    };
}
