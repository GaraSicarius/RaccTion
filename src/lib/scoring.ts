import type { AiAnalysis, AiRedFlag } from '../ai/prompt.ts';
import type { Finding, PageCapture, ScanResult, Settings, TrustSignal } from './types.ts';

export function normalizeText(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`´ʼ]/g, "'")
    .replace(/[“”«»„]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when the AI's quote can actually be found in the captured page text.
 * Quotes over 120 chars match on their first 80 normalized characters. */
export function validateQuote(quote: string | undefined, text: string): boolean {
  if (!quote) return false;
  const nq = normalizeText(quote);
  if (!nq) return false;
  const probe = nq.length > 120 ? nq.slice(0, 80) : nq;
  return normalizeText(text).includes(probe);
}

/** One finding per enabled category. Precedence:
 * required (AI + valid quote) > asked_in_form > mentioned > ai_inferred > not_found. */
export function mergeFindings(
  ruleFindings: Finding[],
  ai: AiAnalysis | null,
  capture: PageCapture,
  settings: Settings,
): Finding[] {
  const out: Finding[] = [];
  for (const cat of settings.categories) {
    if (!cat.enabled) continue;
    const rule = ruleFindings.find(f => f.categoryId === cat.id);
    const aiReq = ai?.requirements?.find(r => r.category === cat.id);
    const aiValid = aiReq ? validateQuote(aiReq.quote, capture.text) : false;

    if (aiReq?.required && aiValid) {
      out.push({ categoryId: cat.id, status: 'required', detail: aiReq.detail, quote: aiReq.quote, source: 'ai' });
    } else if (rule?.status === 'asked_in_form') {
      out.push(rule); // a real form field is never downgraded
    } else if (aiReq && !aiReq.required && aiValid && rule?.status === 'mentioned') {
      // The AI read the context and says this mention isn't a requirement.
      out.push({ categoryId: cat.id, status: 'not_found', detail: '', source: 'rules' });
    } else if (rule) {
      out.push(rule);
    } else if (aiReq?.required) {
      out.push({ categoryId: cat.id, status: 'ai_inferred', detail: aiReq.detail, quote: aiReq.quote, source: 'ai' });
    } else if (aiReq && validateQuote(aiReq.quote, capture.text)) {
      out.push({ categoryId: cat.id, status: 'mentioned', detail: aiReq.detail, quote: aiReq.quote, source: 'ai' });
    } else {
      out.push({ categoryId: cat.id, status: 'not_found', detail: '', source: 'rules' });
    }
  }
  return out;
}

export function scoreEffort(
  findings: Finding[],
  steps: string[],
  capture: PageCapture,
  settings: Settings,
): ScanResult['effort'] {
  if (capture.text.trim().length < 200) return { level: 'unknown', score: null, reasons: [] };
  const byId = new Map(settings.categories.map(c => [c.id, c]));
  let score = 0;
  const reasons: string[] = [];
  for (const f of findings) {
    if (f.status === 'not_found') continue;
    const cat = byId.get(f.categoryId);
    if (!cat || cat.positive || cat.weight <= 0) continue;
    score += cat.weight;
    reasons.push(cat.label);
  }
  score += Math.max(0, steps.length - 2);
  if (steps.length > 0) reasons.push(`${steps.length} steps`);
  const { easyMax, moderateMax } = settings.scoring;
  const level = score <= easyMax ? 'easy' : score <= moderateMax ? 'moderate' : 'hard';
  return { level, score, reasons };
}

function hostMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith('.' + domain);
}

export function scoreTrust(
  signals: TrustSignal[],
  aiRedFlags: AiRedFlag[],
  capture: PageCapture,
  settings: Settings,
): ScanResult['trust'] {
  const hostname = capture.hostname.toLowerCase();
  const all: TrustSignal[] = [
    ...signals,
    ...aiRedFlags.slice(0, 3).map((f, i) => ({
      id: `ai_flag_${i}`,
      label: f.flag,
      detail: 'Flagged by the on-device AI.',
      points: 1,
      quote: f.quote,
    })),
  ];
  const points = all.reduce((sum, s) => sum + s.points, 0);

  if (settings.domains.blocked.some(d => hostMatches(hostname, d))) {
    return { level: 'high', points, signals: all, domainList: 'blocked' };
  }
  const domainList = settings.domains.trusted.some(d => hostMatches(hostname, d)) ? ('trusted' as const) : undefined;
  if (capture.text.trim().length < 200) {
    return { level: 'unknown', points, signals: all, ...(domainList ? { domainList } : {}) };
  }
  const level = points === 0 ? 'ok' : points <= 2 ? 'careful' : 'high';
  return { level, points, signals: all, ...(domainList ? { domainList } : {}) };
}

/** Validated AI red flags only — fabricated quotes never earn trust points. */
export function validatedAiFlags(ai: AiAnalysis | null, capture: PageCapture): AiRedFlag[] {
  if (!ai?.redFlags) return [];
  return ai.redFlags.filter(f => f.flag && validateQuote(f.quote, capture.text)).slice(0, 3);
}

export function buildResult(args: {
  capture: PageCapture;
  findings: Finding[];
  steps: string[];
  costs: ScanResult['costs'];
  freePlan: ScanResult['freePlan'];
  offerSummary: string;
  offerType: string;
  aiUsed: boolean;
  aiModel?: string;
  aiNote?: string;
  durationMs: number;
  settings: Settings;
  signals: TrustSignal[];
  aiFlags: AiRedFlag[];
}): ScanResult {
  const { capture, settings } = args;
  const effort = scoreEffort(args.findings, args.steps, capture, settings);
  const trust = scoreTrust(args.signals, args.aiFlags, capture, settings);
  return {
    url: capture.url,
    hostname: capture.hostname,
    title: capture.title,
    offerSummary: args.offerSummary,
    offerType: args.offerType,
    findings: args.findings,
    steps: args.steps,
    costs: args.costs,
    freePlan: args.freePlan,
    effort,
    trust,
    aiUsed: args.aiUsed,
    ...(args.aiModel ? { aiModel: args.aiModel } : {}),
    ...(args.aiNote ? { aiNote: args.aiNote } : {}),
    durationMs: Math.round(args.durationMs),
    capturedAt: capture.capturedAt,
  };
}
