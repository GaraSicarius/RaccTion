import { analyze, getAvailability, LocalModelError, MODEL_NAME, type Availability } from '../ai/local.ts';
import type { AiAnalysis } from '../ai/prompt.ts';
import { ruleScan } from '../lib/rules.ts';
import { buildResult, mergeFindings, validatedAiFlags } from '../lib/scoring.ts';
import { mergeSettings } from '../lib/settings.ts';
import { addHistory, getScanState, getSettings, setScanState } from '../lib/storage.ts';
import type { PageCapture, ScanResult, ScanStage, ScanState } from '../lib/types.ts';

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') chrome.runtime.openOptionsPage();
});

const RUNNING_STALE_MS = 260_000;
const AI_TIMEOUT_MS = 240_000;
const KEEPALIVE_MS = 20_000;
const WRITE_THROTTLE_MS = 400;

chrome.runtime.onMessage.addListener((msg: { type?: string; tabId?: number }, _sender, sendResponse) => {
  if (msg?.type === 'scan' || msg?.type === 'rescan') {
    if (typeof msg.tabId !== 'number') {
      sendResponse({ ok: false, error: 'No tab specified.' });
      return false;
    }
    // Respond now — the scan itself runs detached and reports through
    // chrome.storage.session progress writes (which also keep the worker alive).
    void runScan(msg.tabId);
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === 'model-status') {
    getAvailability()
      .then(availability => sendResponse({ availability }))
      .catch(() => sendResponse({ availability: 'unavailable' satisfies Availability }));
    return true;
  }
  return false;
});

const RESTRICTED = /^(chrome|edge|about|view-source|devtools|chrome-extension|moz-extension|brave|vivaldi|opera):|chromewebstore\.google\.com|microsoftedge\.microsoft\.com|addons\.opera\.com/;

function friendlyPageError(url: string): string {
  if (/^file:/.test(url)) return 'RaccTion needs "Allow access to file URLs" turned on in extension settings to scan local pages.';
  if (RESTRICTED.test(url)) return 'This page can\'t be scanned — the browser blocks extensions here.';
  return 'This page can\'t be scanned.';
}

function aiNoteFor(err: unknown): string {
  if (err instanceof LocalModelError) {
    switch (err.code) {
      case 'timeout':
      case 'aborted':
        return 'AI timed out — showing keyword results.';
      case 'parse':
        return 'AI response couldn\'t be read — showing keyword results.';
      default:
        return 'Local model is not available — showing keyword results.';
    }
  }
  return 'AI response couldn\'t be read — showing keyword results.';
}

function badgeColor(trust: ScanResult['trust']['level']): string {
  switch (trust) {
    case 'ok': return '#395035';
    case 'careful': return '#704818';
    case 'high': return '#823d30';
    default: return '#6b6f66';
  }
}

async function updateBadge(tabId: number, result: ScanResult | null, settings: Awaited<ReturnType<typeof getSettings>>) {
  try {
    if (!result) {
      // Show something even when injection/scanning failed after the popup closed.
      await chrome.action.setBadgeText({ tabId, text: '!' });
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#6b6f66' });
      return;
    }
    const positive = new Set(settings.categories.filter(c => c.positive).map(c => c.id));
    const found = result.findings.filter(f => f.status !== 'not_found' && !positive.has(f.categoryId)).length;
    await chrome.action.setBadgeText({ tabId, text: String(found) });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor(result.trust.level) });
  } catch { /* badge is best-effort */ }
}

async function runScan(tabId: number): Promise<void> {
  const existing = await getScanState(tabId);
  if (existing && existing.stage !== 'done' && existing.stage !== 'error' && Date.now() - existing.updatedAt < RUNNING_STALE_MS) {
    return; // a scan for this tab is already running
  }

  const scanId = crypto.randomUUID();
  const startedAt = Date.now();
  let lastWrite = 0;

  const write = async (stage: ScanStage, progress: number, extra: Partial<ScanState> = {}, force = true) => {
    const now = Date.now();
    if (!force && now - lastWrite < WRITE_THROTTLE_MS) return;
    lastWrite = now;
    await setScanState({ scanId, tabId, stage, progress, startedAt, updatedAt: now, ...extra });
  };

  const fail = async (message: string) => {
    await write('error', 1, { error: message });
    try { await chrome.tabs.sendMessage(tabId, { type: 'racction:stage', stage: 'error' }); } catch { /* tab may not have the script */ }
    await updateBadge(tabId, null, await getSettings().catch(() => mergeSettings(null)));
  };

  try {
    // -- reading ----------------------------------------------------------
    await write('reading', 0.1);

    const tab = await chrome.tabs.get(tabId).catch(() => null);
    const url = tab?.url ?? '';
    if (url && RESTRICTED.test(url)) {
      await fail(friendlyPageError(url));
      return;
    }

    const settings = await getSettings();

    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    } catch {
      await fail(friendlyPageError(url));
      return;
    }

    try {
      await chrome.tabs.sendMessage(tabId, { type: 'racction:start', tabId, position: settings.display.position });
    } catch {
      await fail('Couldn\'t reach the page — try reloading it, then scan again.');
      return;
    }

    let capture: PageCapture;
    try {
      capture = (await chrome.tabs.sendMessage(tabId, { type: 'racction:capture' })) as PageCapture;
    } catch {
      await fail('Couldn\'t read this page — try reloading it, then scan again.');
      return;
    }
    if (!capture || (!capture.text && capture.forms.length === 0)) {
      await fail('This page has no readable text to scan.');
      return;
    }

    // -- rules -------------------------------------------------------------
    const { findings: ruleFindings, signals } = ruleScan(capture, settings);
    const rulesResult = buildResult({
      capture,
      findings: mergeFindings(ruleFindings, null, capture, settings),
      steps: [],
      costs: { upfront: null, recurring: null, minimumSpend: null },
      freePlan: 'unclear',
      offerSummary: '',
      offerType: 'other',
      aiUsed: false,
      aiNote: 'Keyword scan only.',
      durationMs: Date.now() - startedAt,
      settings,
      signals,
      aiFlags: [],
    });
    await write('rules', 0.3, { partial: rulesResult });

    // -- AI (only when the model is already on this device) ------------------
    let ai: AiAnalysis | null = null;
    let aiNote: string | undefined;
    const availability = await getAvailability();
    if (availability === 'available') {
      await write('ai', 0.35, { partial: rulesResult });
      const controller = new AbortController();
      let timeout: ReturnType<typeof setTimeout> | undefined;
      // A pending fetch doesn't count as activity, so the browser may suspend the
      // worker mid-inference; calling an extension API resets its idle timer.
      const keepalive = setInterval(() => { void chrome.runtime.getPlatformInfo?.().catch(() => {}); }, KEEPALIVE_MS);
      try {
        // Bound inference even if the local server stops responding.
        const outcome = await Promise.race([
          analyze(capture, settings, {
            signal: controller.signal,
            onProgress: fraction => {
              void write('ai', 0.35 + fraction * 0.55, { partial: rulesResult }, false);
            },
          }),
          new Promise<'timeout'>(res => { timeout = setTimeout(() => res('timeout'), AI_TIMEOUT_MS); }),
        ]);
        if (outcome === 'timeout') {
          controller.abort();
          ai = null;
          aiNote = 'AI timed out — showing keyword results.';
        } else {
          ai = outcome;
        }
      } catch (err) {
        ai = null;
        aiNote = aiNoteFor(err instanceof DOMException && err.name === 'AbortError' ? new LocalModelError('timeout') : err);
      } finally {
        if (timeout) clearTimeout(timeout);
        clearInterval(keepalive);
      }
    } else {
      aiNote = 'Local model is not running — keyword scan only. Start the local AI server from Admin.';
    }

    // -- scoring -------------------------------------------------------------
    await write('scoring', 0.95, { partial: rulesResult });

    const merged = mergeFindings(ruleFindings, ai, capture, settings);
    const aiFlags = validatedAiFlags(ai, capture);
    const freePlanFound = merged.some(f => f.categoryId === 'free_plan' && f.status !== 'not_found');
    const result = buildResult({
      capture,
      findings: merged,
      steps: ai?.steps ?? [],
      costs: ai?.costs ?? { upfront: null, recurring: null, minimumSpend: null },
      // A small model's unsupported "free" claim must not reassure the user.
      freePlan: freePlanFound ? 'yes' : ai?.freePlan === 'yes' ? 'unclear' : ai?.freePlan ?? 'unclear',
      offerSummary: ai?.offerSummary ?? '',
      offerType: ai?.offerType ?? 'other',
      aiUsed: ai !== null,
      aiModel: ai !== null ? MODEL_NAME : undefined,
      aiNote: ai === null ? aiNote : undefined,
      durationMs: Date.now() - startedAt,
      settings,
      signals,
      aiFlags,
    });

    await write('done', 1, { result, partial: rulesResult });
    try { await chrome.tabs.sendMessage(tabId, { type: 'racction:stage', stage: 'done' }); } catch { /* sweep already gone */ }
    await updateBadge(tabId, result, settings);
    try { await addHistory(result); } catch { /* history is best-effort */ }
  } catch (err) {
    await fail(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
