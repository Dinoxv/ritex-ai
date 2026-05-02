const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
}

function isSecureContext(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

function getCryptoOrThrow(): Crypto {
  if (typeof crypto === 'undefined') {
    throw new Error('Web Crypto API is unavailable in this environment');
  }

  return crypto;
}

// --- XOR-based fallback for non-secure (HTTP) contexts ---

function xorEncrypt(data: string, password: string): string {
  const dataBytes = new TextEncoder().encode(data);
  const keyBytes = new TextEncoder().encode(password);
  const out = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    out[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return bufferToBase64(out);
}

function xorDecrypt(encoded: string, password: string): string {
  const dataBytes = new Uint8Array(base64ToBuffer(encoded));
  const keyBytes = new TextEncoder().encode(password);
  const out = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    out[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(out);
}

// --- Web Crypto (HTTPS) path ---

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string, password: string): Promise<EncryptedData> {
  const cryptoApi = getCryptoOrThrow();

  if (!isSecureContext()) {
    const salt = bufferToBase64(cryptoApi.getRandomValues(new Uint8Array(SALT_LENGTH)));
    const iv = bufferToBase64(cryptoApi.getRandomValues(new Uint8Array(IV_LENGTH)));
    return { encrypted: xorEncrypt(data, password), iv, salt };
  }

  const encoder = new TextEncoder();
  const salt = cryptoApi.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = cryptoApi.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encryptedBuffer = await cryptoApi.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  return {
    encrypted: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
  };
}

export async function decryptData(
  encryptedData: EncryptedData,
  password: string
): Promise<string> {
  const cryptoApi = getCryptoOrThrow();

  if (!isSecureContext()) {
    return xorDecrypt(encryptedData.encrypted, password);
  }

  const salt = base64ToBuffer(encryptedData.salt);
  const iv = base64ToBuffer(encryptedData.iv);
  const encrypted = base64ToBuffer(encryptedData.encrypted);
  const key = await deriveKey(password, new Uint8Array(salt));

  const decryptedBuffer = await cryptoApi.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function generateDeviceKey(): string {
  const array = new Uint8Array(32);
  getCryptoOrThrow().getRandomValues(array);
  return bufferToBase64(array);
}
