import { PublicKey } from "@solana/web3.js";

export interface ISwapHashResponse {
  txHash: string | null;
  price: number;
  inAmount: number;
  outAmount: number;
}

export type SwapParam = {
  mint: string;
  amount: number; // no decimals
  tip: number; // no decimals
  slippage: number; // 0.1 ~ 100
  is_buy: boolean;
  isSellAll?: boolean;
  pumpData?: {
    price: number,
    bondingCurve: PublicKey,
    associatedBondingCurve: PublicKey,
    virtualSolReserves: number,
    virtualTokenReserves: number,
  },
};

export type BuyInsParam = {
  mint: PublicKey;
  owner: PublicKey;
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
  maxSol: number;
  splOut: number;
};

export type PumpData = {
  price: number,
  bondingCurve: PublicKey,
  associatedBondingCurve: PublicKey,
  virtualSolReserves: number,
  virtualTokenReserves: number,
};