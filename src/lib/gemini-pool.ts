/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gemini API Key Pool — 12 keys rotation dengan multi-model strategy
 * Compatible: Google AI Studio (Cloud Run) + Vite (browser)
 */
import { GoogleGenAI } from '@google/genai';

// ─── Environment Helper ───────────────────────────────────────
const getEnv = (key: string): string => {
  if (key === 'GEMINI_KEYS') {
    return (typeof window !== 'undefined' ? (window as any).ENV_GEMINI_KEYS : '')
        ?? (import.meta as any).env?.VITE_GEMINI_KEYS
        ?? (import.meta as any).env?.GEMINI_KEYS
        ?? (typeof process !== 'undefined' ? process.env.GEMINI_KEYS : '')
        ?? '';
  }
  if (key === 'GEMINI_API_KEY') {
    return (import.meta as any).env?.VITE_GEMINI_API_KEY
        ?? (import.meta as any).env?.GEMINI_API_KEY
        ?? (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '')
        ?? '';
  }

  if (typeof window !== 'undefined') {
    // Vite browser — coba VITE_ prefix dulu, lalu tanpa prefix
    return (import.meta as any).env?.[`VITE_${key}`]
        ?? (import.meta as any).env?.[key]
        ?? '';
  }
  // Cloud Run / Node.js
  if (typeof process !== 'undefined' && process.env) {
    return (process.env as any)?.[key] ?? '';
  }
  return '';
};

// ─── Key Pool ─────────────────────────────────────────────────
const getEnvKeysPool = (): string[] => {
  const rawKeys = getEnv('GEMINI_KEYS');
  if (!rawKeys) return [];
  // Mendukung pembatas koma (,), titik koma (;), spasi, atau baris baru
  const separators = /[\s,;\n\r]+/;
  return rawKeys
    .split(separators)
    .map(k => k.trim())
    .filter(k => k.length > 10);
};

const ENV_KEYS: string[] = [
  getEnv('GEMINI_API_KEY'),  // Key utama AI Studio
  getEnv('GEMINI_KEY_1'),
  getEnv('GEMINI_KEY_2'),
  getEnv('GEMINI_KEY_3'),
  getEnv('GEMINI_KEY_4'),
  getEnv('GEMINI_KEY_5'),
  getEnv('GEMINI_KEY_6'),
  getEnv('GEMINI_KEY_7'),
  getEnv('GEMINI_KEY_8'),
  getEnv('GEMINI_KEY_9'),
  getEnv('GEMINI_KEY_10'),
  getEnv('GEMINI_KEY_11'),
].filter((k): k is string => typeof k === 'string' && k.length > 10);

const KEY_POOL: string[] = Array.from(new Set([...ENV_KEYS, ...getEnvKeysPool()]));

if (KEY_POOL.length === 0) {
  console.error('[GeminiPool] ❌ Tidak ada API key valid! Cek .env atau Secrets panel.');
} else {
  console.info(`[GeminiPool] ✅ ${KEY_POOL.length} API key siap digunakan`);
}

// ─── Model Registry ───────────────────────────────────────────
export const MODELS = {
  HIGH_QUOTA : 'gemini-2.5-flash-lite',  // Quota tinggi, cepat
  PREMIUM    : 'gemini-2.5-flash',       // Lebih pintar
  FALLBACK   : 'gemini-2.0-flash',       // Paling stabil
} as const;

// ─── Use-case Types ───────────────────────────────────────────
export type UseCase =
  | 'live_meeting'
  | 'simulation'
  | 'feedback'
  | 'summary'
  | 'document_analysis';

const MODEL_CHAIN: Record<UseCase, string[]> = {
  live_meeting     : [MODELS.HIGH_QUOTA, MODELS.PREMIUM, MODELS.FALLBACK],
  simulation       : [MODELS.HIGH_QUOTA, MODELS.PREMIUM, MODELS.FALLBACK],
  feedback         : [MODELS.PREMIUM,    MODELS.HIGH_QUOTA, MODELS.FALLBACK],
  summary          : [MODELS.PREMIUM,    MODELS.HIGH_QUOTA, MODELS.FALLBACK],
  document_analysis: [MODELS.PREMIUM,    MODELS.HIGH_QUOTA, MODELS.FALLBACK],
};

// ─── Internal State ───────────────────────────────────────────
let roundRobinIndex = 0;
const exhaustedByModel: Record<string, Set<number>> = {};

// Key yang invalid permanen (400 API_KEY_INVALID) — tidak perlu reset harian
const invalidKeys: Set<number> = new Set();

function getExhaustedSet(model: string): Set<number> {
  if (!exhaustedByModel[model]) exhaustedByModel[model] = new Set();
  return exhaustedByModel[model];
}

function getMsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function markExhausted(model: string, idx: number): void {
  const set = getExhaustedSet(model);
  if (!set.has(idx)) {
    set.add(idx);
    console.warn(`[GeminiPool] ⚠️  Key #${idx + 1} exhausted untuk ${model}`);
    setTimeout(() => {
      set.delete(idx);
      console.info(`[GeminiPool] 🔄 Key #${idx + 1} quota reset untuk ${model}`);
    }, getMsUntilMidnight());
  }
}

function markInvalid(idx: number): void {
  if (!invalidKeys.has(idx)) {
    invalidKeys.add(idx);
    console.warn(`[GeminiPool] 🔑 Key #${idx + 1} tidak valid (permanent), diblacklist`);
  }
}

function pickKey(model: string): { key: string; index: number } | null {
  const exhausted = getExhaustedSet(model);
  const total = KEY_POOL.length;

  for (let i = 0; i < total; i++) {
    const idx = (roundRobinIndex + i) % total;
    // Skip jika exhausted (quota habis hari ini) ATAU invalid permanen
    if (exhausted.has(idx) || invalidKeys.has(idx)) continue;
    roundRobinIndex = (idx + 1) % total;
    return { key: KEY_POOL[idx], index: idx };
  }
  return null;
}

// ─── Main Generate Function ───────────────────────────────────
export interface GenerateOptions {
  useCase           : UseCase;
  prompt            : string;
  systemInstruction?: string;
  jsonMode?         : boolean;
  temperature?      : number;
}

export async function generateWithStrategy(options: GenerateOptions): Promise<string> {
  const {
    useCase,
    prompt,
    systemInstruction,
    jsonMode    = false,
    temperature = 0.8,
  } = options;

  const chain = MODEL_CHAIN[useCase];
  let lastError: unknown;

  for (const model of chain) {
    for (let attempt = 0; attempt < KEY_POOL.length; attempt++) {
      const entry = pickKey(model);

      if (!entry) {
        console.warn(`[GeminiPool] Semua key habis untuk ${model}, mencoba model berikutnya...`);
        break;
      }

      try {
        const ai = new GoogleGenAI({ apiKey: entry.key });

        const result = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...(systemInstruction ? { systemInstruction } : {}),
            ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
            temperature,
          },
        });

        const text = result.text ?? '';

        if (text.trim().length > 0) {
          const isFirstChoice = model === chain[0];
          if (!isFirstChoice) {
            console.info(`[GeminiPool] ✅ [${useCase}] Fallback berhasil: ${model} Key#${entry.index + 1}`);
          }
          return text;
        }

        console.warn(`[GeminiPool] Response kosong dari ${model} Key#${entry.index + 1}`);

      } catch (err: unknown) {
        lastError = err;
        const msg = (JSON.stringify(err) + String((err as any)?.message ?? '')).toLowerCase();

        // ── 429 / Quota exhausted → tandai exhausted, coba key berikutnya ──
        if (
          msg.includes('429') ||
          msg.includes('resource_exhausted') ||
          msg.includes('quota') ||
          msg.includes('rate limit') ||
          msg.includes('too many requests')
        ) {
          markExhausted(model, entry.index);
          continue;
        }

        // ── 404 / Model tidak ada → skip semua key, turun ke model berikutnya ──
        if (
          msg.includes('404') ||
          msg.includes('not_found') ||
          msg.includes('not found') ||
          msg.includes('is not supported')
        ) {
          console.warn(`[GeminiPool] Model ${model} tidak tersedia, skip ke model berikutnya`);
          break;
        }

        // ── 400 Bad Request ──
        if (msg.includes('400') || msg.includes('invalid_argument')) {

          // API key tidak valid → blacklist permanen, coba key berikutnya
          if (msg.includes('api_key_invalid') || msg.includes('api key not valid')) {
            markInvalid(entry.index);
            continue; // ✅ lanjut ke key berikutnya, BUKAN throw
          }

          // 400 lain (prompt issue, schema issue) → throw langsung
          console.error(`[GeminiPool] Bad request (bukan key issue) pada ${model}:`, err);
          throw err;
        }

        // ── 403 / Leaked / Permission Denied → blacklist permanen, coba key berikutnya ──
        if (
          msg.includes('403') ||
          msg.includes('permission_denied') ||
          msg.includes('permission denied') ||
          msg.includes('leaked') ||
          msg.includes('reported as leaked')
        ) {
          markInvalid(entry.index);
          continue; // ✅ lanjut ke key berikutnya
        }

        // ── 503 Service Unavailable → coba key berikutnya ──
        if (
          msg.includes('503') ||
          msg.includes('service unavailable') ||
          msg.includes('overloaded')
        ) {
          console.warn(`[GeminiPool] ${model} Key#${entry.index + 1} overloaded, coba key lain`);
          continue;
        }

        // ── Error tidak terduga → throw ──
        console.error(`[GeminiPool] Unexpected error pada ${model} Key#${entry.index + 1}:`, err);
        throw err;
      }
    }

    // Reset round robin sebelum mencoba model berikutnya
    roundRobinIndex = 0;
  }

  throw new Error(
    `[GeminiPool] ❌ Semua model (${chain.join(', ')}) dan ${KEY_POOL.length} key gagal ` +
    `untuk use-case "${useCase}". Last error: ${String(lastError)}`
  );
}

// ─── Pool Status ──────────────────────────────────────────────
export interface PoolStatus {
  totalKeys    : number;
  validKeys    : number;
  invalidKeys  : number;
  roundRobinAt : number;
  byModel      : Array<{
    model    : string;
    exhausted: number;
    available: number;
  }>;
}

export function getPoolStatus(): PoolStatus {
  const byModel = Object.entries(exhaustedByModel).map(([model, set]) => ({
    model,
    exhausted: set.size,
    available: KEY_POOL.length - set.size - invalidKeys.size,
  }));

  return {
    totalKeys   : KEY_POOL.length,
    validKeys   : KEY_POOL.length - invalidKeys.size,
    invalidKeys : invalidKeys.size,
    roundRobinAt: roundRobinIndex,
    byModel,
  };
}

// ─── Quota Estimasi ───────────────────────────────────────────
export function getQuotaEstimate() {
  const keys = KEY_POOL.length - invalidKeys.size;
  return {
    live_meeting_simulation: {
      model        : MODELS.HIGH_QUOTA,
      rpdPerKey    : 500,
      totalPerDay  : 500 * keys,
      estimasiSesi : Math.floor((500 * keys) / 13),
    },
    feedback_summary: {
      model        : MODELS.PREMIUM,
      rpdPerKey    : 20,
      totalPerDay  : 20 * keys,
      estimasiSesi : Math.floor((20 * keys) / 2),
    },
    fallback: {
      model       : MODELS.FALLBACK,
      rpdPerKey   : 20,
      totalPerDay : 20 * keys,
    },
  };
}