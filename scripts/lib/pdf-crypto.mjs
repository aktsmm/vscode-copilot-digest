import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

export const PDF_CRYPTO = Object.freeze({ alg: "AES-256-GCM", kdf: "PBKDF2-SHA256", iterations: 600000 });

// Layout: salt(16) | iv(12) | tag(16) | ciphertext. Salt and iv are random per file.
export function encryptPdf(bytes, password, iterations = PDF_CRYPTO.iterations) {
  if (!password) throw new Error("PDF password is required");
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([salt, iv, cipher.getAuthTag(), body]);
}

export function decryptPdf(blob, password, iterations = PDF_CRYPTO.iterations) {
  const salt = blob.subarray(0, 16);
  const iv = blob.subarray(16, 28);
  const tag = blob.subarray(28, 44);
  const key = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(44)), decipher.final()]);
}
