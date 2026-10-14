import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

// AES-256-GCM with a PBKDF2-SHA256 key. One salt is shared by all PDFs and published in
// data/slides.json, so a browser derives the key once per merge. File layout: iv(12) | ciphertext | tag(16),
// which is what WebCrypto expects for AES-GCM.
export const PDF_CRYPTO = Object.freeze({ alg: "AES-256-GCM", kdf: "PBKDF2-SHA256", iterations: 600000, saltBytes: 16 });

export function newCryptoInfo(iterations = PDF_CRYPTO.iterations) {
  return {
    alg: PDF_CRYPTO.alg,
    kdf: PDF_CRYPTO.kdf,
    iterations,
    salt: randomBytes(PDF_CRYPTO.saltBytes).toString("base64"),
    layout: "iv12|ciphertext|tag16",
  };
}

export function deriveKey(password, info) {
  if (!password) throw new Error("PDF password is required");
  return pbkdf2Sync(password, Buffer.from(info.salt, "base64"), info.iterations, 32, "sha256");
}

export function encryptPdf(bytes, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]);
}

export function decryptPdf(blob, key) {
  const decipher = createDecipheriv("aes-256-gcm", key, blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(blob.length - 16));
  return Buffer.concat([decipher.update(blob.subarray(12, blob.length - 16)), decipher.final()]);
}
