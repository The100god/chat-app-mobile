// Shared types for Together Room infrastructure

export type TogetherRoomType = "game" | "watch" | "music" | "quiz" | "activity";

export type TogetherGameId =
  | "tictactoe"
  | "rps"
  | "connect4"
  | "memory"
  | "drawing"
  | "quiz"
  | "catchpartner";

export interface CatchPartnerPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  role: "catcher" | "runner";
  speedBoostTime?: number;
  isBoosting?: boolean;
}

export interface CatchPartnerObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type?: "pillar" | "wall" | "box";
}

export interface CatchPartnerPowerUp {
  id: string;
  x: number;
  y: number;
  type: "speed" | "shield";
}

export interface CatchPartnerState {
  status: "waiting" | "setup" | "playing" | "round_ended" | "finished";
  players: Record<string, CatchPartnerPlayer>;
  roles: {
    catcher: string | null;
    runner: string | null;
  };
  round: number;
  maxRounds: number;
  timer: number;
  scores: Record<string, number>;
  winner: string | null;
  roundResult?: {
    winnerId: string | null;
    reason: string;
  } | null;
  obstacles: CatchPartnerObstacle[];
  powerUps?: CatchPartnerPowerUp[];
  comments?: TicTacToeComment[];
}

export interface GameStats {
  wins: number;
  losses: number;
  ties: number;
  total: number;
}

export interface TicTacToeComment {
  id: string;
  senderId?: string;
  userId?: string;
  username?: string;
  text: string;
  timestamp: number;
}

export interface TicTacToeState {
  board: Array<"X" | "O" | null>;
  players: { X: string | null; O: string | null };
  currentTurn: "X" | "O";
  winner: "X" | "O" | null;
  winningLine: number[] | null;
  isDraw: boolean;
  status: "waiting" | "setup" | "playing" | "finished";
  comments?: TicTacToeComment[];
}

export interface RPSState {
  playerChoices: Record<string, "rock" | "paper" | "scissors" | null>;
  scores: Record<string, number>;
  round: number;
  status: "waiting" | "setup" | "playing" | "round_ended" | "finished";
  roundResult?: {
    winnerId: string | null;
    isDraw: boolean;
    reason?: string;
  };
  comments?: TicTacToeComment[];
}

export interface Connect4State {
  board: Array<Array<"R" | "Y" | null>>; // 6 rows x 7 cols
  players: { R: string | null; Y: string | null };
  currentTurn: "R" | "Y";
  winner: "R" | "Y" | null;
  winningLine: Array<[number, number]> | null;
  isDraw: boolean;
  status: "waiting" | "setup" | "playing" | "finished";
  comments?: TicTacToeComment[];
}

export interface MemoryCard {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface MemoryMatchState {
  cards: MemoryCard[];
  players: string[];
  scores: Record<string, number>;
  currentTurn: string | null;
  flippedCards: number[]; // Indices of currently flipped cards
  winner: string | null;
  isDraw: boolean;
  status: "waiting" | "setup" | "playing" | "finished";
  comments?: TicTacToeComment[];
}

export interface DrawingElement {
  id: string;
  type: "stroke" | "block";
  color: string;
  points?: Array<{ x: number; y: number }>;
  x?: number;
  y?: number;
  xPct?: number;
  yPct?: number;
  size?: number;
  icon?: string;
  userId: string;
}

export interface MindMatchChoice {
  userId: string;
  icon?: string;
  color?: string;
  text?: string;
  submittedAt: number;
}

export interface DrawingState {
  mode?: "live" | "mind_match";
  elements: DrawingElement[];
  secretElements?: Record<string, DrawingElement[]>;
  secretSubmitted?: Record<string, boolean>;
  secretRevealed?: boolean;
  status: "active" | "guess_mode" | "guess_revealed";
  comments?: TicTacToeComment[];
  mindMatchChoices?: Record<string, MindMatchChoice>;
  matchResult?: {
    isMatch: boolean;
    trustScore: number;
    choice1?: MindMatchChoice;
    choice2?: MindMatchChoice;
  } | null;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  audioData?: string | null;
  askerId?: string | null;
}

export interface QuizState {
  mode?: "couple" | "custom_duel";
  currentQuestionIndex: number;
  questions: QuizQuestion[];
  answers: Record<string, Record<number, number>>; // userId -> questionIndex -> optionIndex
  scores: Record<string, number>;
  status: "waiting" | "setup" | "playing" | "question_ended" | "reveal" | "finished";
  winner: string | null;
  askerId?: string | null;
  timer?: number;
  submitted?: Record<string, boolean>;
  revealData?: {
    player1Choice: { userId: string; optionIndex: number; optionText: string } | null;
    player2Choice: { userId: string; optionIndex: number; optionText: string } | null;
    isMatch: boolean;
    pointsAwarded: number;
  } | null;
  comments?: TicTacToeComment[];
}

export type TogetherActivityId =
  | "would_you_rather"
  | "truth_or_dare"
  | "this_or_that"
  | "daily_question"
  | "couple_questions";

export interface ActivityPrompt {
  id: number;
  prompt: string;
  category?: string;
  options?: string[];
  truthOrDare?: "truth" | "dare";
}

export interface ActivityState {
  activityId: TogetherActivityId;
  category?: "fun" | "memories" | "preferences" | "future" | "random";
  currentPromptIndex: number;
  prompt?: string;
  options?: string[];
  answers: Record<string, string | number>;
  status: "answering" | "revealed" | "turn_select";
  turnUserId?: string | null;
  truthOrDareChoice?: "truth" | "dare" | null;
  customPromptText?: string | null;
  customAudioUrl?: string | null;
  questionSubmitted?: boolean;
  todAnswerText?: string | null;
  todAnswerAudioUrl?: string | null;
  comments?: TicTacToeComment[];
}

export interface WatchRoomState {
  mediaUrl: string | null;
  mediaTitle: string | null;
  playing: boolean;
  position: number;
  updatedAt: number;
  hostId: string;
  comments?: TicTacToeComment[];
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration?: number;
  addedBy: string;
}

export interface MusicRoomState {
  queue: MusicTrack[];
  currentTrackIndex: number;
  playing: boolean;
  position: number;
  updatedAt: number;
  comments?: TicTacToeComment[];
}

export interface TogetherRoom {
  roomId: string;
  type: TogetherRoomType;
  gameId?: TogetherGameId;
  activityId?: TogetherActivityId;
  hostId: string;
  participants: string[];
  state: {
    ticTacToe?: TicTacToeState;
    rps?: RPSState;
    connect4?: Connect4State;
    memoryMatch?: MemoryMatchState;
    drawing?: DrawingState;
    quiz?: QuizState;
    catchPartner?: CatchPartnerState;
    activity?: ActivityState;
    watch?: WatchRoomState;
    music?: MusicRoomState;
    [key: string]: unknown;
  };
  sessionStats?: Record<string, GameStats>;
  createdAt: number;
}

export interface TogetherInvite {
  roomId: string;
  roomType: string;
  gameId?: TogetherGameId;
  hostId: string;
  hostUsername: string;
  hostProfilePic?: string;
  createdAt: number;
}
