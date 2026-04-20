import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { MoveReview, ParsedGame, ReviewCategory, SandboxFeedback } from '../types/chess';
import { createChessFromFen, getLastMoveSquares } from '../utils/chess';

interface ChessBoardPanelProps {
  game: ParsedGame;
  currentPly: number;
  boardFen: string;
  boardOrientation: 'white' | 'black';
  onPieceDrop: (sourceSquare: string, targetSquare: string) => boolean;
  onFlip: () => void;
  onPrev: () => void;
  onNext: () => void;
  showBestMove: boolean;
  onToggleBestMove: () => void;
  playedMoveReview?: MoveReview | null;
  positionReview?: MoveReview | null;
  sandboxFeedback?: SandboxFeedback | null;
  isSandboxActive: boolean;
  onResetSandbox: () => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const WHITE_RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;
const BLACK_RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

const PIECE_GLYPHS: Record<string, string> = {
  wK: '♚',
  wQ: '♛',
  wR: '♜',
  wB: '♝',
  wN: '♞',
  wP: '♟',
  bK: '♚',
  bQ: '♛',
  bR: '♜',
  bB: '♝',
  bN: '♞',
  bP: '♟',
};

const CATEGORY_COLORS: Record<ReviewCategory, string> = {
  theory: '#94a3b8',
  best: '#3b82f6',
  excellent: '#16a34a',
  good: '#29f875',
  inaccuracy: '#86efac',
  miss: "#facc15",
  mistake: '#fb923c',
  blunder: '#ef4444',
};

const BEST_MOVE_COLOR = '#3b82f6';

function colorToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');

  if (normalized.length !== 6) {
    return `rgba(59, 130, 246, ${alpha})`;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCategoryColor(category?: ReviewCategory | null) {
  if (!category) return '#94a3b8';
  return CATEGORY_COLORS[category] ?? '#94a3b8';
}

function uciToSquares(uci?: string | null) {
  if (!uci || uci.length < 4) return null;

  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
  };
}

function fenToPieceMap(fen: string): Record<string, string> {
  const normalizedFen = fen === 'start' ? createChessFromFen('start').fen() : fen;
  const placement = normalizedFen.split(' ')[0] ?? '';
  const rows = placement.split('/');
  const map: Record<string, string> = {};

  rows.forEach((row, rowIndex) => {
    let fileIndex = 0;

    for (const char of row) {
      const asNumber = Number(char);

      if (Number.isInteger(asNumber) && asNumber > 0) {
        fileIndex += asNumber;
        continue;
      }

      const file = FILES[fileIndex];
      const rank = String(8 - rowIndex);
      const color = char === char.toUpperCase() ? 'w' : 'b';
      const piece = char.toLowerCase();
      const pieceCode = `${color}${piece.toUpperCase()}`;

      if (file) {
        map[`${file}${rank}`] = pieceCode;
      }

      fileIndex += 1;
    }
  });

  return map;
}

function isDarkSquare(square: string) {
  const fileIndex = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return (fileIndex + rank) % 2 === 1;
}

function getDisplayedFiles(orientation: 'white' | 'black') {
  return orientation === 'white' ? [...FILES] : [...FILES].reverse();
}

function getDisplayedRanks(orientation: 'white' | 'black') {
  return orientation === 'white' ? [...WHITE_RANKS] : [...BLACK_RANKS];
}

function getSquareCenter(square: string, orientation: 'white' | 'black') {
  const files = getDisplayedFiles(orientation);
  const ranks = getDisplayedRanks(orientation);

  const xIndex = files.indexOf(square[0] as (typeof FILES)[number]);
  const yIndex = ranks.indexOf(square[1] as (typeof WHITE_RANKS)[number]);

  return {
    x: (xIndex + 0.5) * 12.5,
    y: (yIndex + 0.5) * 12.5,
  };
}

function buildSquareStyle({
  square,
  selectedSquare,
  officialLastMoveSquares,
  playedMoveSquares,
  playedMoveColor,
  bestMoveSquares,
  showBestMove,
}: {
  square: string;
  selectedSquare: string | null;
  officialLastMoveSquares: { from: string; to: string } | null;
  playedMoveSquares: { from: string; to: string } | null;
  playedMoveColor: string;
  bestMoveSquares: { from: string; to: string } | null;
  showBestMove: boolean;
}) {
  const baseColor = isDarkSquare(square) ? '#7187a6' : '#eef4ff';
  const backgrounds: string[] = [];
  const shadows: string[] = [];

  if (selectedSquare === square) {
    backgrounds.push('radial-gradient(circle, rgba(250, 204, 21, 0.34), rgba(250, 204, 21, 0.16))');
    shadows.push('inset 0 0 0 3px rgba(250, 204, 21, 0.82)');
  }

  if (officialLastMoveSquares?.from === square) {
    backgrounds.push('radial-gradient(circle, rgba(148, 163, 184, 0.14), rgba(148, 163, 184, 0.05))');
    shadows.push('inset 0 0 0 1.5px rgba(148, 163, 184, 0.22)');
  }

  if (officialLastMoveSquares?.to === square) {
    backgrounds.push('radial-gradient(circle, rgba(148, 163, 184, 0.18), rgba(148, 163, 184, 0.08))');
    shadows.push('inset 0 0 0 1.5px rgba(148, 163, 184, 0.26)');
  }

  if (playedMoveSquares?.from === square) {
    backgrounds.push(
      `radial-gradient(circle, ${colorToRgba(playedMoveColor, 0.22)}, ${colorToRgba(playedMoveColor, 0.1)})`,
    );
    shadows.push(`inset 0 0 0 2.5px ${colorToRgba(playedMoveColor, 0.58)}`);
  }

  if (playedMoveSquares?.to === square) {
    backgrounds.push(
      `radial-gradient(circle, ${colorToRgba(playedMoveColor, 0.26)}, ${colorToRgba(playedMoveColor, 0.14)})`,
    );
    shadows.push(`inset 0 0 0 3px ${colorToRgba(playedMoveColor, 0.82)}`);
  }

  const isPlayedFrom = playedMoveSquares?.from === square;
  const isPlayedTo = playedMoveSquares?.to === square;

  if (showBestMove && bestMoveSquares?.from === square && !isPlayedFrom) {
    shadows.push(`inset 0 0 0 2px ${colorToRgba(BEST_MOVE_COLOR, 0.62)}`);
  }

  if (showBestMove && bestMoveSquares?.to === square && !isPlayedTo) {
    backgrounds.push(
      `radial-gradient(circle, ${colorToRgba(BEST_MOVE_COLOR, 0.2)}, ${colorToRgba(BEST_MOVE_COLOR, 0.08)})`,
    );
    shadows.push(`inset 0 0 0 3px ${colorToRgba(BEST_MOVE_COLOR, 0.84)}`);
  }

  return {
    background: backgrounds.length ? `${backgrounds.join(', ')}, ${baseColor}` : baseColor,
    boxShadow: shadows.join(', '),
  };
}

function buildArrowGeometry(
  from: string,
  to: string,
  orientation: 'white' | 'black',
  shortenBy = 3.2,
) {
  const start = getSquareCenter(from, orientation);
  const end = getSquareCenter(to, orientation);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const unitX = dx / length;
  const unitY = dy / length;

  return {
    start,
    end: {
      x: end.x - unitX * shortenBy,
      y: end.y - unitY * shortenBy,
    },
  };
}

function getPieceStyle(piece: string, isDragging: boolean): CSSProperties {
  const isWhite = piece.startsWith('w');

  return {
    fontSize: 'clamp(2.6rem, 4.6vw, 3.8rem)',
    lineHeight: 1,
    fontWeight: 700,
    fontFamily:
      '"Segoe UI Symbol", "Arial Unicode MS", "Noto Sans Symbols 2", "Apple Symbols", sans-serif',
    color: isWhite ? '#f8fafc' : '#0f172a',
    WebkitTextStroke: isWhite ? '1.6px #020617' : '0.5px rgba(255, 255, 255, 0.08)',
    textShadow: isWhite
      ? '0 1px 0 rgba(255,255,255,0.45), 0 4px 10px rgba(2,6,23,0.28), 0 0 1px rgba(2,6,23,0.9)'
      : '0 1px 0 rgba(255,255,255,0.08), 0 4px 10px rgba(2,6,23,0.24)',
    transform: isDragging ? 'scale(1.05)' : 'scale(1)',
    opacity: isDragging ? 0.72 : 1,
    userSelect: 'none',
    pointerEvents: 'auto',
    filter: isWhite ? 'drop-shadow(0 2px 4px rgba(15, 23, 42, 0.18))' : 'none',
  };
}

export function ChessBoardPanel({
  game,
  currentPly,
  boardFen,
  boardOrientation,
  onPieceDrop,
  onFlip,
  onPrev,
  onNext,
  showBestMove,
  onToggleBestMove,
  playedMoveReview,
  positionReview,
  sandboxFeedback,
  isSandboxActive,
  onResetSandbox,
}: ChessBoardPanelProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);

  const officialLastMoveSquares = getLastMoveSquares(game, currentPly);
  const pieceMap = useMemo(() => fenToPieceMap(boardFen), [boardFen]);
  const turnColor = boardFen === 'start' ? 'w' : boardFen.split(' ')[1] ?? 'w';
  const displayedFiles = useMemo(() => getDisplayedFiles(boardOrientation), [boardOrientation]);
  const displayedRanks = useMemo(() => getDisplayedRanks(boardOrientation), [boardOrientation]);

  useEffect(() => {
    setSelectedSquare(null);
    setDragSource(null);
  }, [boardFen, boardOrientation, currentPly]);

  const displayedSquares = useMemo(
    () => displayedRanks.flatMap((rank) => displayedFiles.map((file) => `${file}${rank}`)),
    [displayedFiles, displayedRanks],
  );

  const playedMoveSquares = useMemo(() => {
    if (isSandboxActive && sandboxFeedback?.uci) {
      return uciToSquares(sandboxFeedback.uci);
    }

    if (currentPly > 0) {
      return officialLastMoveSquares;
    }

    return null;
  }, [currentPly, isSandboxActive, officialLastMoveSquares, sandboxFeedback]);

  const playedMoveColor = useMemo(() => {
    if (isSandboxActive) {
      return getCategoryColor(sandboxFeedback?.category ?? null);
    }

    return getCategoryColor(playedMoveReview?.category ?? null);
  }, [isSandboxActive, sandboxFeedback, playedMoveReview]);

  const playedMoveMeta = useMemo(() => {
    if (isSandboxActive) {
      return {
        label: sandboxFeedback?.comment ?? 'Trace du coup testé.',
        category: sandboxFeedback?.category ?? null,
      };
    }

    return {
      label: playedMoveReview?.comment ?? 'Trace du coup joué.',
      category: playedMoveReview?.category ?? null,
    };
  }, [isSandboxActive, sandboxFeedback, playedMoveReview]);

  const bestMoveData = useMemo(() => {
    if (isSandboxActive && sandboxFeedback?.bestUci) {
      return {
        squares: uciToSquares(sandboxFeedback.bestUci),
        san: sandboxFeedback.bestSan ?? '—',
      };
    }

    if (positionReview?.bestUci) {
      return {
        squares: uciToSquares(positionReview.bestUci),
        san: positionReview.bestSan ?? '—',
      };
    }

    return {
      squares: null,
      san: '—',
    };
  }, [isSandboxActive, sandboxFeedback, positionReview]);

  const renderedArrows = useMemo(() => {
    const arrows: Array<{
      from: string;
      to: string;
      color: string;
      key: string;
      strokeWidth: number;
      opacity: number;
      dashed?: boolean;
    }> = [];

    if (playedMoveSquares) {
      arrows.push({
        from: playedMoveSquares.from,
        to: playedMoveSquares.to,
        color: playedMoveColor,
        key: `played-${playedMoveSquares.from}-${playedMoveSquares.to}-${playedMoveColor}`,
        strokeWidth: 0.55,
        opacity: 0.96,
      });
    }

    const isSameAsPlayed =
      bestMoveData.squares &&
      playedMoveSquares &&
      bestMoveData.squares.from === playedMoveSquares.from &&
      bestMoveData.squares.to === playedMoveSquares.to;

    if (showBestMove && bestMoveData.squares && !isSameAsPlayed) {
      arrows.push({
        from: bestMoveData.squares.from,
        to: bestMoveData.squares.to,
        color: BEST_MOVE_COLOR,
        key: `best-${bestMoveData.squares.from}-${bestMoveData.squares.to}`,
        strokeWidth: 0.5,
        opacity: 0.88,
        dashed: true,
      });
    }

    return arrows;
  }, [playedMoveSquares, playedMoveColor, bestMoveData, showBestMove]);

  const handleMoveAttempt = (sourceSquare: string, targetSquare: string) => {
    if (sourceSquare === targetSquare) {
      setSelectedSquare(null);
      return false;
    }

    const success = onPieceDrop(sourceSquare, targetSquare);
    setSelectedSquare(null);
    setDragSource(null);
    return success;
  };

  const handleSquareClick = (square: string) => {
    const piece = pieceMap[square];
    const pieceColor = piece?.[0]?.toLowerCase();

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      const success = handleMoveAttempt(selectedSquare, square);

      if (!success && piece && pieceColor === turnColor) {
        setSelectedSquare(square);
      }

      return;
    }

    if (piece && pieceColor === turnColor) {
      setSelectedSquare(square);
    }
  };

  const currentMoveLabel = isSandboxActive
    ? sandboxFeedback?.san ?? 'Test interactif'
    : currentPly > 0
      ? game.moves[currentPly - 1]?.san ?? '—'
      : 'Position initiale';

  const bestMoveLabel = bestMoveData.san ?? '—';
  const moveTypeLabel = playedMoveMeta.category;

  return (
    <section className="panel board-panel">
      <div className="board-toolbar">
        <div>
          <span className="eyebrow">Review</span>
          <h2>
            Move {currentPly}/{game.moves.length}
          </h2>
        </div>

        <div className="toolbar-actions">
          <button type="button" className="btn btn--ghost" onClick={onPrev}>
            ← Previous move
          </button>
          <button type="button" className="btn btn--ghost" onClick={onNext}>
            Next move →
          </button>
          <button type="button" className="btn btn--ghost" onClick={onToggleBestMove}>
            {showBestMove ? 'Hide best move' : 'Show best move'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onFlip}>
            &#8634;
          </button>
        </div>
      </div>

      <div className="board-shell">
        <div
          className="analysis-board-frame"
          style={{
            borderRadius: 28,
            padding: 14,
            background: 'linear-gradient(180deg, rgba(8,15,29,0.76), rgba(15,23,42,0.88))',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 60px rgba(2,6,23,0.28)',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
            }}
          >
            <svg
              className="analysis-board-arrows"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 3,
                overflow: 'visible',
              }}
            >
              <defs>
                {renderedArrows.map((arrow, index) => (
                  <marker
                    key={`${arrow.key}-marker`}
                    id={`analysis-arrow-${index}`}
                    markerWidth="5"
                    markerHeight="5"
                    refX="4.1"
                    refY="2.5"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L5,2.5 L0,5 Z" fill={colorToRgba(arrow.color, arrow.opacity)} />
                  </marker>
                ))}
              </defs>

              {renderedArrows.map((arrow, index) => {
                const geometry = buildArrowGeometry(arrow.from, arrow.to, boardOrientation);

                return (
                  <g key={arrow.key}>
                    <circle
                      cx={geometry.start.x}
                      cy={geometry.start.y}
                      r="0.9"
                      fill={colorToRgba(arrow.color, Math.min(arrow.opacity, 0.86))}
                    />
                    <line
                      x1={geometry.start.x}
                      y1={geometry.start.y}
                      x2={geometry.end.x}
                      y2={geometry.end.y}
                      stroke={colorToRgba(arrow.color, arrow.opacity)}
                      strokeWidth={arrow.strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={arrow.dashed ? '3 2' : undefined}
                      markerEnd={`url(#analysis-arrow-${index})`}
                    />
                  </g>
                );
              })}
            </svg>

            <div
              className="analysis-board"
              role="grid"
              aria-label="Échiquier d'analyse"
              style={{
                position: 'relative',
                zIndex: 2,
                width: '100%',
                height: '100%',
              }}
            >
              {displayedSquares.map((square, index) => {
                const piece = pieceMap[square];
                const pieceColorClass = piece?.startsWith('w') ? 'white' : 'black';
                const fileIndex = index % 8;
                const rankIndex = Math.floor(index / 8);

                const squareStyle = buildSquareStyle({
                  square,
                  selectedSquare,
                  officialLastMoveSquares,
                  playedMoveSquares,
                  playedMoveColor,
                  bestMoveSquares: bestMoveData.squares,
                  showBestMove,
                });

                return (
                  <button
                    key={`${square}-${piece ?? 'empty'}`}
                    type="button"
                    className={`analysis-square ${isDarkSquare(square) ? 'analysis-square--dark' : 'analysis-square--light'}`}
                    style={squareStyle}
                    onClick={() => handleSquareClick(square)}
                    onDragOver={(event) => {
                      if (dragSource) {
                        event.preventDefault();
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();

                      if (dragSource) {
                        handleMoveAttempt(dragSource, square);
                      }
                    }}
                  >
                    {fileIndex === 0 ? <span className="analysis-rank-label">{square[1]}</span> : null}
                    {rankIndex === 7 ? <span className="analysis-file-label">{square[0]}</span> : null}

                    {piece ? (
                      <span
                        className={`analysis-piece analysis-piece--${pieceColorClass} ${dragSource === square ? 'analysis-piece--dragging' : ''}`}
                        style={getPieceStyle(piece, dragSource === square)}
                        draggable={piece[0]?.toLowerCase() === turnColor}
                        onDragStart={(event) => {
                          setDragSource(square);
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', square);
                        }}
                        onDragEnd={() => setDragSource(null)}
                      >
                        {PIECE_GLYPHS[piece]}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {sandboxFeedback ? (
        <div className={`sandbox-card sandbox-card--${sandboxFeedback.category}`}>
          <div>
            <span className="meta-label">Interactive test </span>
            <strong>
              {sandboxFeedback.san} · {sandboxFeedback.comment}
            </strong>
            <p>
              Estimated Accuracy : {Math.round(sandboxFeedback.accuracy)}% · best move :{' '}
              {sandboxFeedback.bestSan}
            </p>
          </div>

          {isSandboxActive ? (
            <button type="button" className="btn btn--secondary" onClick={onResetSandbox}>
              Back to the game
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}