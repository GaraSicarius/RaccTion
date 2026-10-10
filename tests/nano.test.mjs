import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, getAvailability, NanoError } from '../src/ai/nano.ts';
import { mergeSettings } from '../src/lib/settings.ts';
import { SAMPLE_CAPTURE } from '../src/lib/sample.ts';

test('Gemini Nano reports no-api and rejects inference when Chrome Prompt API is absent', async () => {
  assert.equal(await getAvailability(), 'no-api');
  await assert.rejects(analyze(SAMPLE_CAPTURE, mergeSettings(null)), error => error instanceof NanoError && error.code === 'no-api');
});

test('Gemini Nano uses constrained Prompt API streaming and releases the cloned session', async () => {
  const previous = globalThis.LanguageModel;
  const result = { offerSummary: 'A prize requires an upfront payment.', offerType: 'giveaway_prize', requirements: [], steps: [], costs: { upfront: '₱199', recurring: null, minimumSpend: null }, freePlan: 'no', redFlags: [] };
  let destroyed = false;
  const session = {
    async *promptStreaming(input, options) {
      assert.ok(input.includes('PAGE TEXT:'));
      assert.ok(options.responseConstraint.properties.requirements);
      const output = JSON.stringify(result);
      yield output.slice(0, 30);
      yield output.slice(30);
    },
    destroy() { destroyed = true; },
  };
  globalThis.LanguageModel = {
    availability: async () => 'available',
    create: async options => {
      assert.ok(options.initialPrompts[0].content.includes('RaccTion'));
      return { clone: async () => session };
    },
  };
  try {
    assert.deepEqual(await analyze(SAMPLE_CAPTURE, mergeSettings(null)), result);
    assert.equal(destroyed, true);
  } finally { globalThis.LanguageModel = previous; }
});
