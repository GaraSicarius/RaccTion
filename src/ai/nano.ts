import { buildSchema, buildSystemPrompt, buildUserPrompt, type AiAnalysis } from './prompt.ts';
import type { PageCapture, Settings } from '../lib/types.ts';

// Chrome Prompt API (Gemini Nano). Context-agnostic: the same code runs in the
// service worker, extension pages and (as a fallback) an offscreen document.
// LanguageModel is not in TypeScript's DOM lib, so it is declared here.

interface LanguageModelMonitor {
  addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void;
}

interface LanguageModelSession {
  prompt(input: string, options?: { responseConstraint?: unknown; signal?: AbortSignal }): Promise<string>;
  promptStreaming(input: string, options?: { responseConstraint?: unknown; signal?: AbortSignal }):
    | AsyncIterable<string>
    | ReadableStream<string>;
  measureInputUsage?(input: string, options?: { responseConstraint?: unknown }): Promise<number>;
  inputQuota?: number;
  clone?(): Promise<LanguageModelSession>;
  destroy?(): void;
}

interface LanguageModelCreateOptions {
  expectedInputs?: { type: string; languages: string[] }[];
  expectedOutputs?: { type: string; languages: string[] }[];
  initialPrompts?: { role: string; content: string }[];
  topK?: number;
  temperature?: number;
  signal?: AbortSignal;
  monitor?: (monitor: LanguageModelMonitor) => void;
}

interface LanguageModelApi {
  availability(options?: { expectedInputs?: { type: string; languages: string[] }[]; expectedOutputs?: { type: string; languages: string[] }[] }): Promise<string>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
  params?(): Promise<{ defaultTopK?: number; maxTopK?: number; defaultTemperature?: number; maxTemperature?: number }>;
}

declare global {
  // Present on capable Chrome versions; absent elsewhere.
  // eslint-disable-next-line no-var
  var LanguageModel: LanguageModelApi | undefined;
}

const EXPECTED = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

export type Availability = 'no-api' | 'unavailable' | 'downloadable' | 'downloading' | 'available';
export type NanoErrorCode = Availability | 'timeout' | 'aborted' | 'parse' | 'failed';

export class NanoError extends Error {
  code: NanoErrorCode;
  constructor(code: NanoErrorCode, message?: string) {
    super(message ?? `Gemini Nano error: ${code}`);
    this.code = code;
    this.name = 'NanoError';
  }
}

function lm(): LanguageModelApi | undefined {
  return typeof globalThis.LanguageModel === 'undefined' ? undefined : globalThis.LanguageModel;
}

const AVAILABILITY_TIMEOUT_MS = 3000;

export async function getAvailability(): Promise<Availability> {
  const api = lm();
  if (!api) return 'no-api';
  try {
    // Some Chromium builds (e.g. Opera GX 136) expose LanguageModel but
    // availability() never settles — cap the wait so scans can't stall.
    const status = await Promise.race([
      api.availability(EXPECTED).catch(() => 'unavailable'),
      new Promise<'timeout'>(res => setTimeout(() => res('timeout'), AVAILABILITY_TIMEOUT_MS)),
    ]);
    if (status === 'available' || status === 'downloading' || status === 'downloadable' || status === 'unavailable') return status;
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Download the model. Must be called from a page where the user just clicked —
 * the service worker is not allowed to start a model download. */
export async function downloadModel(onProgress: (fraction: number) => void): Promise<void> {
  const api = lm();
  if (!api) throw new NanoError('no-api');
  const session = await api.create({
    ...EXPECTED,
    monitor: m => m.addEventListener('downloadprogress', e => onProgress(typeof e.loaded === 'number' ? e.loaded : 0)),
  });
  session.destroy?.();
  discardBaseSession(); // force recreate with the fresh model
}

// Base session is keyed by its system prompt: editing checks/enabled sets in
// Admin changes the prompt, so the old base session is destroyed and rebuilt.
let baseSession: { prompt: string; session: Promise<LanguageModelSession> } | null = null;

function discardBaseSession() {
  const old = baseSession;
  baseSession = null;
  old?.session.then(s => s.destroy?.()).catch(() => {});
}

async function getBaseSession(settings: Settings, signal?: AbortSignal): Promise<LanguageModelSession> {
  const systemPrompt = buildSystemPrompt(settings);
  if (baseSession && baseSession.prompt !== systemPrompt) discardBaseSession();
  if (!baseSession) {
    const api = lm();
    if (!api) throw new NanoError('no-api');
    baseSession = {
      prompt: systemPrompt,
      session: (async () => {
        const options: LanguageModelCreateOptions = {
          ...EXPECTED,
          initialPrompts: [{ role: 'system', content: systemPrompt }],
        };
        if (signal) options.signal = signal;
        if (api.params) {
          try {
            const p = await api.params();
            if (p && (p.maxTopK === undefined || p.maxTopK >= 3)) options.topK = 3;
            if (p && (p.maxTemperature === undefined || p.maxTemperature >= 0.2)) options.temperature = 0.2;
          } catch { /* params unavailable — use defaults */ }
        }
        try {
          return await api.create(options);
        } catch (err) {
          discardBaseSession();
          throw new NanoError('failed', String(err));
        }
      })(),
    };
  }
  return baseSession.session;
}

async function streamToString(
  stream: AsyncIterable<string> | ReadableStream<string>,
  onChunk: (accumulated: string) => void,
): Promise<string> {
  let acc = '';
  const handle = (chunk: string) => {
    // Some builds stream deltas, others cumulative snapshots.
    if (chunk.startsWith(acc)) acc = chunk;
    else acc += chunk;
    onChunk(acc);
  };
  if (Symbol.asyncIterator in Object(stream)) {
    for await (const chunk of stream as AsyncIterable<string>) handle(chunk);
  } else {
    const reader = (stream as ReadableStream<string>).getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (typeof value === 'string') handle(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  return acc;
}

export interface AnalyzeOptions {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export async function analyze(capture: PageCapture, settings: Settings, opts: AnalyzeOptions = {}): Promise<AiAnalysis> {
  const availability = await getAvailability();
  if (availability !== 'available') throw new NanoError(availability === 'no-api' ? 'no-api' : availability);

  const base = await getBaseSession(settings, opts.signal);
  const session = base.clone ? await base.clone() : base;

  try {
    const schema = buildSchema(settings);

    // Trim the page until it fits the model's context, keeping 1500 tokens spare.
    let budgetChars = 9000;
    let userPrompt = buildUserPrompt(capture, settings, budgetChars);
    if (session.measureInputUsage && typeof session.inputQuota === 'number') {
      try {
        while (budgetChars > 2500) {
          const usage = await session.measureInputUsage(userPrompt, { responseConstraint: schema });
          if (usage <= session.inputQuota - 1500) break;
          budgetChars = Math.max(2500, Math.floor(budgetChars * 0.75));
          userPrompt = buildUserPrompt(capture, settings, budgetChars);
        }
      } catch { /* measurement unsupported — proceed with default budget */ }
    }

    const stream = session.promptStreaming(userPrompt, { responseConstraint: schema, signal: opts.signal });
    const raw = await streamToString(stream, acc => opts.onProgress?.(Math.min(0.98, acc.length / 1200)));

    try {
      return JSON.parse(raw) as AiAnalysis;
    } catch {
      throw new NanoError('parse', 'Gemini Nano returned unreadable JSON.');
    }
  } catch (err) {
    if (err instanceof NanoError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') throw new NanoError('aborted', 'Scan aborted.');
    throw new NanoError('failed', String(err));
  } finally {
    if (session !== base) session.destroy?.();
  }
}
