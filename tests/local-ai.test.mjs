import test from 'node:test';
import assert from 'node:assert/strict';

import { analyze, getAvailability, LocalModelError, MODEL_NAME } from '../src/ai/local.ts';
import { mergeSettings } from '../src/lib/settings.ts';

const settings = mergeSettings(null);
const capture = {
  url: 'http://localhost:5174/coffee.html',
  hostname: 'localhost',
  protocol: 'http:',
  title: 'Free coffee',
  siteName: 'Kapihan',
  headings: ['Free coffee'],
  text: 'Get a free coffee with a minimum spend of ₱199. Enter your mobile number and show the claim code in store.',
  forms: [],
  links: [],
  capturedAt: '2026-10-10T00:00:00.000Z',
};

const validAnalysis = {
  offerSummary: 'A free coffee requires a minimum spend.',
  offerType: 'with_purchase',
  requirements: [{ category: 'minimum_spend', required: true, detail: 'Spend ₱199.', quote: 'minimum spend of ₱199' }],
  steps: ['Spend ₱199', 'Enter a mobile number', 'Show the code in store'],
  costs: { upfront: null, recurring: null, minimumSpend: '₱199' },
  freePlan: 'no',
  redFlags: [],
};

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init });
}

async function withFetch(mock, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test('local AI uses fixed model, nested JSON schema, disabled thinking, and validates success', async () => {
  const progress = [];
  await withFetch(async (url, init) => {
    assert.equal(url, 'http://127.0.0.1:8081/v1/chat/completions');
    assert.equal(init.redirect, 'error');
    const body = JSON.parse(init.body);
    assert.equal(body.model, 'qwen3-0.6b');
    assert.equal(body.temperature, 0);
    assert.equal(body.max_tokens, 1200);
    assert.equal(body.stream, false);
    assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
    assert.equal(body.response_format.type, 'json_schema');
    assert.equal(body.response_format.json_schema.name, 'analysis');
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.response_format.json_schema.schema.type, 'object');
    assert.ok(body.messages[0].content.includes('You are RaccTion'));
    assert.ok(body.messages[1].content.includes('Free coffee'));
    assert.ok(body.messages[1].content.length < 3000);
    return jsonResponse({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(validAnalysis) } }] });
  }, async () => {
    assert.deepEqual(await analyze(capture, settings, { onProgress: value => progress.push(value) }), validAnalysis);
  });
  assert.equal(MODEL_NAME, 'Qwen3 0.6B');
  assert.deepEqual(progress, [0.05, 0.75, 1]);
});

test('availability requires a healthy server and exact qwen3-0.6b model id', async () => {
  await withFetch(async url => {
    if (String(url).endsWith('/health')) return jsonResponse({ status: 'ok' });
    return jsonResponse({ data: [{ id: 'qwen3-0.6b' }] });
  }, async () => assert.equal(await getAvailability(), 'available'));

  await withFetch(async () => new Response('', { status: 404 }),
    async () => assert.equal(await getAvailability(), 'unavailable'));

  await withFetch(async url => {
    if (String(url).endsWith('/health')) return jsonResponse({ status: 'ok' });
    return jsonResponse({ data: [{ id: 'different-model' }] });
  }, async () => assert.equal(await getAvailability(), 'unavailable'));
});

test('malformed, truncated, invalid, and HTTP error responses are rejected', async () => {
  const cases = [
    [jsonResponse({ choices: [{ finish_reason: 'stop', message: { content: '{"offerSummary":' } }] }), 'parse'],
    [jsonResponse({ choices: [] }), 'parse'],
    [jsonResponse({ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(validAnalysis) } }] }), 'parse'],
    [jsonResponse({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ ...validAnalysis, freePlan: 'maybe' }) } }] }), 'parse'],
    [new Response('server error', { status: 500 }), 'failed'],
  ];
  for (const [response, code] of cases) {
    await withFetch(async () => response, async () => {
      await assert.rejects(analyze(capture, settings), error => error instanceof LocalModelError && error.code === code);
    });
  }
});

test('analysis rejects disabled category ids', async () => {
  const disabled = structuredClone(settings);
  disabled.categories.find(category => category.id === 'minimum_spend').enabled = false;
  await withFetch(async () => jsonResponse({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(validAnalysis) } }] }), async () => {
    await assert.rejects(analyze(capture, disabled), error => error instanceof LocalModelError && error.code === 'parse');
  });
});

test('caller abort is surfaced as aborted', async () => {
  const controller = new AbortController();
  await withFetch((_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }), async () => {
    const pending = analyze(capture, settings, { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, error => error instanceof LocalModelError && error.code === 'aborted');
  });
});
