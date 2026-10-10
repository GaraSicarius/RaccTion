import { buildSchema, buildSystemPrompt, buildUserPrompt, enabledAiCategories, type AiAnalysis } from './prompt.ts';
import type { PageCapture, Settings } from '../lib/types.ts';

const BASE_URL = 'http://127.0.0.1:8081';
const MODEL_ID = 'qwen3-0.6b';
const AVAILABILITY_TIMEOUT_MS = 3000;
const ANALYSIS_TIMEOUT_MS = 240_000;
const LOCAL_SYSTEM_SUFFIX = '\nFor local Qwen analysis: classify a prize that requires a fee as giveaway_prize. If any upfront payment is mandatory, freePlan must be "no".';

export const MODEL_NAME = 'Qwen3 0.6B';
export type Availability = 'available' | 'unavailable';
export type LocalModelErrorCode = 'timeout' | 'aborted' | 'parse' | 'failed';

export class LocalModelError extends Error {
  code: LocalModelErrorCode;

  constructor(code: LocalModelErrorCode, message?: string) {
    super(message ?? `Local model error: ${code}`);
    this.code = code;
    this.name = 'LocalModelError';
  }
}

export interface AnalyzeOptions {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function boundedNullableString(value: unknown, maxLength: number): value is string | null {
  return value === null || boundedString(value, maxLength);
}

function isAiAnalysis(value: unknown, settings: Settings): value is AiAnalysis {
  if (!isRecord(value)) return false;
  if (!boundedString(value.offerSummary, 220)) return false;
  if (typeof value.offerType !== 'string' || ![
    'free_item', 'free_trial', 'discount', 'giveaway_prize', 'cashback',
    'with_purchase', 'other', 'not_a_promo',
  ].includes(value.offerType)) return false;
  if (!Array.isArray(value.requirements) || value.requirements.length > 12) return false;
  const categoryIds = new Set(enabledAiCategories(settings));
  for (const requirement of value.requirements) {
    if (!isRecord(requirement)) return false;
    if (typeof requirement.category !== 'string' || !categoryIds.has(requirement.category)) return false;
    if (typeof requirement.required !== 'boolean') return false;
    if (!boundedString(requirement.detail, 160) || !boundedString(requirement.quote, 240)) return false;
  }
  if (!Array.isArray(value.steps) || value.steps.length > 8 ||
      !value.steps.every(step => boundedString(step, 120))) return false;
  if (!isRecord(value.costs) ||
      !boundedNullableString(value.costs.upfront, 120) ||
      !boundedNullableString(value.costs.recurring, 120) ||
      !boundedNullableString(value.costs.minimumSpend, 120)) return false;
  if (value.freePlan !== 'yes' && value.freePlan !== 'no' && value.freePlan !== 'unclear') return false;
  if (!Array.isArray(value.redFlags) || value.redFlags.length > 5) return false;
  for (const redFlag of value.redFlags) {
    if (!isRecord(redFlag) || !boundedString(redFlag.flag, 120) || !boundedString(redFlag.quote, 240)) return false;
  }
  return true;
}

function boundedSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort(parent?.reason);
  if (parent?.aborted) abortFromParent();
  else parent?.addEventListener('abort', abortFromParent, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      parent?.removeEventListener('abort', abortFromParent);
    },
  };
}

export async function getAvailability(): Promise<Availability> {
  const bound = boundedSignal(undefined, AVAILABILITY_TIMEOUT_MS);
  try {
    const health = await fetch(`${BASE_URL}/health`, { signal: bound.signal, redirect: 'error' });
    if (!health.ok) return 'unavailable';

    const modelsResponse = await fetch(`${BASE_URL}/v1/models`, { signal: bound.signal, redirect: 'error' });
    if (!modelsResponse.ok) return 'unavailable';
    const models: unknown = await modelsResponse.json();
    if (!isRecord(models) || !Array.isArray(models.data)) return 'unavailable';
    return models.data.some(model => isRecord(model) && model.id === MODEL_ID)
      ? 'available'
      : 'unavailable';
  } catch {
    return 'unavailable';
  } finally {
    bound.cleanup();
  }
}

export async function analyze(
  capture: PageCapture,
  settings: Settings,
  opts: AnalyzeOptions = {},
): Promise<AiAnalysis> {
  if (opts.signal?.aborted) throw new LocalModelError('aborted', 'Local analysis was cancelled.');

  const bound = boundedSignal(opts.signal, ANALYSIS_TIMEOUT_MS);
  opts.onProgress?.(0.05);
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'error',
      signal: bound.signal,
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [
          { role: 'system', content: buildSystemPrompt(settings) + LOCAL_SYSTEM_SUFFIX },
          { role: 'user', content: buildUserPrompt(capture, settings, 2500) },
        ],
        chat_template_kwargs: { enable_thinking: false },
        temperature: 0,
        max_tokens: 1200,
        stream: false,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'analysis',
            strict: true,
            schema: buildSchema(settings),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new LocalModelError('failed', `Local model returned HTTP ${response.status}.`);
    }
    opts.onProgress?.(0.75);

    let envelope: unknown;
    try {
      envelope = await response.json();
    } catch {
      throw new LocalModelError('parse', 'Local model returned an unreadable response.');
    }
    const choice = isRecord(envelope) && Array.isArray(envelope.choices) && isRecord(envelope.choices[0])
      ? envelope.choices[0]
      : undefined;
    if (!choice || choice.finish_reason !== 'stop') {
      throw new LocalModelError('parse', 'Local model response was truncated or incomplete.');
    }
    const content = isRecord(choice.message) ? choice.message.content : undefined;
    if (typeof content !== 'string') {
      throw new LocalModelError('parse', 'Local model response was incomplete.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new LocalModelError('parse', 'Local model returned incomplete JSON.');
    }
    if (!isAiAnalysis(parsed, settings)) {
      throw new LocalModelError('parse', 'Local model returned invalid analysis data.');
    }
    opts.onProgress?.(1);
    return parsed;
  } catch (error) {
    if (error instanceof LocalModelError) throw error;
    if (opts.signal?.aborted) throw new LocalModelError('aborted', 'Local analysis was cancelled.');
    if (bound.didTimeOut()) throw new LocalModelError('timeout', 'Local analysis timed out.');
    throw new LocalModelError('failed', error instanceof Error ? error.message : String(error));
  } finally {
    bound.cleanup();
  }
}
