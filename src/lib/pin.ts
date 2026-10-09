const ITERATIONS = 150_000;
const KEY_LEN = 32;

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

export interface PinRecord { salt: string; hash: string; iterations: number }

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await globalThis.crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    KEY_LEN * 8,
  );
}

export async function hashPin(pin: string): Promise<PinRecord> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, ITERATIONS);
  return { salt: toB64(salt), hash: toB64(hash), iterations: ITERATIONS };
}

export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  if (!record || typeof record.salt !== 'string' || typeof record.hash !== 'string') return false;
  const iterations = Number.isFinite(record.iterations) ? record.iterations : ITERATIONS;
  const candidate = new Uint8Array(await derive(pin, fromB64(record.salt), iterations));
  const expected = fromB64(record.hash);
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate[i] ^ expected[i];
  return diff === 0;
}
