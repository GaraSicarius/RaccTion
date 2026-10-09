import { BUILTIN_CATEGORIES } from './categories.ts';
import type { CategoryDef, ScanResult, Settings } from './types.ts';

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  categories: BUILTIN_CATEGORIES.map(c => ({ ...c, keywords: [...c.keywords], formSignals: [...c.formSignals] })),
  display: {
    order: BUILTIN_CATEGORIES.map(c => c.id),
    hidden: [],
    sections: { summary: true, effort: true, trust: true, steps: true, freePlan: true, redFlags: true },
    position: 'bottom-right',
    showQuotes: true,
  },
  scoring: { easyMax: 2, moderateMax: 6 },
  domains: { trusted: [], blocked: [] },
  history: { enabled: true, max: 50 },
};

const POSITIONS = ['bottom-right', 'top-right', 'bottom-left'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.length > 0) : [];
}

function num(v: unknown, fallback: number, min = 0, max = 1000): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

const BUILTIN_IDS = new Set(BUILTIN_CATEGORIES.map(c => c.id));

function cleanCategory(raw: unknown): CategoryDef | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || !/^[a-z0-9_]{2,40}$/.test(raw.id)) return null;
  const base = BUILTIN_CATEGORIES.find(c => c.id === raw.id);
  // Built-ins may be stored as partial overrides; custom categories need a label.
  if (!base && (typeof raw.label !== 'string' || !raw.label.trim())) return null;
  const icon = typeof raw.icon === 'string' && raw.icon ? raw.icon : (base?.icon ?? 'FileText');
  const keywords = (raw.keywords === undefined && base ? base.keywords : stringArray(raw.keywords)).slice(0, 60);
  const formSignals = (raw.formSignals === undefined && base ? base.formSignals : stringArray(raw.formSignals))
    .filter((s): s is CategoryDef['formSignals'][number] =>
      ['card', 'otp', 'tel', 'file', 'password', 'bank', 'address', 'birthdate', 'email'].includes(s));
  return {
    id: raw.id,
    label: (typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : (base?.label ?? '')).slice(0, 60),
    description: (typeof raw.description === 'string' ? raw.description.trim() : (base?.description ?? '')).slice(0, 240),
    icon,
    keywords: [...keywords],
    formSignals: [...formSignals],
    weight: num(raw.weight, base?.weight ?? 1, 0, 10),
    trustWeight: num(raw.trustWeight, base?.trustWeight ?? 0, 0, 10),
    enabled: bool(raw.enabled, base?.enabled ?? true),
    builtIn: BUILTIN_IDS.has(raw.id),
    positive: bool(raw.positive, base?.positive ?? false),
  };
}

function cleanScanResult(raw: unknown): ScanResult | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.hostname !== 'string' || typeof raw.capturedAt !== 'string') return null;
  if (!isRecord(raw.effort) || !isRecord(raw.trust)) return null;
  if (!Array.isArray(raw.findings)) return null;
  return raw as unknown as ScanResult;
}

/** Merge stored/partial settings over defaults: keeps user overrides and custom
 * categories, drops malformed entries, appends any new built-ins to the order. */
export function mergeSettings(stored: unknown): Settings {
  const base: Settings = structuredClone(DEFAULT_SETTINGS);
  if (!isRecord(stored)) return base;

  const seen = new Set<string>();
  const categories: CategoryDef[] = [];
  if (Array.isArray(stored.categories)) {
    for (const raw of stored.categories) {
      const cat = cleanCategory(raw);
      if (cat && !seen.has(cat.id)) {
        seen.add(cat.id);
        categories.push(cat);
      }
    }
  }
  // Always carry every built-in: stored built-ins keep their overrides, missing
  // ones are restored to defaults.
  for (const builtin of BUILTIN_CATEGORIES) {
    if (!seen.has(builtin.id)) categories.push({ ...builtin, keywords: [...builtin.keywords], formSignals: [...builtin.formSignals] });
  }
  base.categories = categories;

  const d = isRecord(stored.display) ? stored.display : {};
  const storedOrder = stringArray(d.order).filter(id => categories.some(c => c.id === id));
  const orderedIds = new Set(storedOrder);
  const order = [...storedOrder, ...categories.map(c => c.id).filter(id => !orderedIds.has(id))];
  const storedHidden = stringArray(d.hidden).filter(id => categories.some(c => c.id === id));
  const sec = isRecord(d.sections) ? d.sections : {};
  const defs = DEFAULT_SETTINGS.display;
  base.display = {
    order,
    hidden: storedHidden,
    sections: {
      summary: bool(sec.summary, defs.sections.summary),
      effort: bool(sec.effort, defs.sections.effort),
      trust: bool(sec.trust, defs.sections.trust),
      steps: bool(sec.steps, defs.sections.steps),
      freePlan: bool(sec.freePlan, defs.sections.freePlan),
      redFlags: bool(sec.redFlags, defs.sections.redFlags),
    },
    position: POSITIONS.includes(d.position as string) ? (d.position as Settings['display']['position']) : defs.position,
    showQuotes: bool(d.showQuotes, defs.showQuotes),
  };

  const s = isRecord(stored.scoring) ? stored.scoring : {};
  const easyMax = Math.round(num(s.easyMax, base.scoring.easyMax, 0, 100));
  const moderateMax = Math.round(num(s.moderateMax, base.scoring.moderateMax, easyMax, 100));
  base.scoring = { easyMax, moderateMax: Math.max(moderateMax, easyMax) };

  const dom = isRecord(stored.domains) ? stored.domains : {};
  const cleanDomains = (v: unknown) => stringArray(v).map(x => x.trim().toLowerCase()).filter(x => /^[a-z0-9.-]+$/.test(x));
  base.domains = { trusted: cleanDomains(dom.trusted), blocked: cleanDomains(dom.blocked) };

  const h = isRecord(stored.history) ? stored.history : {};
  base.history = { enabled: bool(h.enabled, base.history.enabled), max: Math.round(num(h.max, base.history.max, 1, 500)) };

  return base;
}

/** Validate an exported JSON blob: { settings, history } -> merged data or { error }. */
export function validateImport(json: unknown): { settings: Settings; history: ScanResult[] } | { error: string } {
  if (!isRecord(json)) return { error: 'Not a JSON object.' };
  if (!isRecord(json.settings)) return { error: 'Missing "settings" object.' };
  const settings = mergeSettings(json.settings);
  let history: ScanResult[] = [];
  if (json.history !== undefined) {
    if (!Array.isArray(json.history)) return { error: '"history" must be an array.' };
    history = json.history.map(cleanScanResult).filter((r): r is ScanResult => r !== null);
  }
  return { settings, history };
}
