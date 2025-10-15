export enum GamePhase {
  Betting = 'BETTING', // 下注阶段 (15秒)
  Waiting = 'WAITING', // 等待阶段 (5秒)
  Settling = 'SETTLING', // 结算阶段 (3秒)
}

export enum BetDirection {
  UP = 'UP',
  DOWN = 'DOWN',
}

export enum GameResult {
  UP_WIN = 'UP_WIN',
  DOWN_WIN = 'DOWN_WIN',
  DRAW = 'DRAW', // 平局，平台获胜
}

export interface Bet {
  userId: string;
  direction: BetDirection;
  amount: number; // USDT 金额
  timestamp: number;
  gameRoundId: string;
}

export interface BettingPool {
  upBets: Bet[];
  downBets: Bet[];
  upTotal: number;
  downTotal: number;
  totalPool: number;
}

export interface GameRound {
  id: string;
  phase: GamePhase;
  startTime: number;
  bettingEndTime: number;
  waitingEndTime: number;
  settleEndTime: number;
  lockedPrice: string | null;
  closedPrice: string | null;
  result: GameResult | null;
  bettingPool: BettingPool;
  phaseStartTime: number;
  phaseRemainingTime: number;
}

export interface BettingResult {
  userId: string;
  betDirection: BetDirection;
  betAmount: number;
  isWinner: boolean;
  payout: number;
  multiplier: number;
}

export interface GameStatus {
  currentRound: GameRound | null;
  isActive: boolean;
  platformFee: number; // 3% 手续费
  minBetAmount: number; // 最低投注 1 USDT
}

export interface BetRequest {
  userId: string;
  direction: BetDirection;
  amount: number;
}

export interface GameConfig {
  bettingDuration: number; // 下注阶段时长 (毫秒)
  waitingDuration: number; // 等待阶段时长 (毫秒)
  settlingDuration: number; // 结算阶段时长 (毫秒)
  platformFee: number; // 平台手续费比例 (0.03 = 3%)
  minBetAmount: number; // 最低投注金额 (USDT)
  supportedAssets: string[]; // 支持的资产
}
