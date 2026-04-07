import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Creates a Gemini client using the user's personal API key.
 *
 * NEVER call this from client components — server-side only.
 */
export function getGeminiClient(userApiKey?: string | null): GoogleGenerativeAI {
  if (!userApiKey) {
    throw new Error('No Gemini API key configured. Please add your key in Settings.');
  }
  return new GoogleGenerativeAI(userApiKey);
}

export const GEMINI_MODELS = {
  FLASH_LITE: 'gemini-3.1-flash-lite-preview',
  FLASH: 'gemini-3.1-flash-lite-preview',
} as const;


/**
 * Executes a Gemini API call with exponential backoff retries for 429 Too Many Requests.
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
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('429')) {
        attempt++;
        if (attempt >= maxRetries) throw error;
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Gemini] Rate limit hit. Retrying in ${delay}ms (Attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error; // Not a rate limit error, bubble up immediately
      }
    }
  }
  throw new Error('Max retries exceeded');
}

/** Quick helper: get a model ready to generate */
export function getModel(
  userApiKey: string | null | undefined,
  model: keyof typeof GEMINI_MODELS = 'FLASH_LITE'
) {
  const genAI = getGeminiClient(userApiKey);
  return genAI.getGenerativeModel({ model: GEMINI_MODELS[model] });
}
