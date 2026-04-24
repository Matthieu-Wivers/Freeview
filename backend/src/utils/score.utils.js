function sideRelativeToWhite(score, turn) {
  return turn === 'w' ? score : -score;
}

export function scoreWhiteFromInfoLine(line, turn) {
  const mate = line.match(/\bscore\s+mate\s+(-?\d+)/);

  if (mate) {
    const movesToMate = Number(mate[1]);
    const sideRelativeScore = movesToMate > 0
      ? 1000 - Math.abs(movesToMate)
      : -1000 + Math.abs(movesToMate);

    return sideRelativeToWhite(sideRelativeScore, turn);
  }

  const cp = line.match(/\bscore\s+cp\s+(-?\d+)/);

  if (!cp) {
    return null;
  }

  return sideRelativeToWhite(Number(cp[1]) / 100, turn);
}

export function extractPvMove(line) {
  return line.match(/\spv\s+([a-h][1-8][a-h][1-8][qrbn]?)/)?.[1] ?? null;
}

export function extractMultiPv(line) {
  return Number(line.match(/\bmultipv\s+(\d+)/)?.[1] ?? '1');
}
