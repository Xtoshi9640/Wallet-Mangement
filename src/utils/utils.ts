import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { connection, wallet } from "../config/config";
import { AccountLayout,  getAssociatedTokenAddressSync,  TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SPL_ACCOUNT_LAYOUT, TokenAccount } from "@raydium-io/raydium-sdk";
import { WSOL } from "./constants";

export async function simulateTxn(txn: VersionedTransaction) {
  const { value: simulatedTransactionResponse } =
    await connection.simulateTransaction(txn, {
      replaceRecentBlockhash: true,
      commitment: "processed",
    });
  const { err, logs } = simulatedTransactionResponse;
  // console.log("\n🚀 Simulate ~", Date.now());
  if (err) {
    console.error("* Simulation Error:", err, logs);
    throw new Error(
      "Simulation txn. Please check your wallet balance and slippage." +
        err +
        logs
    );
  }
}


export async function getWalletTokens(walletAddress: PublicKey) {
  const tokenAccounts = await connection.getTokenAccountsByOwner(
    walletAddress,
    { programId: TOKEN_PROGRAM_ID }
  );

  const tokens = tokenAccounts.value.map((ta) => {
    const accountData = AccountLayout.decode(ta.account.data);
    return {
      mint: accountData.mint.toBase58(),
      amount: Number(accountData.amount),
    };
  });
  return tokens;
}

/*
│ (index) │ mint                                           │ amount     │
├─────────┼────────────────────────────────────────────────┼────────────┤
│ 0       │ 'D3cyNBRdYpKwbXUjaf37v7sDC3sRBxgy1rpyek5qpump' │ 357.666547 │
│ 1       │ '4QFtsuiTQHug2b5ZxsTUUrn1N1nf63s1j2157oeypump' │ 357.666547 │
*/


export async function sleepTime(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getWalletTokenAccount(): Promise<TokenAccount[]> {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(
    wallet.publicKey,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );
  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
}

export function bufferFromUInt64(value: number | string) {
  let buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}


export function readBigUintLE(
  buf: Buffer,
  offset: number,
  length: number
): number {
  switch (length) {
    case 1:
      return buf.readUint8(offset);
    case 2:
      return buf.readUint16LE(offset);
    case 4:
      return buf.readUint32LE(offset);
    case 8:
      return Number(buf.readBigUint64LE(offset));
  }
  throw new Error(`unsupported data size (${length} bytes)`);
}

export function displayTokenTable(tokens: Array<{ mint: string; amount: number }>) {
  // Transform data for better column headers
  const formattedData = tokens.map((token) => ({
    "Mint Address": token.mint,
    Amount: token.amount.toLocaleString(),
  }));
  console.table(formattedData);
}

export const getSolPrice = async () => {
  const SOL_URL = `https://api.jup.ag/price/v2?ids=${WSOL}`;
  try {
    const BaseURL = SOL_URL;
    const response = await fetch(BaseURL);
    const data = await response.json();
    const price = data.data[WSOL.toBase58()]?.price;
    return price;
  } catch (error) {
    return 0;
  }
};


export async function getTokenBalance(
  walletAddress: string,
  tokenMintAddress: string
) {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      // Get associated token account
      const associatedTokenAddress = getAssociatedTokenAddressSync(
        new PublicKey(tokenMintAddress),
        new PublicKey(walletAddress)
      );
      const tokenAccountInfo = await connection.getTokenAccountBalance(
        associatedTokenAddress
      );

      return Number(tokenAccountInfo.value.amount);
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        return 0;
      }
      // Wait before retrying
      await sleepTime(1000);
    }
  }
  return 0;
}
