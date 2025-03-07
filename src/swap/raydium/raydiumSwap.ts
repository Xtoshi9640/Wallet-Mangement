import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  Token,
  Percent,
  Liquidity,
  TokenAmount,
  LiquidityPoolKeys,
  jsonInfo2PoolKeys,
} from "@raydium-io/raydium-sdk";
import { JitoAccounts } from "../jito/jito";
import { formatAmmKeysById } from "./formatAmmByKeyId";
import { fetchPoolInfoByMint } from "./utils";
import { SwapParam } from "../../utils/types";
import { getWalletTokenAccount } from "../../utils/utils";
import { getLastValidBlockhash } from "../../utils/getBlock";
import { metaplex, wallet, connection } from "../../config/config";

export const WSOL_TOKEN = new Token(
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  9,
  "WSOL",
  "WSOL"
);
export const raydiumSwap = async (
  swapParam: SwapParam
): Promise<VersionedTransaction | null> => {
  try {
    const { mint, amount, slippage, tip, is_buy } = swapParam;
    console.log("raydiumSwap", mint, amount, slippage, tip, is_buy);
    const slippageP = new Percent(slippage, 100);

    const metaData = await metaplex
      .nfts()
      .findByMint({ mintAddress: new PublicKey(mint) });
    const decimals = metaData.mint.decimals || 6;

    const MINT_TOKEN = new Token(TOKEN_PROGRAM_ID, mint, decimals);
    const inputToken = is_buy ? WSOL_TOKEN : MINT_TOKEN;
    const outputToken = is_buy ? MINT_TOKEN : WSOL_TOKEN;
    const inDecimal = is_buy ? 9 : decimals;
    const inAmount = Math.floor(amount);
    const inputTokenAmount = new TokenAmount(inputToken, inAmount);
    // -------- pre-action: get pool info --------
    let poolKeys;
    const poolId = await fetchPoolInfoByMint(mint);
    if (!poolId) {
      return null;
    }
    const targetPoolInfo = await formatAmmKeysById(poolId);
    if (!targetPoolInfo) {
      return null;
    }
    poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;
    const { amountOut, minAmountOut, currentPrice } =
      Liquidity.computeAmountOut({
        poolKeys: poolKeys,
        poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
        amountIn: inputTokenAmount,
        currencyOut: outputToken,
        slippage: slippageP,
      });
    console.log("raydiumSwap", inAmount);

    let price = 0;
    const decimalsDiff =
      currentPrice.baseCurrency.decimals - currentPrice.quoteCurrency.decimals;
    if ((currentPrice.baseCurrency as Token).mint.equals(NATIVE_MINT)) {
      price =
        Number(currentPrice.denominator) /
        Number(currentPrice.numerator) /
        10 ** decimalsDiff;
    } else {
      price =
        (Number(currentPrice.numerator) / Number(currentPrice.denominator)) *
        10 ** decimalsDiff;
    }
    // -------- step 2: create instructions by SDK function --------
    const walletTokenAccounts = await getWalletTokenAccount();
    const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
      connection,
      poolKeys,
      userKeys: {
        tokenAccounts: walletTokenAccounts,
        owner: wallet.publicKey,
      },
      amountIn: inputTokenAmount,
      amountOut: minAmountOut,
      fixedSide: "in",
      makeTxVersion: 0,
    });

    const feeInstructions = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(JitoAccounts[0]),
      lamports: tip * LAMPORTS_PER_SOL,
    });
    const instructions: TransactionInstruction[] = [];
    instructions.push(
      ...innerTransactions.flatMap((tx: any) => tx.instructions),
      feeInstructions
    );
    if (swapParam.isSellAll) {
      const splAta = getAssociatedTokenAddressSync(
        new PublicKey(mint),
        wallet.publicKey,
        true
      );
      instructions.push(
        createCloseAccountInstruction(
          splAta,
          wallet.publicKey,
          wallet.publicKey
        )
      );
    }

    const blockhash = await getLastValidBlockhash();
    if (!blockhash) {
      console.error("Failed to retrieve blockhash from cache");
      throw new Error("Failed to retrieve blockhash from cache");
    }
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    console.log("made a raydium swap txn", mint);

    return new VersionedTransaction(messageV0);
  } catch (error) {
    console.log("error in raydium swap", error);
    return null;
  }
};
