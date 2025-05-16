import {
  u64,
  bool,
  struct,
  publicKey,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";
import { PumpData } from "../../utils/types";
import { connection } from "../../config/config";
import { PUMP_FUN_PROGRAM } from "../../utils/constants";

export async function getPumpData(mint: string): Promise<PumpData | null> {
  const pumpData = await getPumpDataUtils(new PublicKey(mint));
  return pumpData;
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
  const data = await connection.getAccountInfo(new PublicKey(bondingCurve));
  
  if (!data) return null;
  const structure = struct([
    u64("discriminator"),
    u64("virtualTokenReserves"),
    u64("virtualSolReserves"),
    u64("realTokenReserves"),
    u64("realSolReserves"),
    u64("tokenTotalSupply"),
    bool("complete"),
    publicKey("creator"),
  ]);
  const decoded = structure.decode(data.data);

  return {
    dev: decoded.creator.toString(),
    bondingCurve,
    associatedBondingCurve,
    virtualSolReserves: decoded.virtualSolReserves,
    virtualTokenReserves: decoded.virtualTokenReserves,
  };
}
