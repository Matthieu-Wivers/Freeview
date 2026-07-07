import { summarizePgn } from '../../utils/pgn';

const pieces = {
  a8: '♜', b8: '♞', c8: '♝', d8: '♛', e8: '♚', f8: '♝', g8: '♞', h8: '♜',
  a7: '♟', b7: '♟', c7: '♟', d7: '♟', e7: '♟', f7: '♟', g7: '♟', h7: '♟',
  a2: '♙', b2: '♙', c2: '♙', d2: '♙', e2: '♙', f2: '♙', g2: '♙', h2: '♙',
  a1: '♖', b1: '♘', c1: '♗', d1: '♕', e1: '♔', f1: '♗', g1: '♘', h1: '♖',
};

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function ChessPreview({ pgn = '', compact = false }) {
  const summary = summarizePgn(pgn);

  return (
    <div className={compact ? 'community-board community-board--compact' : 'community-board'}>
      <div className="community-board__grid" aria-label="Chessboard preview">
        {ranks.flatMap((rank, rankIndex) =>
          files.map((file, fileIndex) => {
            const square = `${file}${rank}`;
            const isLight = (rankIndex + fileIndex) % 2 === 0;
            return (
              <div
                key={square}
                className={isLight ? 'community-board__square is-light' : 'community-board__square is-dark'}
              >
                <span>{pieces[square] || ''}</span>
              </div>
            );
          }),
        )}
      </div>
      {!compact && (
        <div className="community-board__meta">
          <strong>{summary.white} vs {summary.black}</strong>
          <span>{summary.result} · {summary.moveCount} moves</span>
        </div>
      )}
    </div>
  );
}
