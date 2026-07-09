import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccuracySummary } from '../../components/Analyse/AccuracySummary';

describe('AccuracySummary', () => {
  it('renders both player names and their formatted accuracies', () => {
    render(
      <AccuracySummary
        whiteName="Matthieu"
        blackName="Stockfish"
        accuracyWhite={93.24}
        accuracyBlack={81.76}
      />,
    );

    expect(screen.getByText(/Global Accuracy/i)).toBeInTheDocument();
    expect(screen.getByText(/White/i)).toBeInTheDocument();
    expect(screen.getByText(/Matthieu/i)).toBeInTheDocument();
    expect(screen.getByText(/Black/i)).toBeInTheDocument();
    expect(screen.getByText(/Stockfish/i)).toBeInTheDocument();
    expect(screen.getByText(/93/)).toBeInTheDocument();
    expect(screen.getByText(/82/)).toBeInTheDocument();
  });
});
