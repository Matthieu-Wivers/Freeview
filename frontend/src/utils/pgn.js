import { Chess } from 'chess.js';
import { normalizeSanForDisplay } from './notation';
const TAG_REGEX = /^\[(\w+)\s+"(.*)"\]$/gm;

export function normalizePgn(rawPgn) {
    const withoutBom = rawPgn.replace(/^\uFEFF/, '');
    const normalizedLines = withoutBom.replace(/\r\n?/g, '\n').trim();
    const lines = normalizedLines.split('\n');
    const headerLines = [];
    const moveLines = [];
    let inHeaders = true;

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
            if (inHeaders && headerLines.length > 0) {
                inHeaders = false;
            }
            continue;
        }

        if (inHeaders && trimmed.startsWith('[') && trimmed.endsWith(']')) {
            headerLines.push(trimmed);
            continue;
        }

        inHeaders = false;
        moveLines.push(trimmed);
    }

    const headerBlock = headerLines.join('\n');
    const movesBlock = moveLines.join(' ').replace(/\s+/g, ' ').trim();

    if (headerBlock && movesBlock) {
        return `${headerBlock}\n\n${movesBlock}`;
    }

    if (headerBlock) {
        return headerBlock;
    }

    return movesBlock;
}

export function parseHeaders(pgn) {
    const headers = {};

    for (const match of pgn.matchAll(TAG_REGEX)) {
        headers[match[1]] = match[2];
    }

    return headers;
}

export function parsePgn(rawPgn) {
    const normalizedPgn = normalizePgn(rawPgn);
    const headers = parseHeaders(normalizedPgn);
    const startFen = headers.SetUp === '1' && headers.FEN ? headers.FEN : undefined;
    const chess = new Chess(startFen);

    try {
        chess.loadPgn(normalizedPgn);
    }

    catch (error) {
        const message = error instanceof Error ? error.message : 'Format PGN invalide';
        throw new Error(`PGN invalide. ${message}`);
    }

    const history = chess.history({ verbose: true });
    const replay = new Chess(startFen);
    const moves = history.map((entry, index) => {
        const fenBefore = replay.fen();
        const applied = replay.move({
            from: entry.from,
            to: entry.to,
            promotion: entry.promotion,
        });

        if (!applied) {
            throw new Error(`Impossible de rejouer le coup ${entry.san}.`);
        }

        return {
            ply: index + 1,
            moveNumber: Math.floor(index / 2) + 1,
            color: entry.color,
            san: normalizeSanForDisplay(entry.san),
            from: entry.from,
            to: entry.to,
            uci: `${entry.from}${entry.to}${entry.promotion ?? ''}`,
            piece: entry.piece,
            captured: entry.captured,
            promotion: entry.promotion,
            fenBefore,
            fenAfter: replay.fen(),
        };
    });
    
    return {
        headers,
        moves,
        startFen: startFen ?? 'start',
    };
}
