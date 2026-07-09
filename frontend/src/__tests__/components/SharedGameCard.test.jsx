import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import SharedGameCard from '../../components/community/SharedGameCard';

vi.mock('../../components/community/ChessPreview', () => ({
  default: ({ pgn }) => (
    <div data-testid="chess-preview">
      Preview: {pgn ? 'with pgn' : 'without pgn'}
    </div>
  ),
}));

const VALID_PGN = `
[Event "Freeview Test Game"]
[Site "Local"]
[Date "2026.07.09"]
[White "Matthieu"]
[Black "WiversBot"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0
`;

function renderCard(sharedGame) {
  return render(
    <MemoryRouter>
      <SharedGameCard sharedGame={sharedGame} />
    </MemoryRouter>,
  );
}

describe('SharedGameCard', () => {
  it('renders shared game metadata with title, author, visibility, likes and comments', () => {
    renderCard({
      id: 'shared-1',
      title: 'Sharp Sicilian review',
      description: 'A tactical Najdorf game.',
      visibility: 'unlisted',
      createdAt: '2026-07-09T10:00:00.000Z',
      author: {
        id: 'user-1',
        username: 'Matthieu',
      },
      game: {
        id: 'game-1',
        pgn: VALID_PGN,
      },
      likesCount: 12,
      commentsCount: 3,
    });

    expect(screen.getByRole('heading', { name: /Sharp Sicilian review/i })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Open review/i })).toHaveAttribute(
      'href',
      '/shared-games/shared-1',
    );

    expect(screen.getByText('Matthieu', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(/09\/07\/2026/i)).toBeInTheDocument();
    expect(screen.getByText(/unlisted/i)).toBeInTheDocument();
    expect(screen.getByText(/A tactical Najdorf game/i)).toBeInTheDocument();

    expect(
      screen.getByText((_, element) => element?.textContent?.trim() === '12 likes'),
    ).toBeInTheDocument();

    expect(
      screen.getByText((_, element) => element?.textContent?.trim() === '3 comments'),
    ).toBeInTheDocument();

    expect(screen.getByTestId('chess-preview')).toHaveTextContent('with pgn');
  });

  it('renders review-specific information when a saved review payload is present', () => {
    renderCard({
      id: 'shared-2',
      title: 'Reviewed game',
      description: null,
      visibility: 'public',
      author: {
        id: 'user-2',
        username: 'Wivers',
      },
      game: {
        id: 'game-2',
        pgn: VALID_PGN,
      },
      review: {
        moves: [
          {
            ply: 1,
            san: 'Nf3',
            category: 'best',
            classification: 'best',
          },
        ],
      },
      analysisSummary: {
        averageAccuracy: 91,
        whiteAccuracy: 94,
        blackAccuracy: 88,
      },
      likesCount: 0,
      commentsCount: 0,
    });

    expect(screen.getByText('Review', { selector: '.badge' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Review preview/i)).toBeInTheDocument();

    expect(screen.getByText(/Average/i)).toBeInTheDocument();
    expect(screen.getByText(/White/i)).toBeInTheDocument();
    expect(screen.getByText(/Black/i)).toBeInTheDocument();

    expect(screen.getByText('91%')).toBeInTheDocument();

    const unavailableStats = screen.getAllByText('N/A');
    expect(unavailableStats).toHaveLength(2);

    expect(
      screen.getByText(/Review saved\. Open the review to inspect every move\./i),
    ).toBeInTheDocument();
  });

  it('renders the current fallback note and non-visible moderation status', () => {
    renderCard({
      id: 'shared-3',
      title: 'Quiet Queen Pawn',
      description: '',
      visibility: 'public',
      moderationStatus: 'hidden',
      status: 'hidden',
      author: {
        id: 'user-3',
        username: 'Wivers',
      },
      game: {
        id: 'game-3',
        pgn: VALID_PGN,
      },
      likesCount: 0,
      commentsCount: 0,
    });

    expect(screen.getByRole('heading', { name: /Quiet Queen Pawn/i })).toBeInTheDocument();
    expect(screen.getByText(/hidden/i)).toBeInTheDocument();
    expect(screen.getByText(/This post does not contain a saved review payload yet/i)).toBeInTheDocument();
    expect(screen.getByTestId('chess-preview')).toHaveTextContent('with pgn');
  });
});