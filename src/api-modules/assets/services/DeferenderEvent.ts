import { TransactionReceipt } from 'ethers';

export interface MatchReason {
  type: 'event';
  signature: string;
  address: string;
  args: string[];
  params: Record<string, string>;
}

export interface DefenderEvent {
  hash: string;
  transaction: TransactionReceipt;
  blockHash: string;
  matchReasons: MatchReason[];
  sentinel: {
    chainId: number;
  };
  value: string;
}

export type DefenderEvents = DefenderEvent[];
