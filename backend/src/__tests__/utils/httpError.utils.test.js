import { describe, expect, it } from 'vitest';
import {
  assertUuid,
  createHttpError,
  isForeignKeyViolation,
  isUniqueViolation,
} from '../../utils/httpError.utils.js';

describe('httpError.utils', () => {
  it('creates rich HTTP errors with status, code and optional details', () => {
    const error = createHttpError(422, 'INVALID_MOVE', 'Illegal chess move.', {
      move: 'e2e5',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: 'HttpError',
      status: 422,
      code: 'INVALID_MOVE',
      message: 'Illegal chess move.',
      details: { move: 'e2e5' },
    });
  });

  it('accepts valid UUIDs and trims them', () => {
    expect(assertUuid('  123e4567-e89b-12d3-a456-426614174000  ')).toBe(
      '123e4567-e89b-12d3-a456-426614174000',
    );
  });

  it('rejects invalid UUIDs with a deterministic client error', () => {
    expect(() => assertUuid('not-a-uuid', 'gameId')).toThrowError(/gameId invalide/);

    try {
      assertUuid('not-a-uuid', 'gameId');
    } catch (error) {
      expect(error).toMatchObject({ status: 400, code: 'INVALID_ID' });
    }
  });

  it('detects PostgreSQL unique and foreign key violations', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation({ code: '23503' })).toBe(false);
    expect(isForeignKeyViolation({ code: '23503' })).toBe(true);
    expect(isForeignKeyViolation({ code: '23505' })).toBe(false);
  });
});
