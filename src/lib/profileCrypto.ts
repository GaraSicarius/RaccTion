// AES-GCM-256 profile encryption with a PIN-derived key (PBKDF2-SHA256).
// The salt here is independent of the adminPin hash salt.
import type { Profile } from './autofill.ts';

const ITERATIONS = 150_000;

export interface EncryptedProfile {
  salt: string;
  iv: string;
  data: string;
  iterations: number;
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(pin: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await globalThis.crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  return globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptProfile(profile: Profile, pin: string): Promise<EncryptedProfile> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt, ITERATIONS);
  const data = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(JSON.stringify(profile)),
  );
  return { salt: toB64(salt), iv: toB64(iv), data: toB64(data), iterations: ITERATIONS };
}

/** Throws (AES-GCM auth failure) when the PIN is wrong or the record is corrupt. */
export async function decryptProfile(record: EncryptedProfile, pin: string): Promise<Profile> {
  const iterations = Number.isFinite(record.iterations) ? record.iterations : ITERATIONS;
  const key = await deriveKey(pin, fromB64(record.salt), iterations);
  const plain = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(record.iv) as BufferSource },
    key,
    fromB64(record.data) as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(plain)) as Profile;
}
