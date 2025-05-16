import {
  u8,
  u16,
  u64,
  bool,
  struct,
  publicKey,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";
import { IPumpAmmData, PumpData } from "../../utils/types";
import { connection } from "../../config/config";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";

import { PUMP_AMM_PROGRAM, PUMP_FUN_PROGRAM } from "../../utils/constants";
import { NATIVE_MINT } from "@solana/spl-token";

export async function getPumpData(mint: string): Promise<PumpData | null> {
  const mint_key = new PublicKey(mint);
  const mint_buffer = mint_key.toBuffer();
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint_buffer],
    PUMP_FUN_PROGRAM
  );
  const [associatedBondingCurve] = PublicKey.findProgramAddressSync(
    [bondingCurve.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint_buffer],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const accountInfo = await connection.getAccountInfo(
    new PublicKey(bondingCurve)
  );

  if (!accountInfo) return null;
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
  const decoded = structure.decode(accountInfo.data);

  return {
    dev: decoded.creator.toString(),
    bondingCurve,
    associatedBondingCurve,
    virtualSolReserves: decoded.virtualSolReserves,
    virtualTokenReserves: decoded.virtualTokenReserves,
  };
}

function poolPda(
  index: number,
  owner: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  programId: PublicKey = PUMP_AMM_PROGRAM
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      new BN(index).toArrayLike(Buffer, "le", 2),
      owner.toBuffer(),
      baseMint.toBuffer(),
      quoteMint.toBuffer(),
    ],
    programId
  );
}

function pumpPoolAuthorityPda(
  mint: PublicKey,
  pumpProgramId: PublicKey = PUMP_FUN_PROGRAM
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool-authority"), mint.toBuffer()],
    pumpProgramId
  );
}

function canonicalPumpPoolPda(
  mint: PublicKey,
  programId: PublicKey = PUMP_AMM_PROGRAM,
  pumpProgramId: PublicKey = PUMP_FUN_PROGRAM
): [PublicKey, number] {
  const [pumpPoolAuthority] = pumpPoolAuthorityPda(mint, pumpProgramId);

  return poolPda(
    0, //CANONICAL_POOL_INDEX,
    pumpPoolAuthority,
    mint,
    NATIVE_MINT,
    programId
  );
}

export async function getPumpAmmData(
  mint: string
): Promise<IPumpAmmData | null> {
  const pool = canonicalPumpPoolPda(new PublicKey(mint))[0];
  const accountInfo = await connection.getAccountInfo(pool);
  if (!accountInfo) return null;

  const poolStructure = struct([
    u8("poolBump"),
    u16("index"),
    publicKey("creator"),
    publicKey("baseMint"),
    publicKey("quoteMint"),
    publicKey("lpMint"),
    publicKey("poolBaseTokenAccount"),
    publicKey("poolQuoteTokenAccount"),
    u64("lpSupply"),
    publicKey("coinCreator"),
  ]);

  const dataWithoutDiscriminator = accountInfo.data.slice(8);

  // Then decode using your struct
  const decoded = poolStructure.decode(dataWithoutDiscriminator);

  const [baseTokenBalance, quoteTokenBalance] = await Promise.all([
    connection.getTokenAccountBalance(decoded.poolBaseTokenAccount),
    connection.getTokenAccountBalance(decoded.poolQuoteTokenAccount)
  ]);
  
  const poolBaseTokenReserves = Number(baseTokenBalance.value.amount);
  const poolQuoteTokenReserves = Number(quoteTokenBalance.value.amount);

  return {
    dev: decoded.coinCreator.toString(),
    pool,
    poolBaseTokenAccount: decoded.poolBaseTokenAccount,
    poolBaseTokenReserves,
    poolQuoteTokenAccount: decoded.poolQuoteTokenAccount,
    poolQuoteTokenReserves,
  };
}
