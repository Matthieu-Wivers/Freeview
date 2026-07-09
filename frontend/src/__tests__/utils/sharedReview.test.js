import { describe, expect, it } from 'vitest';
import {
  buildReviewDescription,
  buildReviewSummary,
  buildReviewTitle,
  countReviewCategories,
  getAverageAccuracy,
  getCriticalMoves,
  getSharedReview,
  getSharedReviewSummary,
  hasSharedReview,
} from '../../utils/sharedReview';

const game = {
  headers: {
    White: 'Matthieu',
    Black: 'Stockfish',
    Result: '1-0',
  },
  moves: [{ san: 'e4' }, { san: 'e5' }, { san: 'Nf3' }],
};

const review = {
  accuracyWhite: 92.5,
  accuracyBlack: 81.5,
  averageLossWhite: 0.13,
  averageLossBlack: 0.34,
  finalEvaluation: 1.2,
  moveReviews: [
    { ply: 1, category: 'best', loss: 0, san: 'e4' },
    { ply: 2, category: 'inaccuracy', loss: 0.7, san: 'e5', bestSan: 'c5' },
    { ply: 3, category: 'mistake', loss: 1.4, san: 'Nf3', bestSan: 'd4' },
    { ply: 4, category: 'blunder', loss: 3.8, san: 'Nc6', bestSan: 'Nf6' },
  ],
};

describe('sharedReview utils', () => {
  it('detects review payloads across API naming conventions', () => {
    expect(getSharedReview({ reviewPayload: review })).toBe(review);
    expect(getSharedReview({ review_payload: review })).toBe(review);
    expect(getSharedReview({ analysis: review })).toBe(review);
    expect(getSharedReview({})).toBeNull();

    expect(getSharedReviewSummary({ analysis_summary: { averageAccuracy: 88 } })).toEqual({
      averageAccuracy: 88,
    });
    expect(hasSharedReview({ review: { moveReviews: [{ category: 'best' }] } })).toBe(true);
    expect(hasSharedReview({ summary: { accuracyWhite: 91 } })).toBe(true);
    expect(hasSharedReview({})).toBe(false);
  });

  it('counts known and unexpected categories without losing data', () => {
    expect(
      countReviewCategories({
        moveReviews: [
          { category: 'best' },
          { category: 'best' },
          { category: 'brilliant' },
          {},
        ],
      }),
    ).toMatchObject({
      best: 2,
      brilliant: 1,
      good: 1,
    });
  });

  it('computes average accuracy when one or both sides are present', () => {
    expect(getAverageAccuracy(review)).toBe(87);
    expect(getAverageAccuracy({ accuracyWhite: 92 })).toBe(92);
    expect(getAverageAccuracy({ accuracyBlack: 81 })).toBe(81);
    expect(getAverageAccuracy({})).toBe(0);
  });

  it('returns the most critical moves sorted by loss descending', () => {
    expect(getCriticalMoves(review, 2)).toEqual([
      expect.objectContaining({ category: 'blunder', loss: 3.8 }),
      expect.objectContaining({ category: 'mistake', loss: 1.4 }),
    ]);
  });

  it('builds a compact review summary that can be persisted with a share', () => {
    expect(buildReviewSummary(game, review)).toMatchObject({
      white: 'Matthieu',
      black: 'Stockfish',
      result: '1-0',
      moveCount: 3,
      accuracyWhite: 92.5,
      accuracyBlack: 81.5,
      averageAccuracy: 87,
      averageLossWhite: 0.13,
      averageLossBlack: 0.34,
      finalEvaluation: 1.2,
      categoryCounts: expect.objectContaining({ best: 1, inaccuracy: 1, mistake: 1, blunder: 1 }),
      criticalMoves: [
        expect.objectContaining({ ply: 4, playedSan: 'Nc6', bestSan: 'Nf6', category: 'blunder' }),
        expect.objectContaining({ ply: 3, playedSan: 'Nf3', bestSan: 'd4', category: 'mistake' }),
        expect.objectContaining({ ply: 2, playedSan: 'e5', bestSan: 'c5', category: 'inaccuracy' }),
      ],
    });
  });

  it('builds user-facing share title and description', () => {
    expect(buildReviewTitle(game)).toBe('Matthieu vs Stockfish 1-0 review');
    expect(buildReviewDescription(game, review)).toContain('Average accuracy: 87%');
    expect(buildReviewDescription(game, review)).toContain('Critical moves found: 3');
  });
});
