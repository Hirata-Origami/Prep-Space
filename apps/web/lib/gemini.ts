import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Creates a Gemini client using the user's personal API key or global environment key.
 *
 * Server-side only.
 */
export function getGeminiClient(userApiKey?: string | null): GoogleGenerativeAI {
  const key = userApiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('No Gemini API key configured. Please add your key in Settings.');
  }
  return new GoogleGenerativeAI(key);
}

/**
 * Gemini models verified for this API key, ordered by capability & performance.
 * Cascade falls through from most capable down to fastest/lightest.
 */
export const CASCADE_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash-lite',
] as const;

export type CascadeModel = typeof CASCADE_MODELS[number];

export const GEMINI_MODELS = {
  PRO: 'gemini-3.1-pro-preview',
  FLASH_HIGH: 'gemini-3.8-flash',
  FLASH: 'gemini-2.5-flash',
  FLASH_LITE: 'gemini-3.1-flash-lite-preview',
} as const;

/**
 * Executes a Gemini API call with exponential backoff retries for 429 / 503.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      const isTransient =
        err?.status === 429 ||
        err?.status === 503 ||
        err?.message?.includes('429') ||
        err?.message?.includes('503') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('overloaded');

      if (isTransient) {
        attempt++;
        if (attempt >= maxRetries) throw error;
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Gemini] Rate limit or overload hit. Retrying in ${delay}ms (Attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Executes a generative task across the model cascade in order of performance.
 * If a model hits a rate limit or is overloaded, it automatically falls back
 * to the next highest-performing model in the cascade.
 */
export async function runWithModelCascade<T>(
  userApiKey: string | null | undefined,
  task: (model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>, modelName: string) => Promise<T>,
  startFromModel?: string
): Promise<T> {
  const client = getGeminiClient(userApiKey);
  const startIndex = startFromModel
    ? Math.max(0, CASCADE_MODELS.indexOf(startFromModel as CascadeModel))
    : 0;
  const modelsToTry = CASCADE_MODELS.slice(startIndex !== -1 ? startIndex : 0);

  let lastError: unknown = null;
  for (const modelName of modelsToTry) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      return await withRetry(() => task(model, modelName), 2, 800);
    } catch (error: unknown) {
      lastError = error;
      const err = error as { status?: number; message?: string };
      const isRateLimitOrOverload =
        err?.status === 429 ||
        err?.status === 503 ||
        err?.status === 404 ||
        err?.message?.includes('429') ||
        err?.message?.includes('503') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('Quota exceeded') ||
        err?.message?.includes('not found') ||
        err?.message?.includes('overloaded');

      if (isRateLimitOrOverload) {
        console.warn(`[Gemini Cascade] ${modelName} hit rate limit / unavailable. Cascading to next model...`);
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('All cascade models exhausted');
}

/** Quick helper: get a model ready to generate */
export function getModel(
  userApiKey: string | null | undefined,
  modelName: string = 'gemini-3.1-pro-preview'
) {
  const genAI = getGeminiClient(userApiKey);
  let resolved: string = modelName;
  if (modelName === 'FLASH_LITE') resolved = 'gemini-3.1-flash-lite-preview';
  else if (modelName === 'FLASH') resolved = 'gemini-3.8-flash';
  else if (modelName === 'PRO') resolved = 'gemini-3.1-pro-preview';
  return genAI.getGenerativeModel({ model: resolved });
}
