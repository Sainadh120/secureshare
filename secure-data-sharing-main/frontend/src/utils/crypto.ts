/**
 * Client-side cryptographic utilities for E2E encryption
 * Uses Web Crypto API for AES-256-GCM and RSA-OAEP
 */

// Generate a new AES-256 key
export async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// Export AES key to raw bytes
export async function exportAESKey(key: CryptoKey): Promise<ArrayBuffer> {
  return await crypto.subtle.exportKey("raw", key);
}

// Import AES key from raw bytes
export async function importAESKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt data with AES-GCM
export async function encryptWithAES(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return { encrypted, iv };
}

// Decrypt data with AES-GCM
export async function decryptWithAES(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encryptedData
  );
}

// Generate RSA key pair for the user
export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// Export RSA public key to PEM format
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", key);
  const base64 = arrayBufferToBase64(exported);
  return `-----BEGIN PUBLIC KEY-----\n${formatPEM(base64)}\n-----END PUBLIC KEY-----`;
}

// Export RSA private key to PEM format
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("pkcs8", key);
  const base64 = arrayBufferToBase64(exported);
  return `-----BEGIN PRIVATE KEY-----\n${formatPEM(base64)}\n-----END PRIVATE KEY-----`;
}

// Import RSA public key from PEM format
export async function importPublicKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s/g, "");
  const binaryDer = base64ToArrayBuffer(pemContents);
  return await crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

// Import RSA private key from PEM format
export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryDer = base64ToArrayBuffer(pemContents);
  return await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

// Encrypt AES key with RSA public key
export async function encryptAESKeyWithRSA(
  aesKey: CryptoKey,
  publicKey: CryptoKey
): Promise<string> {
  const rawKey = await exportAESKey(aesKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    rawKey
  );
  return arrayBufferToBase64(encrypted);
}

// Decrypt AES key with RSA private key
export async function decryptAESKeyWithRSA(
  encryptedKey: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const encryptedBuffer = base64ToArrayBuffer(encryptedKey);
  const decrypted = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedBuffer
  );
  return await importAESKey(decrypted);
}

// Encrypt a file with AES and prepare for sharing
export async function encryptFile(
  file: File
): Promise<{ encryptedBlob: Blob; aesKey: CryptoKey; iv: Uint8Array }> {
  const arrayBuffer = await file.arrayBuffer();
  const aesKey = await generateAESKey();
  const { encrypted, iv } = await encryptWithAES(arrayBuffer, aesKey);
  
  // Prepend IV to encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  const encryptedBlob = new Blob([combined], { type: "application/octet-stream" });
  return { encryptedBlob, aesKey, iv };
}

// Decrypt a file with AES key
export async function decryptFile(
  encryptedData: Blob | ArrayBuffer,
  aesKey: CryptoKey
): Promise<Blob> {
  // Convert Blob to ArrayBuffer if needed
  const buffer = encryptedData instanceof Blob 
    ? await encryptedData.arrayBuffer() 
    : encryptedData;
  
  // Extract IV (first 12 bytes)
  const iv = new Uint8Array(buffer.slice(0, 12));
  const encrypted = buffer.slice(12);
  
  const decrypted = await decryptWithAES(encrypted, aesKey, iv);
  return new Blob([decrypted]);
}

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function formatPEM(base64: string): string {
  const lines = [];
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.slice(i, i + 64));
  }
  return lines.join("\n");
}

// Store user's keys in localStorage (encrypted with password in production)
export function storePrivateKey(privateKeyPem: string): void {
  localStorage.setItem("user_private_key", privateKeyPem);
}

export function getStoredPrivateKey(): string | null {
  return localStorage.getItem("user_private_key");
}

export function storePublicKey(publicKeyPem: string): void {
  localStorage.setItem("user_public_key", publicKeyPem);
}

export function getStoredPublicKey(): string | null {
  return localStorage.getItem("user_public_key");
}

export function clearStoredKeys(): void {
  localStorage.removeItem("user_private_key");
  localStorage.removeItem("user_public_key");
}

// Check if user has set up their keys
export function hasStoredKeys(): boolean {
  return !!(getStoredPrivateKey() && getStoredPublicKey());
}
