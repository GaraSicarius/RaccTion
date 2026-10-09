import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveReviewStatus, reorderSections } from '../src/lib/review-rules.mjs';

test('warning indicator has explicit demo count boundaries', () => {
  assert.equal(deriveReviewStatus(0, false), 'clear');
  assert.equal(deriveReviewStatus(1, false), 'warning');
  assert.equal(deriveReviewStatus(2, false), 'high');
  assert.equal(deriveReviewStatus(3, false), 'high');
  assert.equal(deriveReviewStatus(20, false), 'high');
});

test('missing coverage takes precedence over every warning level', () => {
  for (const count of [0, 1, 2, 3, 20]) {
    assert.equal(deriveReviewStatus(count, true), 'unknown');
  }
});

test('warning counts reject values that cannot represent findings', () => {
  for (const count of [-1, 0.5, NaN, Infinity, '1']) {
    assert.throws(() => deriveReviewStatus(count, false), RangeError);
  }
});

test('priority moves exactly one section first while preserving other order', () => {
  const original = ['conditions', 'costs', 'steps', 'dates', 'eligibility'];
  for (const section of original) {
    assert.deepEqual(reorderSections(section), [section, ...original.filter((item) => item !== section)]);
  }
  assert.deepEqual(reorderSections('Costs first'), ['costs', 'conditions', 'steps', 'dates', 'eligibility']);
  assert.deepEqual(reorderSections('unknown'), original);
  assert.deepEqual(reorderSections('Key conditions'), original);
});
