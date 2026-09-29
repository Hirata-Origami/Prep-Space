import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';

/**
 * Encrypts users' Gemini API keys at rest, so a database dump or backup does not expose them.
 *
 * It needs no new configuration: the key is derived (HKDF-SHA256) from SUPABASE_SERVICE_ROLE_KEY, which the
 * server already has and the browser never sees. APP_SECRET, if set, is used instead so the two can be rotated
 * independently. Without either, keys are stored as before. Keys saved before this existed are still read as
 * plain text and are encrypted the next time the profile loads.
 *
 * If the secret is later changed, saved keys can no longer be read and users add theirs again in Settings.
 */

const PREFIX = 'enc:v1:';

function secret(): string | null {
  return process.env.APP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

function derivedKey(): Buffer | null {
  const s = secret();
  return s ? Buffer.from(hkdfSync('sha256', s, 'prepspace', 'gemini-key-v1', 32)) : null;
}

export const isEncrypted = (stored?: string | null): boolean => !!stored && stored.startsWith(PREFIX);

export const canEncrypt = (): boolean => derivedKey() !== null;

/** Returns the value to store: encrypted when possible, otherwise the plain key. */
export function encryptKey(plain: string): string {
  const key = derivedKey();
  if (!key || !plain) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${PREFIX}${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${body.toString('base64')}`;
}

/** Returns the plain key, or null when the stored value cannot be decrypted with the current secret. */
export function decryptKey(stored?: string | null): string | null {
  if (!stored) return null;
  if (!isEncrypted(stored)) return stored;
  const key = derivedKey();
  if (!key) return null;
  try {
    const [iv, tag, body] = stored.slice(PREFIX.length).split('.');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
