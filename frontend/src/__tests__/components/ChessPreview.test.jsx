import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChessPreview from '../../components/community/ChessPreview';

vi.mock('react-chessboard', () => ({
  Chessboard: ({ boardWidth, position, boardOrientation }) => (
    <div
      data-testid="chessboard"
      data-width={boardWidth}
      data-position={position}
      data-orientation={boardOrientation}
    />
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

describe('ChessPreview', () => {
  it('renders a playable chessboard preview with game summary', () => {
    const { container } = render(<ChessPreview pgn={VALID_PGN} />);

    expect(screen.getByTestId('chessboard')).toBeInTheDocument();

    const meta = container.querySelector('.community-review-board__meta');

    expect(meta).toBeInTheDocument();
    expect(meta).toHaveTextContent('Matthieu vs WiversBot');
    expect(meta).toHaveTextContent('1-0 · 2 moves');

    expect(screen.getByLabelText(/Board preview controls/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Prev/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Flip/i })).toBeEnabled();

    expect(screen.getByText('Nc6')).toBeInTheDocument();
  });

  it('keeps the board and controls in compact mode', () => {
    render(<ChessPreview pgn={VALID_PGN} compact />);

    expect(screen.getByTestId('chessboard')).toBeInTheDocument();
    expect(screen.getByLabelText(/Board preview controls/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Flip/i })).toBeEnabled();
  });

  it('shows a safe fallback when the PGN cannot be parsed', () => {
    const { container } = render(<ChessPreview pgn="not a pgn" />);

    expect(container).toHaveTextContent('White vs Black');
    expect(container).toHaveTextContent('* · 0 moves');
    expect(container).toHaveTextContent('PGN unavailable');
    expect(container).toHaveTextContent('Start');
    expect(container).toHaveTextContent('Initial position');

    expect(screen.getByTestId('chessboard')).toBeInTheDocument();
    expect(screen.getByTestId('chessboard')).toHaveAttribute(
      'data-position',
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    );
  });

  it('allows flipping the board orientation', () => {
    render(<ChessPreview pgn={VALID_PGN} />);

    expect(screen.getByTestId('chessboard')).toHaveAttribute('data-orientation', 'white');

    fireEvent.click(screen.getByRole('button', { name: /Flip/i }));

    expect(screen.getByTestId('chessboard')).toHaveAttribute('data-orientation', 'black');
  });
});