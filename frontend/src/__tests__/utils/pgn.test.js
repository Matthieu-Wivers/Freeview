import { describe, expect, it } from 'vitest';
import {
  buildGameTitle,
  formatDate,
  formatResult,
  getAuthor,
  getCommentCount,
  getGameId,
  getGameTitle,
  getLikeCount,
  getPlayerDisplayName,
  getSharedGameId,
  getSharedGameTitle,
  getUserDisplayName,
  getUserId,
  getWinner,
  isAdmin,
  normalizePgn,
  parseHeaders,
  parsePgn,
  summarizePgn,
  userOwnsResource,
} from '../../utils/pgn';

const VALID_PGN = `\uFEFF
[Event "Freeview Test Game"]\r
[Site "Local"]\r
[Date "2026.07.09"]\r
[White "Matthieu"]\r
[Black "WiversBot"]\r
[Result "1-0"]\r
\r
1. e4 e5
2. Nf3 Nc6 1-0
`;

const NORMALIZED_PGN = `[Event "Freeview Test Game"]
[Site "Local"]
[Date "2026.07.09"]
[White "Matthieu"]
[Black "WiversBot"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`;

describe('pgn utils', () => {
  it('normalizes BOM, CRLF and extra spaces while preserving headers and moves', () => {
    expect(normalizePgn(VALID_PGN)).toBe(NORMALIZED_PGN);
  });

  it('parses PGN headers case-sensitively like PGN tag pairs', () => {
    expect(parseHeaders(VALID_PGN)).toMatchObject({
      Event: 'Freeview Test Game',
      Site: 'Local',
      Date: '2026.07.09',
      White: 'Matthieu',
      Black: 'WiversBot',
      Result: '1-0',
    });
  });

  it('parses moves with replay metadata and before/after FENs', () => {
    const parsed = parsePgn(VALID_PGN);

    expect(parsed.headers).toMatchObject({
      White: 'Matthieu',
      Black: 'WiversBot',
      Result: '1-0',
    });

    expect(parsed.moves).toHaveLength(4);

    expect(parsed.moves[0]).toMatchObject({
      ply: 1,
      moveNumber: 1,
      color: 'w',
      san: 'e4',
      from: 'e2',
      to: 'e4',
      uci: 'e2e4',
    });

    expect(parsed.moves[0].fenBefore).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    );
    expect(parsed.moves[0].fenAfter).toEqual(expect.any(String));

    expect(parsed.moves.at(-1)).toMatchObject({
      ply: 4,
      moveNumber: 2,
      color: 'b',
      san: 'Nc6',
      from: 'b8',
      to: 'c6',
    });
  });

  it('summarizes valid and invalid PGNs without throwing in UI code', () => {
    expect(summarizePgn(VALID_PGN)).toMatchObject({
      isValid: true,
      title: 'Freeview Test Game',
      event: 'Freeview Test Game',
      white: 'Matthieu',
      black: 'WiversBot',
      result: '1-0',
      moveCount: 2,
      movesCount: 4,
      plyCount: 4,
      lastMove: 'Nc6',
    });

    expect(summarizePgn('not a pgn')).toMatchObject({
      isValid: false,
      title: 'Invalid game',
      moveCount: 0,
      moves: [],
    });
  });

  it.each([
    ['2026.07.09', '09/07/2026'],
    ['2026.07.??', '07/2026'],
    ['2026.??.??', '2026'],
    ['????.??.??', 'Date inconnue'],
    ['', 'Date inconnue'],
    ['bad-date', 'bad-date'],
  ])('formats PGN dates: %s', (input, expected) => {
    expect(formatDate(input)).toBe(expected);
  });

  it('formats results and winners consistently', () => {
    expect(formatResult('1-0')).toBe('Victoire des blancs');
    expect(formatResult('0-1')).toBe('Victoire des noirs');
    expect(formatResult('1/2-1/2')).toBe('Match nul');
    expect(formatResult('*')).toBe('Résultat inconnu');

    expect(getWinner('1-0')).toBe('white');
    expect(getWinner('0-1')).toBe('black');
    expect(getWinner('1/2-1/2')).toBe('draw');
    expect(getWinner('*')).toBeNull();
  });

  it('builds display titles and safely handles missing player names', () => {
    expect(getPlayerDisplayName(' Matthieu ')).toBe('Matthieu');
    expect(getPlayerDisplayName('?')).toBe('Joueur inconnu');
    expect(getPlayerDisplayName('', 'Fallback')).toBe('Fallback');

    expect(buildGameTitle({ White: 'Matthieu', Black: 'WiversBot' })).toBe('Matthieu vs WiversBot');

    expect(
      getGameTitle({
        whitePlayer: 'Matthieu',
        blackPlayer: 'WiversBot',
        result: '1-0',
      }),
    ).toBe('Matthieu vs WiversBot 1-0');

    expect(
      getSharedGameTitle({
        title: 'Sharp Sicilian review',
      }),
    ).toBe('Sharp Sicilian review');
  });

  it('normalizes author, ids, counters and ownership helpers across API shapes', () => {
    const user = {
      id: 'user-1',
      username: 'Matthieu',
      role: 'ADMIN',
    };

    const sharedGame = {
      id: 'shared-1',
      gameId: 'game-1',
      author: {
        id: 'user-1',
        username: 'Matthieu',
      },
      likesCount: 7,
      commentsCount: 2,
    };

    expect(getUserDisplayName(user)).toBe('Matthieu');
    expect(getUserId({ user_id: 'user-1' })).toBe('user-1');

    expect(getAuthor(sharedGame)).toEqual(sharedGame.author);
    expect(getSharedGameId(sharedGame)).toBe('shared-1');
    expect(getGameId(sharedGame)).toBe('game-1');

    expect(getLikeCount(sharedGame)).toBe(7);
    expect(getCommentCount(sharedGame)).toBe(2);

    expect(userOwnsResource(user, sharedGame)).toBe(true);
    expect(userOwnsResource({ id: 'other-user' }, sharedGame)).toBe(false);

    expect(isAdmin(user)).toBe(true);
    expect(isAdmin({ role: 'USER' })).toBe(false);
  });
});