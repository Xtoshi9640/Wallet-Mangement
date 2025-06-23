import crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const KEY = process.env.CIPHER_KEY || "";

// Ensure the encryption key is 32 bytes
const CIPHER_KEY = Buffer.from(KEY, 'hex');
if (CIPHER_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits)');
}

const IV_LENGTH = 16; // AES block size

export const encrypt = (data: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', CIPHER_KEY, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
};

export const decrypt = (encryptedData: string): string => {
  const [iv, encrypted, authTag] = encryptedData.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', CIPHER_KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
