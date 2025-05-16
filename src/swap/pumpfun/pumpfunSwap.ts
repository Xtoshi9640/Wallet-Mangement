import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  WSOL,
  GLOBAL,
  BUY_BUFFER,
  SELL_BUFFER,
  GLOBAL_CONFIG,
  TOKEN_PROGRAM,
  EVENT_AUTHORITY,
  PUMP_FUN_PROGRAM,
  PUMP_AMM_PROGRAM,
  PUMP_FEE_RECIPIENT,
  PROTOCOL_FEE_RECEPCIENT,
  EVENT_AUTHORITY_PUMPSWAP,
  PROTOCOL_FEE_RECEPCIENT_TOKEN_ACCOUNT,
} from "../../utils/constants";
import * as spl from "@solana/spl-token";
import { SwapParam } from "../../utils/types";
import { bufferFromUInt64 } from "../../utils/utils";
import { connection, wallet } from "../../config/config";
import {
  TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@raydium-io/raydium-sdk";
import { getPumpAmmData } from "./utils";

export const pumpfunSwap = async (
  swapParam: SwapParam
): Promise<VersionedTransaction | null> => {
  try {

    //----------------------- initialize -------------------------
    const { mint, dev, amount, slippage, is_buy, pumpData } = swapParam;
    let instructions: TransactionInstruction[] = [];
    let data: Buffer;
    let tokenOut = 0;
    let minSolOutput = 0;
    let maxSolCost = 0;

    const slippageValue = slippage / 100;
    const fixedInputAmount = amount;
    const amountInLamports = is_buy
      ? Math.floor(fixedInputAmount * LAMPORTS_PER_SOL)
      : Math.floor(fixedInputAmount);

    const splAta = spl.getAssociatedTokenAddressSync(
      new PublicKey(mint),
      wallet.publicKey,
      true
    );

    //----------------------- temp function -------------------------

    const getSwapBufferArray = (token: number, sol: number) => {
      if (is_buy) {
        // Calculate expected token output based on fixed input amount
        tokenOut = Math.floor((amountInLamports * token) / sol);
        const solInWithSlippage = fixedInputAmount * (1 + slippageValue);
        maxSolCost = Math.floor(solInWithSlippage * LAMPORTS_PER_SOL);

        data = Buffer.concat([
          BUY_BUFFER,
          bufferFromUInt64(tokenOut),
          bufferFromUInt64(maxSolCost),
        ]);
      } else {
        minSolOutput = Math.floor( (amountInLamports * (1 - slippageValue) * sol) / token);
        data = Buffer.concat([
          SELL_BUFFER,
          bufferFromUInt64(amountInLamports),
          bufferFromUInt64(minSolOutput),
        ]);
      }
      return data;
    }

    const createAtaIns = (userBaseTokenAccount: PublicKey, isWSOL: boolean) => {
      return spl.createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        userBaseTokenAccount,
        wallet.publicKey,
        isWSOL ? WSOL : new PublicKey(mint)
      )
    }

    //----------------------- build instruction -------------------------

    if (Number(pumpData.virtualSolReserves) * Number(pumpData.virtualTokenReserves) == 0) {
      // pump amm swap
      // console.log("Pump AMM Swap");
      const pumpAmmData = await getPumpAmmData(mint);
      if (!pumpAmmData) return null;
      const {
        dev,
        pool,
        poolBaseTokenAccount,
        poolBaseTokenReserves,
        poolQuoteTokenAccount,
        poolQuoteTokenReserves,
      } = pumpAmmData;

      const userBaseTokenAccount = spl.getAssociatedTokenAddressSync(
        new PublicKey(mint), // base token mint
        wallet.publicKey, // owner (user's wallet)
        true // allow owner off curve
      );

      const userQuoteTokenAccount = spl.getAssociatedTokenAddressSync(
        WSOL, // quote token mint (WSOL)
        wallet.publicKey, // owner (user's wallet)
        true // allow owner off curve
      );

      const pool_base_token_account = poolBaseTokenAccount;

      const pool_quote_token_account = poolQuoteTokenAccount;

      const [coinCreatorVaultAuthority] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("creator_vault"), // seed from IDL
          new PublicKey(dev).toBuffer(), // coin_creator from pool
        ],
        PUMP_AMM_PROGRAM
      );

      const coinCreatorVaultAta = spl.getAssociatedTokenAddressSync(
        WSOL, // WSOL mint
        coinCreatorVaultAuthority, // owner (the PDA we just derived)
        true // allow owner off curve
      );

      const keys = [
        { pubkey: pool, isSigner: false, isWritable: false },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: GLOBAL_CONFIG, isSigner: false, isWritable: false },
        { pubkey: new PublicKey(mint), isSigner: false, isWritable: false },
        { pubkey: WSOL, isSigner: false, isWritable: false },
        { pubkey: userBaseTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userQuoteTokenAccount, isSigner: false, isWritable: true },
        { pubkey: pool_base_token_account, isSigner: false, isWritable: true },
        { pubkey: pool_quote_token_account, isSigner: false, isWritable: true },
        { pubkey: PROTOCOL_FEE_RECEPCIENT, isSigner: false, isWritable: false },
        { pubkey: PROTOCOL_FEE_RECEPCIENT_TOKEN_ACCOUNT, isSigner: false, isWritable: true, },
        { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: EVENT_AUTHORITY_PUMPSWAP, isSigner: false, isWritable: false },
        { pubkey: PUMP_AMM_PROGRAM, isSigner: false, isWritable: false },
        { pubkey: coinCreatorVaultAta, isSigner: false, isWritable: true },
        { pubkey: coinCreatorVaultAuthority, isSigner: false, isWritable: false },
      ];

      data = getSwapBufferArray(Number(poolBaseTokenReserves), Number(poolQuoteTokenReserves));

      const pumpInstruction = new TransactionInstruction({
        keys,
        programId: PUMP_AMM_PROGRAM,
        data,
      });

      instructions = is_buy
        ? [
            createAtaIns(userBaseTokenAccount, false),
            createAtaIns(userQuoteTokenAccount, true),
            SystemProgram.transfer({
              fromPubkey: wallet.publicKey,
              toPubkey: userQuoteTokenAccount,
              lamports: maxSolCost,
            }),
            spl.createSyncNativeInstruction(userQuoteTokenAccount),
            pumpInstruction,
            spl.createCloseAccountInstruction(
              userQuoteTokenAccount,
              wallet.publicKey,
              wallet.publicKey
            ),
          ]
        : [
            createAtaIns(userQuoteTokenAccount, true),
            pumpInstruction,
            spl.createCloseAccountInstruction(
              userQuoteTokenAccount,
              wallet.publicKey,
              wallet.publicKey
            ),
          ];
    } else {
      // pump fun swap
      // console.log("Pump Fun swap");
      const CREATOR_FEE_VAULT = PublicKey.findProgramAddressSync(
        [Buffer.from("creator-vault"), new PublicKey(dev).toBuffer()],
        PUMP_FUN_PROGRAM
      )[0];

      const keys = [
        { pubkey: GLOBAL, isSigner: false, isWritable: false },
        { pubkey: PUMP_FEE_RECIPIENT, isSigner: false, isWritable: true },
        { pubkey: new PublicKey(mint), isSigner: false, isWritable: false },
        { pubkey: pumpData.bondingCurve, isSigner: false, isWritable: true, },
        { pubkey: pumpData.associatedBondingCurve, isSigner: false, isWritable: true, },
        { pubkey: splAta, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: false, isWritable: true },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: is_buy ? TOKEN_PROGRAM_ID : CREATOR_FEE_VAULT, isSigner: false, isWritable: true, },
        { pubkey: is_buy ? CREATOR_FEE_VAULT : TOKEN_PROGRAM_ID, isSigner: false, isWritable: true, },
        { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
        { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
      ];

      data = getSwapBufferArray(Number(pumpData.virtualTokenReserves), Number(pumpData.virtualSolReserves));

      const pumpInstruction = new TransactionInstruction({
        keys,
        programId: PUMP_FUN_PROGRAM,
        data,
      });

      instructions = [
        createAtaIns(splAta, false),
        pumpInstruction,
      ]
    }

    //----------------------- priority fee -------------------------

    // Add both computeUnitLimit and computeUnitPrice for priority fees 
    const priorityFee = 200_000;
    const computeUnitPriceInstruction =
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFee, // Set the priority fee (in micro-lamports)
      });

    const computeUnitLimitInstruction =
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 150_000, // Set an appropriate compute unit limit
      });

    instructions.unshift(
      computeUnitPriceInstruction,
      computeUnitLimitInstruction
    );

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

