import type { FormField, PageCapture } from '../lib/types.ts';

const SKIP_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'image', 'reset', 'checkbox', 'radio']);
const MAX_TEXT = 60_000;
const TERMS_RE = /terms|conditions|mechanics|t&c|rules|privacy|dti/i;

function fieldLabel(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    const aria = el.getAttribute('aria-label');
    if (aria) return aria.trim();
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label?.textContent?.trim()) return label.textContent.trim();
    }
    const wrapping = el.closest('label');
    if (wrapping?.textContent?.trim()) return wrapping.textContent.trim().slice(0, 120);
  }
  return '';
}

export function describeField(el: HTMLElement): FormField | null {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return null;
  return {
    type: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
    name: el.name || el.id || '',
    label: fieldLabel(el).slice(0, 120),
    autocomplete: el.getAttribute('autocomplete') ?? '',
    placeholder: (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.placeholder : '').slice(0, 120),
  };
}

export function capturePage(): PageCapture {
  const text = (document.body?.innerText ?? '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT);

  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map(h => (h.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 20);

  const forms: FormField[] = Array.from(document.querySelectorAll('input, select, textarea'))
    .filter((el): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
      el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)
    .filter(el => !(el instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(el.type)))
    .map(describeField)
    .filter((f): f is FormField => f !== null)
    .slice(0, 40);

  const links = Array.from(document.querySelectorAll('a[href]'))
    .map(a => ({ text: (a.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120), href: (a as HTMLAnchorElement).href }))
    .filter(l => l.href && (TERMS_RE.test(l.text) || TERMS_RE.test(l.href)))
    .slice(0, 20);

  const siteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim() ?? '';

  return {
    url: location.href,
    hostname: location.hostname,
    protocol: location.protocol,
    title: document.title ?? '',
    siteName,
    headings,
    text,
    forms,
    links,
    capturedAt: new Date().toISOString(),
  };
}
