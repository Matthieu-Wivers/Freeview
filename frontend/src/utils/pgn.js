import { Chess } from 'chess.js';
import { normalizeSanForDisplay } from './notation';

const TAG_REGEX = /^\[(\w+)\s+"(.*)"\]$/gm;

export function normalizePgn(rawPgn = '') {
    const withoutBom = String(rawPgn).replace(/^\uFEFF/, '');
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

export function parseHeaders(pgn = '') {
    const headers = {};
    const normalizedPgn = String(pgn);
    const regex = new RegExp(TAG_REGEX);

    for (const match of normalizedPgn.matchAll(regex)) {
        headers[match[1]] = match[2];
    }

    return headers;
}

export function parsePgn(rawPgn = '') {
    const normalizedPgn = normalizePgn(rawPgn);
    const headers = parseHeaders(normalizedPgn);
    const startFen = headers.SetUp === '1' && headers.FEN ? headers.FEN : undefined;
    const chess = new Chess(startFen);

    try {
        chess.loadPgn(normalizedPgn);
    } catch (error) {
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

        const san = normalizeSanForDisplay
            ? normalizeSanForDisplay(entry.san)
            : entry.san;

        return {
            ply: index + 1,
            moveNumber: Math.floor(index / 2) + 1,
            color: entry.color,
            san,
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
        normalizedPgn,
    };
}

export function summarizePgn(rawPgn = '') {
    const normalizedPgn = normalizePgn(rawPgn);
    const headers = parseHeaders(normalizedPgn);

    try {
        const parsed = parsePgn(normalizedPgn);
        const lastMove = parsed.moves.at(-1) ?? null;

        return {
            isValid: true,
            error: null,

            title: headers.Event || 'Partie sans titre',
            event: headers.Event || 'Partie sans titre',
            site: headers.Site || '',
            date: headers.Date || '',
            round: headers.Round || '',
            white: headers.White || 'Blancs',
            black: headers.Black || 'Noirs',
            result: headers.Result || '*',
            eco: headers.ECO || '',
            opening: headers.Opening || '',

            moveCount: Math.ceil(parsed.moves.length / 2),
            movesCount: parsed.moves.length,
            plyCount: parsed.moves.length,
            plies: parsed.moves.length,

            lastMove: lastMove?.san ?? null,
            lastFen: lastMove?.fenAfter ?? null,

            headers,
            moves: parsed.moves,
            startFen: parsed.startFen,
            normalizedPgn,
        };
    } catch (error) {
        return {
            isValid: false,
            error: error instanceof Error ? error.message : 'PGN invalide',

            title: headers.Event || 'Partie invalide',
            event: headers.Event || 'Partie invalide',
            site: headers.Site || '',
            date: headers.Date || '',
            round: headers.Round || '',
            white: headers.White || 'Blancs',
            black: headers.Black || 'Noirs',
            result: headers.Result || '*',
            eco: headers.ECO || '',
            opening: headers.Opening || '',

            moveCount: 0,
            movesCount: 0,
            plyCount: 0,
            plies: 0,

            lastMove: null,
            lastFen: null,

            headers,
            moves: [],
            startFen: headers.SetUp === '1' && headers.FEN ? headers.FEN : 'start',
            normalizedPgn,
        };
    }
}

export function formatDate(dateValue) {
    if (!dateValue) {
        return 'Date inconnue';
    }

    const value = String(dateValue).trim();

    if (!value || value === '????.??.??') {
        return 'Date inconnue';
    }

    const pgnDateMatch = value.match(/^(\d{4}|\?{4})\.(\d{2}|\?{2})\.(\d{2}|\?{2})$/);

    if (pgnDateMatch) {
        const [, year, month, day] = pgnDateMatch;

        if (year === '????') {
            return 'Date inconnue';
        }

        if (month === '??') {
            return year;
        }

        if (day === '??') {
            return `${month}/${year}`;
        }

        return `${day}/${month}/${year}`;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function formatResult(result = '*') {
    switch (result) {
        case '1-0':
            return 'Victoire des blancs';
        case '0-1':
            return 'Victoire des noirs';
        case '1/2-1/2':
            return 'Match nul';
        case '*':
        default:
            return 'Résultat inconnu';
    }
}

export function getWinner(result = '*') {
    switch (result) {
        case '1-0':
            return 'white';
        case '0-1':
            return 'black';
        case '1/2-1/2':
            return 'draw';
        default:
            return null;
    }
}

export function getPlayerDisplayName(name, fallback = 'Joueur inconnu') {
    if (!name) {
        return fallback;
    }

    const value = String(name).trim();

    if (!value || value === '?' || value === '??') {
        return fallback;
    }

    return value;
}

export function buildGameTitle(headers = {}) {
    const white = getPlayerDisplayName(headers.White, 'Blancs');
    const black = getPlayerDisplayName(headers.Black, 'Noirs');

    return `${white} vs ${black}`;
}

export function getGameTitle(game = null) {
    if (game?.title) {
        return game.title;
    }

    const white =
        game?.white_player ||
        game?.whitePlayer ||
        game?.white ||
        game?.headers?.White ||
        'Blancs';

    const black =
        game?.black_player ||
        game?.blackPlayer ||
        game?.black ||
        game?.headers?.Black ||
        'Noirs';

    const result = game?.result ? ` ${game.result}` : '';

    return `${white} vs ${black}${result}`;
}

export function getSharedGameTitle(sharedGame = null) {
    return sharedGame?.title || getGameTitle(sharedGame?.game || sharedGame);
}

export function getUserDisplayName(user = null) {
    return (
        user?.username ||
        user?.name ||
        user?.displayName ||
        user?.email ||
        'Utilisateur'
    );
}

export function getUserId(user = null) {
    return user?.id || user?.user_id || user?.userId || null;
}

export function getAuthor(sharedGame = null) {
    return (
        sharedGame?.user ||
        sharedGame?.author ||
        sharedGame?.owner ||
        sharedGame?.created_by ||
        {}
    );
}

export function getSharedGameId(sharedGame = null) {
    return (
        sharedGame?.id ||
        sharedGame?.shared_game_id ||
        sharedGame?.sharedGameId ||
        null
    );
}

export function getGameId(game = null) {
    return game?.id || game?.game_id || game?.gameId || null;
}

export function getLikeCount(sharedGame = null) {
    return Number(
        sharedGame?.likes_count ??
            sharedGame?.like_count ??
            sharedGame?.likesCount ??
            sharedGame?.likes ??
            0,
    );
}

export function getCommentCount(sharedGame = null) {
    return Number(
        sharedGame?.comments_count ??
            sharedGame?.comment_count ??
            sharedGame?.commentsCount ??
            sharedGame?.comments?.length ??
            0,
    );
}

export function userOwnsResource(user = null, resource = null) {
    const currentUserId = getUserId(user);

    const ownerId =
        resource?.user_id ||
        resource?.userId ||
        getUserId(resource?.user || resource?.author || resource?.owner);

    if (!currentUserId || !ownerId) {
        return false;
    }

    return String(currentUserId) === String(ownerId);
}

export function isAdmin(user = null) {
    return String(user?.role || '').toUpperCase() === 'ADMIN';
}