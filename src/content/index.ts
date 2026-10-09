import { capturePage, describeField } from './capture.ts';
import { isExcluded, matchField, type ProfileKey } from '../lib/autofill.ts';
import type { PageCapture } from '../lib/types.ts';

// Injected by chrome.scripting on demand. Guard against double injection:
// a second executeScript run re-evaluates this file, but the listener only
// registers once.
declare global {
  interface Window { __racction?: boolean }
}

const SWEEP_ID = 'racction-sweep';
const IFRAME_ID = 'racction-overlay';
const STYLE_ID = 'racction-style';
const HIGHLIGHT_NAME = 'racction-hit';

const SWEEP_CSS = `
#${SWEEP_ID} { position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; background: rgba(38, 61, 49, 0.07); }
#${SWEEP_ID} .racction-line { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: linear-gradient(90deg, transparent, rgba(169, 193, 148, 0.95), transparent); box-shadow: 0 0 24px 6px rgba(169, 193, 148, 0.55); animation: racction-scan 1.6s ease-in-out infinite; }
#${SWEEP_ID} .racction-pill { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: #263d31; color: #f6f1e5; font: 600 13px 'DM Sans', system-ui, sans-serif; padding: 8px 16px; }
@keyframes racction-scan { 0% { top: 0; } 50% { top: calc(100% - 3px); } 100% { top: 0; } }
::highlight(${HIGHLIGHT_NAME}) { background: #f3d27a; color: #1d211d; }
@media (prefers-reduced-motion: reduce) { #${SWEEP_ID} .racction-line { animation: none; display: none; } }
`;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function ensureStyle() {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = SWEEP_CSS;
    document.documentElement.appendChild(style);
  }
}

function showSweep() {
  ensureStyle();
  if (document.getElementById(SWEEP_ID)) return;
  const sweep = document.createElement('div');
  sweep.id = SWEEP_ID;
  const line = document.createElement('div');
  line.className = 'racction-line';
  sweep.appendChild(line);
  if (reducedMotion()) {
    const pill = document.createElement('div');
    pill.className = 'racction-pill';
    pill.textContent = 'Scanning…';
    sweep.appendChild(pill);
  }
  document.documentElement.appendChild(sweep);
}

function removeSweep() {
  document.getElementById(SWEEP_ID)?.remove();
}

function positionStyles(position: string): string {
  switch (position) {
    case 'top-right': return 'top:16px;right:16px;';
    case 'bottom-left': return 'bottom:16px;left:16px;';
    default: return 'bottom:16px;right:16px;';
  }
}

function ensureIframe(tabId: number, position: string): HTMLIFrameElement {
  ensureStyle();
  let iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = IFRAME_ID;
    iframe.src = chrome.runtime.getURL(`overlay.html?tab=${tabId}`);
    iframe.setAttribute('allow', '');
    document.documentElement.appendChild(iframe);
    window.addEventListener('message', onIframeMessage);
  }
  applyIframeSize(iframe, position, false);
  return iframe;
}

function applyIframeSize(iframe: HTMLIFrameElement, position: string, minimized: boolean) {
  iframe.style.cssText = minimized
    ? `position:fixed;${positionStyles(position)}width:64px;height:64px;border:0;z-index:2147483647;background:transparent;`
    : `position:fixed;${positionStyles(position)}width:380px;height:min(620px,calc(100vh - 32px));border:0;z-index:2147483647;box-shadow:0 18px 60px rgba(5,12,9,.5);background:#f6f1e5;`;
  iframe.dataset.position = position;
  iframe.dataset.minimized = String(minimized);
}

function removeOverlay() {
  document.getElementById(IFRAME_ID)?.remove();
  removeSweep();
  try { (CSS as unknown as { highlights?: Map<string, unknown> }).highlights?.delete(HIGHLIGHT_NAME); } catch { /* noop */ }
}

function onIframeMessage(event: MessageEvent) {
  const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null;
  if (!iframe || event.source !== iframe.contentWindow) return;
  const data = event.data as { source?: string; type?: string } | null;
  if (!data || data.source !== 'racction') return;
  const position = iframe.dataset.position || 'bottom-right';
  if (data.type === 'minimize') applyIframeSize(iframe, position, true);
  else if (data.type === 'expand') applyIframeSize(iframe, position, false);
  else if (data.type === 'close') removeOverlay();
}

// Light per-character normalization that keeps a 1:1 index map back to raw text.
function normChar(ch: string): string {
  const lower = ch.toLowerCase();
  if ('’‘`´ʼ'.includes(lower)) return "'";
  if ('“”«»„'.includes(lower)) return '"';
  if ('‐‑‒–—―−'.includes(lower)) return '-';
  if (/\s/.test(lower)) return ' ';
  return lower;
}

function normQuote(q: string): string {
  let out = '';
  let ws = false;
  for (const ch of q) {
    const n = normChar(ch);
    if (n === ' ') { if (!ws) out += ' '; ws = true; } else { out += n; ws = false; }
  }
  return out.trim();
}

/** Find the quote on the page, highlight it via the CSS Highlight API and
 * scroll it into view. Returns whether a match was found. */
function highlightQuote(quote: string): boolean {
  const probe = normQuote(quote).slice(0, 60);
  if (!probe) return false;

  const walker = document.createTreeWalker(document.body ?? document.documentElement, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    if (node.parentElement && !/^(SCRIPT|STYLE|NOSCRIPT)$/.test(node.parentElement.tagName)) nodes.push(node as Text);
    node = walker.nextNode();
  }

  // Concatenate normalized text while keeping normIndex -> (node, rawOffset).
  let norm = '';
  const map: { node: Text; offset: number }[] = [];
  let pendingWs = false;
  for (const n of nodes) {
    const raw = n.data;
    for (let i = 0; i < raw.length; i++) {
      const c = normChar(raw[i]);
      if (c === ' ') {
        pendingWs = true;
      } else {
        if (pendingWs && norm.length > 0) { norm += ' '; map.push({ node: n, offset: i }); }
        pendingWs = false;
        norm += c;
        map.push({ node: n, offset: i });
      }
    }
  }

  const idx = norm.indexOf(probe);
  if (idx < 0) return false;
  const start = map[idx];
  const end = map[Math.min(idx + probe.length - 1, map.length - 1)];
  if (!start || !end) return false;

  try {
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset + 1);
    const highlights = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
    const HighlightCtor = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
    if (highlights && HighlightCtor) highlights.set(HIGHLIGHT_NAME, new HighlightCtor(range));
    (start.node.parentElement ?? end.node.parentElement)?.scrollIntoView({
      block: 'center',
      behavior: reducedMotion() ? 'instant' : 'smooth',
    });
    return true;
  } catch {
    return false;
  }
}

// --- approved autofill -----------------------------------------------------
// Preview assigns each fillable field a key; values never reach this script —
// the extension page sends only the keys the user approved, with values.
type FillEl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
const fillFields = new Map<string, { el: FillEl; profileKey: ProfileKey }>();
// Structural types that are just unfillable — not listed under "Won't fill".
const STRUCTURAL_TYPES = new Set(['hidden', 'submit', 'button', 'image', 'reset', 'checkbox', 'radio']);
const SKIP_REASON = 'Never filled: payment/OTP/password field';

function fillVisible(el: FillEl): boolean {
  if (el.disabled) return false;
  if (!(el instanceof HTMLSelectElement) && el.readOnly) return false;
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return el.getClientRects().length > 0;
}

function fillFieldLabel(el: FillEl): string {
  const f = describeField(el);
  return f ? (f.label || f.name || f.placeholder || el.type) : (el.name || el.id || el.type);
}

function fillPreview() {
  fillFields.clear();
  const fields: { key: string; label: string; profileKey: ProfileKey }[] = [];
  const skipped: { label: string; reason: string }[] = [];
  let seq = 0;
  document.querySelectorAll('input, textarea, select').forEach(el => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
    if (!fillVisible(el)) return;
    const info = describeField(el);
    if (!info) return;
    const profileKey = matchField(info);
    if (profileKey) {
      const key = `f${++seq}`;
      fillFields.set(key, { el, profileKey });
      fields.push({ key, label: fillFieldLabel(el), profileKey });
    } else if (isExcluded(info) && !STRUCTURAL_TYPES.has(info.type.toLowerCase())) {
      skipped.push({ label: fillFieldLabel(el), reason: SKIP_REASON });
    }
  });
  return { origin: location.origin, fields, skipped };
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value); else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillNow(msg: { origin: string; items: { key: string; value: string }[] }) {
  if (msg.origin !== location.origin) return { filled: 0, skipped: (msg.items ?? []).map(i => i.key), refused: true };
  const skipped: string[] = [];
  let filled = 0;
  for (const item of msg.items ?? []) {
    const entry = fillFields.get(item.key);
    const el = entry?.el;
    if (!entry || !el || !el.isConnected || !fillVisible(el)) { skipped.push(item.key); continue; }
    const info = describeField(el);
    if (!info || matchField(info) !== entry.profileKey) { skipped.push(item.key); continue; }
    if (el instanceof HTMLSelectElement) {
      const want = item.value.toLowerCase();
      const opt = Array.from(el.options).find(o => o.value.toLowerCase() === want || (o.textContent ?? '').toLowerCase() === want);
      if (!opt) { skipped.push(item.key); continue; }
      el.value = opt.value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      setNativeValue(el, item.value);
    }
    el.style.outline = '2px solid #4f7057';
    el.style.outlineOffset = '1px';
    setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 2500);
    filled++;
  }
  return { filled, skipped };
}

type Msg =
  | { type: 'racction:start'; tabId: number; position?: string }
  | { type: 'racction:capture' }
  | { type: 'racction:stage'; stage: string }
  | { type: 'racction:highlight'; quote: string }
  | { type: 'racction:fill-preview' }
  | { type: 'racction:fill'; origin: string; items: { key: string; value: string }[] }
  | { type: 'racction:close' };

if (!window.__racction) {
  window.__racction = true;
  chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
    try {
      switch (msg?.type) {
        case 'racction:start':
          showSweep();
          ensureIframe(msg.tabId, msg.position ?? 'bottom-right');
          sendResponse({ ok: true });
          break;
        case 'racction:capture':
          sendResponse(capturePage() satisfies PageCapture);
          break;
        case 'racction:stage':
          if (msg.stage === 'done' || msg.stage === 'error') removeSweep();
          sendResponse({ ok: true });
          break;
        case 'racction:highlight':
          sendResponse({ found: highlightQuote(msg.quote ?? '') });
          break;
        case 'racction:fill-preview':
          sendResponse(fillPreview());
          break;
        case 'racction:fill':
          sendResponse(fillNow(msg));
          break;
        case 'racction:close':
          removeOverlay();
          sendResponse({ ok: true });
          break;
        default:
          return false;
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
    return true;
  });
}
