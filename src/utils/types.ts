import { PublicKey } from "@solana/web3.js";

export interface ISwapHashResponse {
  txHash: string | null;
  price: number;
  inAmount: number;
  outAmount: number;
}

export type SwapParam = {
  mint: string;
  dev: string;
  amount: number; // no decimals
  slippage: number; // 0.1 ~ 100
  is_buy: boolean;
  isSellAll: boolean;
  pumpData: {
    bondingCurve: PublicKey,
    associatedBondingCurve: PublicKey,
    virtualSolReserves: number,
    virtualTokenReserves: number,
  },
};

export type PumpData = {
  dev: string,
  bondingCurve: PublicKey,
  associatedBondingCurve: PublicKey,
  virtualSolReserves: number,
  virtualTokenReserves: number,
};

export type IPumpAmmData = {
  dev: string,
  pool: PublicKey,
  poolBaseTokenAccount: PublicKey,
  poolBaseTokenReserves: number,
  poolQuoteTokenAccount: PublicKey,
  poolQuoteTokenReserves: number
}