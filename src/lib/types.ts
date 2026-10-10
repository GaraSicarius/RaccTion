export type FormSignal = 'card' | 'otp' | 'tel' | 'file' | 'password' | 'bank' | 'address' | 'birthdate' | 'email';

export interface CategoryDef {
  id: string;
  label: string;
  description: string;
  icon: string; // lucide icon name
  keywords: string[];
  formSignals: FormSignal[];
  weight: number;
  trustWeight: number; // >0 => counts as a trust red flag when found
  enabled: boolean;
  builtIn: boolean;
  positive?: boolean;
}

export interface FormField {
  type: string;
  name: string;
  label: string;
  autocomplete: string;
  placeholder: string;
}

export interface PageCapture {
  url: string;
  hostname: string;
  protocol: string;
  title: string;
  siteName: string;
  headings: string[];
  text: string;
  forms: FormField[];
  links: { text: string; href: string }[];
  capturedAt: string;
}

export type FindingStatus = 'required' | 'asked_in_form' | 'mentioned' | 'ai_inferred' | 'not_found';

export interface Finding {
  categoryId: string;
  status: FindingStatus;
  detail: string;
  quote?: string;
  source: 'ai' | 'rules' | 'form';
}

export interface TrustSignal {
  id: string;
  label: string;
  detail: string;
  points: number;
  quote?: string;
}

export interface ScanResult {
  url: string;
  hostname: string;
  title: string;
  offerSummary: string;
  offerType: string;
  findings: Finding[];
  steps: string[];
  costs: { upfront: string | null; recurring: string | null; minimumSpend: string | null };
  freePlan: 'yes' | 'no' | 'unclear';
  effort: { level: 'easy' | 'moderate' | 'hard' | 'unknown'; score: number | null; reasons: string[] };
  trust: {
    level: 'ok' | 'careful' | 'high' | 'unknown';
    points: number;
    signals: TrustSignal[];
    domainList?: 'trusted' | 'blocked';
  };
  aiUsed: boolean;
  aiModel?: string;
  aiNote?: string;
  durationMs: number;
  capturedAt: string;
}

export type ScanStage = 'reading' | 'rules' | 'ai' | 'scoring' | 'done' | 'error';

export interface ScanState {
  scanId: string;
  tabId: number;
  stage: ScanStage;
  progress: number;
  startedAt: number;
  updatedAt: number;
  partial?: ScanResult;
  result?: ScanResult;
  error?: string;
}

export interface Settings {
  version: 1;
  categories: CategoryDef[];
  display: {
    order: string[];
    hidden: string[];
    sections: { summary: boolean; effort: boolean; trust: boolean; steps: boolean; freePlan: boolean; redFlags: boolean };
    position: 'bottom-right' | 'top-right' | 'bottom-left';
    showQuotes: boolean;
  };
  scoring: { easyMax: number; moderateMax: number };
  domains: { trusted: string[]; blocked: string[] };
  history: { enabled: boolean; max: number };
}
