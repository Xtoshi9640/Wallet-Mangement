import {
  PublicKey,
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  GLOBAL,
  BUY_BUFFER,
  SELL_BUFFER,
  EVENT_AUTHORITY,
  PUMP_FEE_RECIPIENT,
  PUMP_FUN_PROGRAM,
} from "../../utils/constants";
import * as spl from "@solana/spl-token";
import { SwapParam } from "../../utils/types";
import { bufferFromUInt64 } from "../../utils/utils";
import { connection, wallet } from "../../config/config";
import { TOKEN_PROGRAM_ID, SYSTEM_PROGRAM_ID } from "@raydium-io/raydium-sdk";

export const pumpfunSwap = async (
  swapParam: SwapParam
): Promise<VersionedTransaction | null> => {
  try {
    const { mint, dev, amount, slippage, is_buy, pumpData } = swapParam;

    const PROGRAM_ID = PUMP_FUN_PROGRAM;

    const slippageValue = slippage / 100;

    // Ensure fixed input amount by using exact amount in lamports
    const fixedInputAmount = amount;
    const amountInLamports = is_buy
      ? Math.floor(fixedInputAmount * LAMPORTS_PER_SOL)
      : Math.floor(fixedInputAmount);

    const splAta = spl.getAssociatedTokenAddressSync(
      new PublicKey(mint),
      wallet.publicKey,
      true
    );
    const CREATOR_FEE_VAULT = PublicKey.findProgramAddressSync(
      [Buffer.from("creator-vault"), new PublicKey(dev).toBuffer()],
      PROGRAM_ID
    )[0];

    const keys = [
      { pubkey: GLOBAL, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: new PublicKey(mint), isSigner: false, isWritable: false },
      { pubkey: pumpData?.bondingCurve, isSigner: false, isWritable: true },
      {
        pubkey: pumpData?.associatedBondingCurve,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: splAta, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: is_buy ? TOKEN_PROGRAM_ID : CREATOR_FEE_VAULT,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: is_buy ? CREATOR_FEE_VAULT : TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    let data: Buffer;
    let tokenOut;
    let minSolOutput;
    if (is_buy) {
      // Calculate expected token output based on fixed input amount
      tokenOut = Math.floor(
        (amountInLamports * pumpData.virtualTokenReserves) /
          pumpData.virtualSolReserves
      );
      const solInWithSlippage = fixedInputAmount * (1 + slippageValue);
      const maxSolCost = Math.floor(solInWithSlippage * LAMPORTS_PER_SOL);

      data = Buffer.concat([
        BUY_BUFFER,
        bufferFromUInt64(tokenOut),
        bufferFromUInt64(maxSolCost),
      ]);
    } else {
      minSolOutput = Math.floor(
        (amountInLamports * (1 - slippageValue) * pumpData.virtualSolReserves) /
          pumpData.virtualTokenReserves
      );
      data = Buffer.concat([
        SELL_BUFFER,
        bufferFromUInt64(amountInLamports),
        bufferFromUInt64(minSolOutput),
      ]);
    }

    const pumpInstruction = new TransactionInstruction({
      keys,
      programId: PROGRAM_ID,
      data,
    });

    const instructions: TransactionInstruction[] = is_buy
      ? [
          spl.createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey,
            splAta,
            wallet.publicKey,
            new PublicKey(mint)
          ),
          pumpInstruction,
        ]
      : [
          spl.createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey,
            splAta,
            wallet.publicKey,
            new PublicKey(mint)
          ),
          pumpInstruction,
        ];

    //----------------------- priority fee -------------------------

    // Add both computeUnitLimit and computeUnitPrice for priority fees
    // const priorityFee = is_buy ? 100_000 : 20_000;
    // const computeUnitPriceInstruction =
    //   ComputeBudgetProgram.setComputeUnitPrice({
    //     microLamports: priorityFee, // Set the priority fee (in micro-lamports)
    //   });

    // const computeUnitLimitInstruction =
    //   ComputeBudgetProgram.setComputeUnitLimit({
    //     units: 100_000, // Set an appropriate compute unit limit
    //   });

    // // Add compute budget instructions at the beginning of the transaction
    // instructions.unshift(
    //   computeUnitPriceInstruction,
    //   computeUnitLimitInstruction
    // );

    //----------------------- ata close -------------------------
    if (swapParam.isSellAll)
      instructions.push(
        spl.createCloseAccountInstruction(
          splAta,
          wallet.publicKey,
          wallet.publicKey
        )
      );

    //----------------------- versioned txn -------------------------
    const { blockhash } = await connection.getLatestBlockhash();

    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
  } catch (error) {
    console.log("[ pumpswap ]", error);
    return null;
  }
};
