import test from 'node:test';
import assert from 'node:assert/strict';

// Smoke test for the service-worker orchestration: mocks the chrome.* surface,
// imports src/background/index.ts, fires a scan and checks the staged
// ScanState writes land in chrome.storage.session (keyword-only mode — there
// is no LanguageModel in Node).

const localStore = {};
const sessionStore = {};
const calls = { executeScript: 0, tabMessages: [], badgeText: null, badgeColor: null, optionsOpened: false };
const listeners = { installed: null, message: null };
globalThis.fetch = async () => new Response('{}', { status: 503 });

globalThis.chrome = {
  runtime: {
    onInstalled: { addListener: fn => { listeners.installed = fn; } },
    onMessage: { addListener: fn => { listeners.message = fn; } },
    openOptionsPage: () => { calls.optionsOpened = true; },
  },
  storage: {
    local: {
      get: async key => (key in localStore ? { [key]: localStore[key] } : {}),
      set: async obj => Object.assign(localStore, obj),
      remove: async key => { delete localStore[key]; },
    },
    session: {
      get: async key => (key in sessionStore ? { [key]: sessionStore[key] } : {}),
      set: async obj => Object.assign(sessionStore, obj),
      remove: async key => { delete sessionStore[key]; },
      onChanged: { addListener: () => {}, removeListener: () => {} },
    },
    onChanged: { addListener: () => {}, removeListener: () => {} },
  },
  tabs: {
    get: async () => ({ url: 'http://localhost:5174/coffee.html' }),
    sendMessage: async (_tabId, msg) => {
      calls.tabMessages.push(msg.type);
      if (msg.type === 'racction:capture') return capture;
      return { ok: true };
    },
  },
  scripting: { executeScript: async () => { calls.executeScript++; } },
  action: {
    setBadgeText: async ({ text }) => { calls.badgeText = text; },
    setBadgeBackgroundColor: async ({ color }) => { calls.badgeColor = color; },
  },
};

const capture = {
  url: 'http://localhost:5174/coffee.html',
  hostname: 'localhost',
  protocol: 'http:',
  title: 'Free coffee at Kapihan Co.',
  siteName: 'Kapihan Co.',
  headings: ['Free coffee at Kapihan Co.'],
  text: [
    'Free coffee at Kapihan Co.! Get one free brewed coffee with a minimum spend of ₱199 at participating branches.',
    'Just enter your mobile number to get a claim code, then show the code in-store.',
    'Choose from any brewed coffee size at participating branches nationwide.',
    'Valid until June 30, 2027. One claim per person.',
    'This paragraph pads the page so it comfortably passes the minimum text length for scoring.',
  ].join(' '),
  forms: [{ type: 'tel', name: 'mobile', label: 'Mobile number', autocomplete: 'tel', placeholder: '' }],
  links: [],
  capturedAt: '2026-10-10T00:00:00.000Z',
};

await import('../src/background/index.ts');

const waitForDone = async () => {
  for (let i = 0; i < 100; i++) {
    if (sessionStore['scan:1']?.stage === 'done' || sessionStore['scan:1']?.stage === 'error') return sessionStore['scan:1'];
    await new Promise(r => setTimeout(r, 20));
  }
  return sessionStore['scan:1'];
};

test('service worker scan: staged state lands in session storage, keyword-only result', async () => {
  listeners.installed({ reason: 'install' });
  assert.equal(calls.optionsOpened, true, 'install should open the options page');

  let response;
  listeners.message({ type: 'scan', tabId: 1 }, {}, r => { response = r; });
  assert.deepEqual(response, { ok: true });

  const state = await waitForDone();
  assert.equal(state.stage, 'done', `expected done, got ${state.stage}: ${state.error ?? ''}`);
  assert.ok(calls.executeScript >= 1, 'content.js should be injected');
  assert.ok(calls.tabMessages.includes('racction:start'));
  assert.ok(calls.tabMessages.includes('racction:capture'));
  assert.ok(calls.tabMessages.includes('racction:stage'));

  const { result } = state;
  assert.equal(result.effort.level, 'moderate');
  assert.equal(result.effort.score, 5);
  assert.equal(result.trust.level, 'ok');
  assert.equal(result.aiUsed, false);
  assert.ok(result.aiNote.includes('keyword'));
  assert.equal(calls.badgeText, '3');
  assert.equal(calls.badgeColor, '#395035');

  const history = localStore['history'];
  assert.ok(Array.isArray(history) && history.length === 1 && history[0].capturedAt === capture.capturedAt,
    'result should be saved to history');
});

test('service worker: restricted page goes straight to error stage', async () => {
  const tabGet = chrome.tabs.get;
  chrome.tabs.get = async () => ({ url: 'chrome://extensions' });
  chrome.scripting.executeScript = async () => { throw new Error('restricted'); };
  try {
    listeners.message({ type: 'scan', tabId: 2 }, {}, () => {});
    for (let i = 0; i < 100 && sessionStore['scan:2']?.stage !== 'error'; i++) await new Promise(r => setTimeout(r, 20));
    assert.equal(sessionStore['scan:2']?.stage, 'error');
    assert.ok(sessionStore['scan:2'].error.length > 0);
  } finally {
    chrome.tabs.get = tabGet;
    chrome.scripting.executeScript = async () => {};
  }
});

test('service worker: model-status responds with availability', async () => {
  let response;
  const ret = listeners.message({ type: 'model-status' }, {}, r => { response = r; });
  assert.equal(ret, true);
  for (let i = 0; i < 50 && !response; i++) await new Promise(r => setTimeout(r, 20));
  assert.equal(response.availability, 'unavailable');
});

test('service worker: local AI labels persist and unsupported free-plan claims are withheld', async () => {
  const previousFetch = globalThis.fetch;
  const analysis = {
    offerSummary: 'Claim a coffee after a minimum spend and a store visit.',
    offerType: 'with_purchase',
    requirements: [{ category: 'minimum_spend', required: true, detail: 'Spend at least ₱199.', quote: 'minimum spend of ₱199' }],
    steps: ['Spend ₱199.', 'Show the claim code in-store.'],
    costs: { upfront: null, recurring: null, minimumSpend: '₱199' },
    freePlan: 'yes', redFlags: [],
  };
  globalThis.fetch = async url => new Response(JSON.stringify(
    String(url).endsWith('/health') ? { status: 'ok' } :
    String(url).endsWith('/v1/models') ? { data: [{ id: 'qwen3-0.6b' }] } :
    { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(analysis) } }] }
  ), { status: 200, headers: { 'Content-Type': 'application/json' } });
  try {
    listeners.message({ type: 'scan', tabId: 3 }, {}, () => {});
    for (let i = 0; i < 100 && sessionStore['scan:3']?.stage !== 'done'; i++) await new Promise(r => setTimeout(r, 20));
    const state = sessionStore['scan:3'];
    assert.equal(state.stage, 'done', state.error);
    assert.equal(state.result.aiUsed, true);
    assert.equal(state.result.aiModel, 'Qwen3 0.6B');
    assert.equal(state.result.freePlan, 'unclear');
    assert.equal(state.result.findings.find(f => f.categoryId === 'minimum_spend').source, 'ai');
    assert.equal(localStore.history[0].aiModel, 'Qwen3 0.6B');
  } finally { globalThis.fetch = previousFetch; }
});

test('service worker: malformed local AI output completes with keyword results', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async url => new Response(JSON.stringify(
    String(url).endsWith('/health') ? { status: 'ok' } :
    String(url).endsWith('/v1/models') ? { data: [{ id: 'qwen3-0.6b' }] } :
    { choices: [{ finish_reason: 'stop', message: { content: '{"requirements":null}' } }] }
  ), { status: 200 });
  try {
    listeners.message({ type: 'scan', tabId: 4 }, {}, () => {});
    for (let i = 0; i < 100 && sessionStore['scan:4']?.stage !== 'done'; i++) await new Promise(r => setTimeout(r, 20));
    assert.equal(sessionStore['scan:4'].stage, 'done');
    assert.equal(sessionStore['scan:4'].result.aiUsed, false);
    assert.match(sessionStore['scan:4'].result.aiNote, /couldn't be read/);
  } finally { globalThis.fetch = previousFetch; }
});
