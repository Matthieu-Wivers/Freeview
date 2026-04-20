export type ChessColor = 'w' | 'b';

export type ReviewCategory =
  | 'theory'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'miss'
  | 'mistake'
  | 'blunder';

export interface GameHeaders {
  Event?: string;
  Site?: string;
  Date?: string;
  Round?: string;
  White?: string;
  Black?: string;
  Result?: string;
  TimeControl?: string;
  WhiteElo?: string;
  BlackElo?: string;
  Termination?: string;
  Link?: string;
  SetUp?: string;
  FEN?: string;
  [key: string]: string | undefined;
}

export interface ParsedMove {
  ply: number;
  moveNumber: number;
  color: ChessColor;
  san: string;
  from: string;
  to: string;
  uci: string;
  piece: string;
  captured?: string;
  promotion?: string;
  fenBefore: string;
  fenAfter: string;
}

export interface ParsedGame {
  headers: GameHeaders;
  moves: ParsedMove[];
  startFen: string;
}

export interface CandidateMove {
  san: string;
  uci: string;
  from: string;
  to: string;
  scoreWhite: number;
}

export interface MoveReview {
  ply: number;
  playedSan: string;
  playedUci: string;
  bestSan: string;
  bestUci: string;
  scoreBefore: number;
  scoreAfter: number;
  bestScoreWhite: number;
  actualScoreWhite: number;
  loss: number;
  category: ReviewCategory;
  label: string;
  comment: string;
  accuracy: number;
  suggestions: CandidateMove[];
}

export interface GameReview {
  moveReviews: MoveReview[];
  accuracyWhite: number;
  accuracyBlack: number;
  averageLossWhite: number;
  averageLossBlack: number;
  evaluations: number[];
  finalEvaluation: number;
}

export interface SandboxFeedback {
  san: string;
  uci: string;
  bestSan: string;
  bestUci: string;
  loss: number;
  category: ReviewCategory;
  comment: string;
  accuracy: number;
}