// Approved-autofill field matching. Pure module — also used by node --test.
// Safety rule: anything payment/credential/identity/upload related returns null.

export type ProfileKey = 'fullName' | 'email' | 'mobile' | 'street' | 'city' | 'province' | 'postalCode' | 'birthdate';

export interface Profile {
  fullName?: string;
  email?: string;
  mobile?: string;
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  birthdate?: string;
}

export const PROFILE_KEYS: ProfileKey[] = ['fullName', 'email', 'mobile', 'street', 'city', 'province', 'postalCode', 'birthdate'];

export interface FieldLike {
  type: string;
  name: string;
  label: string;
  autocomplete: string;
  placeholder: string;
}

const EXCLUDED_TYPES = new Set(['password', 'hidden', 'file', 'checkbox', 'radio', 'submit', 'button', 'image', 'reset']);

const SENSITIVE_RE = /card|cvv|cvc|expiry|otp|one[- ]?time|verification|\bpin\b|mpin|password|passcode|account\s+(no\.?|num\.?|number)|\bbank\b|\btin\b|\bsss\b|philsys|id\s+number|passport|licen[cs]e|captcha/i;

function haystack(f: FieldLike): string {
  return `${f.label} ${f.name} ${f.placeholder}`.replace(/[^a-z0-9]+/gi, ' ').toLowerCase();
}

/** True when the field looks sensitive or structurally unfillable — never filled. */
export function isExcluded(f: FieldLike): boolean {
  const type = (f.type || '').toLowerCase();
  if (EXCLUDED_TYPES.has(type)) return true;
  const ac = (f.autocomplete || '').toLowerCase();
  if (ac.startsWith('cc-') || ac === 'one-time-code' || ac === 'new-password' || ac === 'current-password') return true;
  return SENSITIVE_RE.test(haystack(f));
}

const AUTOCOMPLETE_MAP: [RegExp, ProfileKey][] = [
  [/^name$/, 'fullName'],
  [/^email$/, 'email'],
  [/^tel$|^tel-national$/, 'mobile'],
  [/^street-address$|^address-line1$/, 'street'],
  [/^address-level2$/, 'city'],
  [/^address-level1$/, 'province'],
  [/^postal-code$/, 'postalCode'],
  [/^bday/, 'birthdate'],
];

const LABEL_MAP: [RegExp, ProfileKey][] = [
  [/e-?mail/, 'email'],
  [/birth|bday|kaarawan/, 'birthdate'],
  [/zip|postal/, 'postalCode'],
  [/mobile|phone|cellphone|contact number|numero/, 'mobile'],
  [/city|municipality|lungsod/, 'city'],
  [/province|probinsya|region/, 'province'],
  [/full name|your name|^name$|pangalan/, 'fullName'],
  [/address|street|tirahan/, 'street'],
];

/** Map a form field to the profile key it could receive, or null if it must
 * never be filled (sensitive) or doesn't match anything we store. */
export function matchField(f: FieldLike): ProfileKey | null {
  if (isExcluded(f)) return null;

  const tokens = (f.autocomplete || '').toLowerCase().split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    for (const [re, key] of AUTOCOMPLETE_MAP) if (re.test(token)) return key;
  }

  const type = (f.type || '').toLowerCase();
  if (type === 'email') return 'email';
  if (type === 'tel') return 'mobile';

  const text = haystack(f);
  for (const [re, key] of LABEL_MAP) if (re.test(text)) return key;
  return null;
}
