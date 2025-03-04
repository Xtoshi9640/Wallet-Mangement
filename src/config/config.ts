import bs58 from "bs58";
import dotenv from 'dotenv';
import { Metaplex } from "@metaplex-foundation/js";
import { Connection, Keypair } from '@solana/web3.js';
dotenv.config();

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';
export const wallet = Keypair.fromSecretKey(bs58.decode(WALLET_PRIVATE_KEY));

export const SOLANA_RPC_URL: string = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export const SOLANA_WSS_URL: string = process.env.SOLANA_WSS_URL || "ws://api.mainnet-beta.solana.com";

export const connection = new Connection(SOLANA_RPC_URL, {
  wsEndpoint: SOLANA_WSS_URL,
});

export const metaplex = new Metaplex(connection);

