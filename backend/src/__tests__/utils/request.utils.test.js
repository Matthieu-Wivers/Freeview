import { describe, expect, it } from 'vitest';
import {
  cleanNullableString,
  cleanString,
  parseBooleanQuery,
  parsePagination,
} from '../../utils/request.utils.js';

describe('request.utils', () => {
  describe('cleanString', () => {
    it('trims values and converts nullish values to the default value', () => {
      expect(cleanString('  Freeview  ')).toBe('Freeview');
      expect(cleanString(null, { defaultValue: 'fallback' })).toBe('fallback');
      expect(cleanString(undefined, { defaultValue: 'fallback' })).toBe('fallback');
    });

    it('hard-limits long strings to protect service payload normalization', () => {
      expect(cleanString('abcdefgh', { maxLength: 4 })).toBe('abcd');
    });
  });

  describe('cleanNullableString', () => {
    it('returns null for empty values and a cleaned string otherwise', () => {
      expect(cleanNullableString('   ')).toBeNull();
      expect(cleanNullableString('  chess  ')).toBe('chess');
    });
  });

  describe('parsePagination', () => {
    it('defaults to a safe pagination window', () => {
      expect(parsePagination()).toEqual({ limit: 20, offset: 0 });
    });

    it('truncates decimals and clamps invalid ranges', () => {
      expect(parsePagination({ limit: '12.9', offset: '3.7' })).toEqual({
        limit: 12,
        offset: 3,
      });
      expect(parsePagination({ limit: '-10', offset: '-1' })).toEqual({
        limit: 1,
        offset: 0,
      });
      expect(parsePagination({ limit: '9999', offset: '4' })).toEqual({
        limit: 100,
        offset: 4,
      });
    });

    it('ignores non numeric values', () => {
      expect(parsePagination({ limit: 'NaN', offset: 'nope' })).toEqual({
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('parseBooleanQuery', () => {
    it.each([
      ['1', true],
      ['true', true],
      ['YES', true],
      ['enabled', true],
      ['0', false],
      ['false', false],
      ['No', false],
      ['disabled', false],
      ['', null],
      [undefined, null],
      ['maybe', null],
    ])('parses %s as %s', (input, expected) => {
      expect(parseBooleanQuery(input)).toBe(expected);
    });
  });
});
