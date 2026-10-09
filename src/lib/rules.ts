import type { CategoryDef, FormField, FormSignal, PageCapture, Finding, Settings, TrustSignal } from './types.ts';

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive, word-boundary-ish keyword regex. Boundaries treat Unicode
 * letters/numbers (and ₱-style symbols at the edges) sensibly. */
export function keywordRegex(keyword: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRe(keyword)}(?![\\p{L}\\p{N}_])`, 'iu');
}

/** The sentence (≤200 chars) containing the first keyword hit. */
export function quoteAround(text: string, index: number, length: number): string {
  let start = index;
  while (start > 0 && !'.!?\n'.includes(text[start - 1]) && index - start < 140) start--;
  let end = index + length;
  while (end < text.length && !'.!?\n'.includes(text[end]) && end - start < 200) end++;
  let quote = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (quote.length > 200) quote = quote.slice(0, 199).trimEnd() + '…';
  return quote;
}

/** Negation window: ~30 chars before a hit, cut at the last sentence boundary. */
const NEGATION_RE = /\b(?:no|not|without|never|walang|hindi)\b|don't need|doesn't require|isn't required|di kailangan/i;

export function isNegated(text: string, index: number): boolean {
  const window = text.slice(Math.max(0, index - 30), index);
  const boundary = Math.max(window.lastIndexOf('.'), window.lastIndexOf('!'), window.lastIndexOf('?'), window.lastIndexOf('\n'));
  const segment = boundary >= 0 ? window.slice(boundary + 1) : window;
  return NEGATION_RE.test(segment);
}

/** First index where any keyword of the category appears in the text.
 * With skipNegated, hits whose ~30 chars before contain a negation are
 * ignored and scanning continues for a later non-negated hit. */
export function firstKeywordHit(
  text: string,
  keywords: string[],
  skipNegated = false,
): { index: number; keyword: string; length: number } | null {
  let best: { index: number; keyword: string; length: number } | null = null;
  for (const keyword of keywords) {
    const re = new RegExp(keywordRegex(keyword).source, 'giu');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (skipNegated && isNegated(text, m.index)) continue;
      if (best === null || m.index < best.index) best = { index: m.index, keyword, length: m[0].length };
      break;
    }
  }
  return best;
}

/** All positions where any keyword hits, in page order — used for prompt windows. */
export function keywordHitPositions(text: string, categories: CategoryDef[]): { index: number; length: number }[] {
  const hits: { index: number; length: number }[] = [];
  for (const cat of categories) {
    for (const keyword of cat.keywords) {
      const re = new RegExp(keywordRegex(keyword).source, 'giu');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        hits.push({ index: m.index, length: m[0].length });
        if (hits.length > 400) return hits.sort((a, b) => a.index - b.index);
      }
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

const SIGNAL_PATTERNS: [FormSignal, (f: FormField, all: string) => boolean][] = [
  ['card', (f, all) => f.autocomplete.startsWith('cc-') || /card|cvv|cvc|expiry|expiration/.test(all)],
  ['otp', (_f, all) => /otp|one[- ]?time|verification code|mpin|\bpin\b/.test(all)],
  ['tel', (f, all) => f.type === 'tel' || /mobile|phone|cellphone|contact number/.test(all)],
  ['file', f => f.type === 'file'],
  ['password', f => f.type === 'password'],
  ['address', (f, all) => f.type !== 'email' && !f.autocomplete.includes('email') &&
    /address|street|barangay|\bcity\b|zip|province/.test(all.replace(/e-?mail\s*address/g, ''))],
  ['birthdate', (_f, all) => /birth|bday|date of birth/.test(all)],
  ['bank', (_f, all) => /account number|bank|account no\b/.test(all)],
  ['email', (f, all) => f.type === 'email' || /e-?mail/.test(all)],
];

export interface FieldSignal { signal: FormSignal; field: FormField }

export function detectFormSignals(forms: FormField[]): FieldSignal[] {
  const found: FieldSignal[] = [];
  for (const field of forms) {
    const all = `${field.type} ${field.name} ${field.label} ${field.autocomplete} ${field.placeholder}`.toLowerCase();
    for (const [signal, test] of SIGNAL_PATTERNS) {
      if (!found.some(x => x.signal === signal) && test(field, all)) found.push({ signal, field });
    }
  }
  return found;
}

// Known brands → official domains. Flag when a brand is named in the title,
// site name or first headings but the hostname is not one of its domains.
const BRANDS: { name: string; domains: string[] }[] = [
  { name: 'GCash', domains: ['gcash.com'] },
  { name: 'Maya', domains: ['maya.ph', 'paymaya.com'] },
  { name: 'PayPal', domains: ['paypal.com'] },
  { name: 'Shopee', domains: ['shopee.com', 'shopee.ph', 'shopee.sg', 'shopee.com.my', 'shopee.co.id', 'shopee.tw', 'shopee.vn', 'shopee.com.br', 'shopee.cl', 'shopee.co.th'] },
  { name: 'Lazada', domains: ['lazada.com', 'lazada.ph', 'lazada.sg', 'lazada.com.my', 'lazada.co.id', 'lazada.vn', 'lazada.co.th'] },
  { name: 'BDO', domains: ['bdo.com.ph'] },
  { name: 'BPI', domains: ['bpi.com.ph'] },
  { name: 'Metrobank', domains: ['metrobank.com.ph'] },
  { name: 'Netflix', domains: ['netflix.com'] },
  { name: 'Spotify', domains: ['spotify.com'] },
  { name: 'Apple', domains: ['apple.com'] },
  { name: 'Samsung', domains: ['samsung.com'] },
  { name: 'Globe', domains: ['globe.com.ph'] },
  { name: 'Smart', domains: ['smart.com.ph'] },
  { name: 'Jollibee', domains: ['jollibee.com.ph', 'jollibee.com'] },
  { name: 'Grab', domains: ['grab.com'] },
  { name: 'Meralco', domains: ['meralco.com.ph'] },
  { name: 'SM', domains: ['smsupermalls.com', 'smmarkets.ph', 'smprime.com', 'thesmstore.com'] },
];

const SUSPICIOUS_TLDS = new Set(['xyz', 'top', 'click', 'icu', 'buzz', 'shop', 'live', 'rest', 'cfd', 'sbs']);
const PRIZE_RE = /giveaway|prize|premyo|\bwon\b|winner|winnings|congratulations|raffle|nanalo|\blibre\b/i;
const LOGIN_RE = /\blog ?in\b|mpin/i;
const LOOKALIKE_RE = /promo|free|claim|win|gift|reward|prize/i;

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isIpHost(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

const CATEGORY_SIGNAL_LABELS: Record<string, string> = {
  otp_pin: 'Asks for a one-time PIN or password',
  time_pressure: 'Uses countdown or urgency pressure',
};

export function ruleScan(capture: PageCapture, settings: Settings): { findings: Finding[]; signals: TrustSignal[] } {
  const findings: Finding[] = [];
  const fieldSignals = detectFormSignals(capture.forms);
  const enabled = settings.categories.filter(c => c.enabled);

  for (const cat of enabled) {
    const fieldHit = cat.formSignals.length ? fieldSignals.find(fs => cat.formSignals.includes(fs.signal)) : undefined;
    if (fieldHit) {
      const fieldName = fieldHit.field.label || fieldHit.field.name || fieldHit.field.placeholder || fieldHit.field.type;
      findings.push({
        categoryId: cat.id,
        status: 'asked_in_form',
        detail: `The page's form asks for "${fieldName}".`,
        source: 'form',
      });
      continue;
    }
    // Positive categories (free_plan) keep negated hits — "no card required"
    // IS the free-plan signal. For asks, negated mentions are skipped.
    const hit = cat.keywords.length ? firstKeywordHit(capture.text, cat.keywords, !cat.positive) : null;
    if (hit) {
      findings.push({
        categoryId: cat.id,
        status: 'mentioned',
        detail: `The page mentions "${hit.keyword}".`,
        quote: quoteAround(capture.text, hit.index, hit.length),
        source: 'rules',
      });
    }
  }

  const signals: TrustSignal[] = [];
  const foundIds = new Set(findings.map(f => f.categoryId));
  const local = isLocalHost(capture.hostname);

  // Category-driven trust signals (otp_pin, time_pressure, custom flags).
  for (const cat of enabled) {
    if (cat.trustWeight > 0 && foundIds.has(cat.id)) {
      const finding = findings.find(f => f.categoryId === cat.id);
      signals.push({
        id: cat.id,
        label: CATEGORY_SIGNAL_LABELS[cat.id] ?? `${cat.label} (flagged)`,
        detail: finding?.detail ?? '',
        points: cat.trustWeight,
        quote: finding?.quote,
      });
    }
  }

  // A prize that still requires payment.
  if (PRIZE_RE.test(capture.text) && (foundIds.has('payment_upfront') || foundIds.has('card_details'))) {
    signals.push({
      id: 'prize_with_payment',
      label: 'Prize requires payment',
      detail: 'The page promises a prize or giveaway but still asks for payment or card details.',
      points: 3,
    });
  }

  // Bank or e-wallet combined with a login/password ask.
  const hasPasswordField = capture.forms.some(f => f.type === 'password');
  if (foundIds.has('bank_ewallet') && (hasPasswordField || LOGIN_RE.test(capture.text))) {
    signals.push({
      id: 'bank_login',
      label: 'Bank login request',
      detail: 'The page mentions a bank or e-wallet and asks for a login, password or MPIN.',
      points: 2,
    });
  }

  // Brand name in the title/site name/headings but on a different domain. This
  // runs even on localhost so synthetic demos can exercise it.
  const brandText = [capture.title, capture.siteName, ...capture.headings.slice(0, 3)].filter(Boolean).join('\n');
  for (const brand of BRANDS) {
    if (!keywordRegex(brand.name).test(brandText)) continue;
    const official = brand.domains.some(d => capture.hostname === d || capture.hostname.endsWith('.' + d));
    if (!official) {
      signals.push({
        id: 'brand_mismatch',
        label: `Claims to be ${brand.name}`,
        detail: `The page presents as ${brand.name} but "${capture.hostname}" is not an official ${brand.name} domain.`,
        points: 2,
      });
      break; // one brand-mismatch signal is enough
    }
  }

  if (!local) {
    // Lookalike / throwaway domains.
    const lookalike =
      capture.hostname.includes('xn--') ||
      isIpHost(capture.hostname) ||
      (capture.hostname.includes('-') && LOOKALIKE_RE.test(capture.hostname));
    if (lookalike) {
      signals.push({
        id: 'lookalike_domain',
        label: 'Lookalike or throwaway domain',
        detail: `"${capture.hostname}" looks like a temporary or impersonating domain.`,
        points: 2,
      });
    }

    const tld = capture.hostname.split('.').pop() ?? '';
    if (SUSPICIOUS_TLDS.has(tld)) {
      signals.push({
        id: 'suspicious_tld',
        label: `Suspicious .${tld} domain`,
        detail: `The ".${tld}" top-level domain is common in disposable scam sites.`,
        points: 1,
      });
    }
  }

  if (capture.protocol === 'http:' && !local) {
    signals.push({
      id: 'no_https',
      label: 'Not served over HTTPS',
      detail: 'The page is plain HTTP, so anything you type can be intercepted.',
      points: 2,
    });
  }

  return { findings, signals };
}
