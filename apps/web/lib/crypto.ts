import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM for secrets stored in the database (GitHub tokens).
 * Needs APP_ENCRYPTION_KEY: any long random string. Without it nothing is stored;
 * callers fall back to using the secret for the current request only.
 */

function keyBytes(): Buffer | null {
  const raw = process.env.APP_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 16) return null;
  return createHash('sha256').update(raw).digest();
}

export function canEncrypt(): boolean {
  return keyBytes() !== null;
}

export function encryptSecret(plain: string): string | null {
  const key = keyBytes();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${data.toString('base64')}`;
}

export function decryptSecret(payload?: string | null): string | null {
  const key = keyBytes();
  if (!key || !payload) return null;
  const [v, iv, tag, data] = payload.split('.');
  if (v !== 'v1' || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
