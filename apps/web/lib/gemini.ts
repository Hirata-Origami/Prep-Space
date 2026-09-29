import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Creates a Gemini client using the user's personal API key or global environment key.
 *
 * Server-side only.
 */
export function getGeminiClient(userApiKey?: string | null): GoogleGenerativeAI {
  let key = userApiKey?.trim();
  if (key && (key.includes('•') || /[^\x00-\x7F]/.test(key) || key.length < 10)) {
    key = undefined;
  }
  if (!key) {
    key = process.env.GEMINI_API_KEY?.trim();
  }
  if (!key || key.includes('•') || /[^\x00-\x7F]/.test(key)) {
    throw new Error('No valid Gemini API key configured. Please add your key in Settings.');
  }
  return new GoogleGenerativeAI(key);
}

/**
 * Gemini models verified for this API key, ordered by capability & performance.
 * Cascade falls through from most capable down to fastest/lightest.
 * If 1 model runs out of quota or hits high demand, it seamlessly switches to the next.
 */
export const CASCADE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
] as const;

export type CascadeModel = typeof CASCADE_MODELS[number];

export interface ModelLimitSpec {
  name: CascadeModel;
  label: string;
  rpm: number; // requests per minute
  rpd: number; // requests per day
  tpm: number; // tokens per minute
  description: string;
}

export const MODEL_LIMITS: Record<CascadeModel, ModelLimitSpec> = {
  'gemini-3.8-flash': {
    name: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    rpm: 15,
    rpd: 20,
    tpm: 1_000_000,
    description: 'Premier flash model with high-speed intelligence',
  },
  'gemini-3.7-flash': {
    name: 'gemini-3.7-flash',
    label: 'Gemini 3.7 Flash',
    rpm: 15,
    rpd: 20,
    tpm: 1_000_000,
    description: 'Hybrid reasoning and fast response model',
  },
  'gemini-3.6-flash': {
    name: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    rpm: 15,
    rpd: 20,
    tpm: 1_000_000,
    description: 'High-availability low-latency flash',
  },
  'gemini-3.5-flash': {
    name: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    rpm: 15,
    rpd: 20,
    tpm: 1_000_000,
    description: 'Balanced multimodal flash',
  },
  'gemini-3.5-flash-lite': {
    name: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash Lite',
    rpm: 30,
    rpd: 1500,
    tpm: 1_000_000,
    description: 'High quota (1,500 RPD, 30 RPM) optimized model',
  },
  'gemini-3.1-flash-lite': {
    name: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    rpm: 30,
    rpd: 1500,
    tpm: 1_000_000,
    description: 'Ultra-fast fallback (1,500 RPD, 30 RPM)',
  },
  'gemini-3-flash-preview': {
    name: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview',
    rpm: 15,
    rpd: 50,
    tpm: 1_000_000,
    description: 'Next-generation preview model',
  },
  'gemini-2.5-flash': {
    name: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    rpm: 15,
    rpd: 1500,
    tpm: 1_000_000,
    description: 'Rock-solid stable flash (1,500 RPD)',
  },
  'gemini-2.5-flash-lite': {
    name: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    rpm: 30,
    rpd: 1500,
    tpm: 1_000_000,
    description: 'High quota fallback model (1,500 RPD, 30 RPM)',
  },
};

export const GEMINI_MODELS = {
  PRO: 'gemini-3.8-flash',
  FLASH_HIGH: 'gemini-3.8-flash',
  FLASH: 'gemini-3.8-flash',
  FLASH_LITE: 'gemini-3.5-flash-lite',
} as const;

/** In-memory status tracker for model rate limits and health */
const modelStatusTracker: Record<
  string,
  {
    status: 'ok' | '429_quota' | '503_overload' | 'unavailable';
    cooldownUntil: number;
    lastError?: string;
    lastUsed?: number;
  }
> = {};

export function getModelStatusMap() {
  const now = Date.now();
  return CASCADE_MODELS.map(name => {
    const tracked = modelStatusTracker[name];
    const spec = MODEL_LIMITS[name];
    const isCoolingDown = tracked && tracked.cooldownUntil > now;
    return {
      name,
      label: spec.label,
      rpm: spec.rpm,
      rpd: spec.rpd,
      tpm: spec.tpm,
      description: spec.description,
      status: isCoolingDown ? tracked.status : 'ok',
      retryAfterSec: isCoolingDown ? Math.ceil((tracked.cooldownUntil - now) / 1000) : 0,
      lastError: isCoolingDown ? tracked.lastError : undefined,
      lastUsed: tracked?.lastUsed,
    };
  });
}

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
 * If a model hits a rate limit (RPM/RPD) or is overloaded (503), it automatically falls back
 * to the next highest-performing model in the cascade without interrupting the user.
 */
export async function runWithModelCascade<T>(
  userApiKey: string | null | undefined,
  task: (model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>, modelName: string) => Promise<T>,
  startFromModel?: string
): Promise<T> {
  const client = getGeminiClient(userApiKey);
  const now = Date.now();

  const startIndex = startFromModel
    ? Math.max(0, CASCADE_MODELS.indexOf(startFromModel as CascadeModel))
    : 0;

  // Filter models that are not actively in cooldown, but keep fallback options open
  const candidateModels = CASCADE_MODELS.slice(startIndex !== -1 ? startIndex : 0);
  const modelsToTry = [
    ...candidateModels.filter(m => !(modelStatusTracker[m]?.cooldownUntil > now)),
    ...candidateModels.filter(m => modelStatusTracker[m]?.cooldownUntil > now),
  ];

  let lastError: unknown = null;
  let exhaustedCount = 0;

  for (const modelName of modelsToTry) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await task(model, modelName);

      // Successfully processed: update tracker
      modelStatusTracker[modelName] = {
        status: 'ok',
        cooldownUntil: 0,
        lastUsed: Date.now(),
      };
      return result;
    } catch (error: unknown) {
      lastError = error;
      const err = error as { status?: number; message?: string };
      const errMessage = err?.message || String(error);

      const isRateLimit =
        err?.status === 429 ||
        errMessage.includes('429') ||
        errMessage.includes('RESOURCE_EXHAUSTED') ||
        errMessage.includes('Quota exceeded');

      const isOverload =
        err?.status === 503 ||
        errMessage.includes('503') ||
        errMessage.includes('overloaded') ||
        errMessage.includes('experiencing high demand');

      const isDeprecated =
        err?.status === 404 ||
        errMessage.includes('404') ||
        errMessage.includes('no longer available') ||
        errMessage.includes('not found');

      if (isRateLimit || isOverload || isDeprecated) {
        exhaustedCount++;
        const cooldownSeconds = isRateLimit ? 30 : isOverload ? 15 : 3600;
        modelStatusTracker[modelName] = {
          status: isRateLimit ? '429_quota' : isOverload ? '503_overload' : 'unavailable',
          cooldownUntil: Date.now() + cooldownSeconds * 1000,
          lastError: errMessage.slice(0, 150),
          lastUsed: Date.now(),
        };

        console.warn(
          `[Gemini Cascade] ${modelName} unavailable (${isRateLimit ? '429 quota' : isOverload ? '503 high demand' : '404'}). Cascading seamlessly to next model...`
        );
        continue;
      }

      // Non-transient errors (e.g. invalid prompt structure)
      throw error;
    }
  }

  // If every single model has exhausted its RPM or RPD limits
  const quotaSummary = CASCADE_MODELS.map(m => {
    const lim = MODEL_LIMITS[m];
    return `${lim.label} (RPM: ${lim.rpm}, RPD: ${lim.rpd})`;
  }).join(', ');

  const detailedMsg = `All available Gemini models have temporarily reached their request limits (${quotaSummary}). Please wait a moment and try again.`;
  console.error(`[Gemini Cascade] All models exhausted (${exhaustedCount}/${modelsToTry.length}):`, lastError);
  throw new Error(detailedMsg);
}

/**
 * Gets a GenerativeModel instance with transparent automatic cascade protection.
 * Any call to `model.generateContent` will automatically cascade across available
 * models without throwing "limit is over" when a single model's quota is reached.
 */
export function getModel(
  userApiKey: string | null | undefined,
  modelName: string = 'gemini-3.8-flash'
): ReturnType<GoogleGenerativeAI['getGenerativeModel']> {
  const genAI = getGeminiClient(userApiKey);
  let resolved: CascadeModel = 'gemini-3.8-flash';

  if (modelName === 'FLASH_LITE') resolved = 'gemini-3.5-flash-lite';
  else if (modelName === 'FLASH') resolved = 'gemini-3.8-flash';
  else if (modelName === 'PRO') resolved = 'gemini-3.8-flash';
  else if (CASCADE_MODELS.includes(modelName as CascadeModel)) {
    resolved = modelName as CascadeModel;
  }

  const baseModel = genAI.getGenerativeModel({ model: resolved });

  // Wrap base model with automatic cascade on generateContent
  return new Proxy(baseModel, {
    get(target, prop, receiver) {
      if (prop === 'generateContent') {
        return async (...args: Parameters<typeof baseModel.generateContent>) => {
          return runWithModelCascade(
            userApiKey,
            async (activeModel) => {
              return activeModel.generateContent(...args);
            },
            resolved
          );
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

