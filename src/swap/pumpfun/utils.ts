import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";
import { PumpData } from "../../utils/types";
import { connection } from "../../config/config";
import { readBigUintLE } from "../../utils/utils";
import { PUMP_FUN_PROGRAM } from "../../utils/constants";

export async function getPumpData(
  mint: string
): Promise<PumpData | null> {
  const pumpData = await getPumpDataUtils(new PublicKey(mint));
  return pumpData
}

export async function getPumpDataUtils(
  mint: PublicKey
): Promise<PumpData | null> {
  const mint_account = mint.toBuffer();
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint_account],
    PUMP_FUN_PROGRAM
  );
  const [associatedBondingCurve] = PublicKey.findProgramAddressSync(
    [bondingCurve.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const PUMP_CURVE_STATE_OFFSETS = {
    VIRTUAL_TOKEN_RESERVES: 0x08,
    VIRTUAL_SOL_RESERVES: 0x10,
    REAL_TOKEN_RESERVES: 0x18,
    REAL_SOL_RESERVES: 0x20,
    TOTAL_SUPPLY: 0x28,
  };
  const response = await connection.getAccountInfo(bondingCurve);
  if (!response) return null;
  
  // Use BigInt to read the big numbers in the data buffer
  const virtualTokenReserves = readBigUintLE(
    response.data,
    PUMP_CURVE_STATE_OFFSETS.VIRTUAL_TOKEN_RESERVES,
    8
  );
  const virtualSolReserves = readBigUintLE(
    response.data,
    PUMP_CURVE_STATE_OFFSETS.VIRTUAL_SOL_RESERVES,
    8
  );
  const realTokenReserves = readBigUintLE(
    response.data,
    PUMP_CURVE_STATE_OFFSETS.REAL_TOKEN_RESERVES,
    8
  );
  const realSolReserves = readBigUintLE(
    response.data,
    PUMP_CURVE_STATE_OFFSETS.REAL_SOL_RESERVES,
    8
  );
  const totalSupply = readBigUintLE(
    response.data,
    PUMP_CURVE_STATE_OFFSETS.TOTAL_SUPPLY,
    8
  );

  const leftTokens = realTokenReserves - 206900000;
  const initialRealTokenReserves = totalSupply - 206900000;
  const progress = 100 - (leftTokens * 100) / initialRealTokenReserves;
  if (virtualSolReserves === 0 || virtualTokenReserves === 0) {
    return null;
  }
  const price = 0;
  return {
    price,
    bondingCurve,
    associatedBondingCurve,
    virtualSolReserves,
    virtualTokenReserves,
  };
}
