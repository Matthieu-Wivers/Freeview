import { createChessFromFen } from './chess';

const ANNOTATION_SUFFIX_REGEX = /(!!|\?\?|\!\?|\?\!|!|\?)$/;
const CHECK_OR_MATE_SUFFIX_REGEX = /(\+\+|#|\+)$/u;
const EN_PASSANT_SUFFIX_REGEX = /\s*(?:e\.p\.?|ep)\s*$/iu;

export function normalizeSanForDisplay(input: string): string {
  let san = (input ?? '').trim();

  if (!san) return '';

  san = san.replace(/0-0-0/giu, 'O-O-O');
  san = san.replace(/0-0/giu, 'O-O');
  san = san.replace(EN_PASSANT_SUFFIX_REGEX, '');

  while (ANNOTATION_SUFFIX_REGEX.test(san)) {
    san = san.replace(ANNOTATION_SUFFIX_REGEX, '');
  }

  let suffix = '';
  const suffixMatch = san.match(CHECK_OR_MATE_SUFFIX_REGEX);
  if (suffixMatch) {
    suffix = suffixMatch[1] === '++' ? '#' : suffixMatch[1];
    san = san.slice(0, -suffixMatch[1].length);
  }

  san = san.replace(/([a-h][1-8])([QRBN])$/u, '$1=$2');

  return `${san}${suffix}`;
}

export function uciToDisplaySan(fen: string, uci: string): string {
  if (!uci || uci.length < 4) {
    return normalizeSanForDisplay(uci);
  }

  const chess = createChessFromFen(fen);
  const move = chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: (uci[4] as 'q' | 'r' | 'b' | 'n' | undefined) ?? undefined,
  });

  return normalizeSanForDisplay(move?.san ?? uci);
}