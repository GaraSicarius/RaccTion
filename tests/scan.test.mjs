import test from 'node:test';
import assert from 'node:assert/strict';

import { ruleScan } from '../src/lib/rules.ts';
import { SAMPLE_CAPTURE } from '../src/lib/sample.ts';
import { mergeSettings, validateImport, DEFAULT_SETTINGS } from '../src/lib/settings.ts';
import { validateQuote, mergeFindings, scoreEffort, scoreTrust, buildResult, validatedAiFlags } from '../src/lib/scoring.ts';
import { buildSchema, buildSystemPrompt, buildUserPrompt, keywordWindows } from '../src/ai/prompt.ts';
import { hashPin, verifyPin } from '../src/lib/pin.ts';

const settings = mergeSettings(null);

function capture(over) {
  return {
    url: 'http://localhost:5174/demo.html',
    hostname: 'localhost',
    protocol: 'http:',
    title: '',
    siteName: '',
    headings: [],
    text: '',
    forms: [],
    links: [],
    capturedAt: '2026-10-10T00:00:00.000Z',
    ...over,
  };
}

const field = (type, name, label = '', autocomplete = '', placeholder = '') => ({ type, name, label, autocomplete, placeholder });

// --- Demo page (a): fake GCash prize page (single-sourced from src/lib/sample.ts)
const prizeCapture = capture({ ...SAMPLE_CAPTURE });
const prizeText = SAMPLE_CAPTURE.text;

// --- Demo page (b): streaming trial ------------------------------------------
const trialText = [
  'Start your StreamPH Premium trial — free for 30 days.',
  'Enter your card details to activate streaming instantly.',
  'After the trial, your plan auto-renews at ₱549 per month.',
  'Cancel anytime at least 24 hours before the trial ends to avoid being billed.',
  'Create an account with your email and a password to begin watching.',
  'Enjoy thousands of movies and shows on any device during your trial.',
  'This paragraph pads the page so it comfortably passes the minimum text length.',
].join(' ');

const trialCapture = capture({
  url: 'http://localhost:5174/trial.html',
  title: 'StreamPH Premium — free for 30 days',
  siteName: 'StreamPH',
  headings: ['StreamPH Premium', 'Free for 30 days'],
  text: trialText,
  forms: [
    field('email', 'email', 'Email address', 'email'),
    field('password', 'password', 'Password'),
    field('text', 'cardnumber', 'Card number', 'cc-number'),
  ],
});

// --- Demo page (c): free coffee with minimum spend ---------------------------
const coffeeText = [
  'Free coffee at Kapihan Co.! Get one free brewed coffee with a minimum spend of ₱199 at participating branches.',
  'Just enter your mobile number to get a claim code, then show the code in-store.',
  'Choose from any brewed coffee size at participating branches nationwide.',
  'Valid until June 30, 2027. One claim per person.',
  'This paragraph pads the page so it comfortably passes the minimum text length for scoring.',
].join(' ');

const coffeeCapture = capture({
  url: 'http://localhost:5174/coffee.html',
  title: 'Free coffee at Kapihan Co.',
  siteName: 'Kapihan Co.',
  headings: ['Free coffee at Kapihan Co.'],
  text: coffeeText,
  forms: [field('tel', 'mobile', 'Mobile number')],
});

// --- Demo page (d): honest free plan -----------------------------------------
const freeText = [
  'NotePad Lite keeps your notes, lists and ideas in one place.',
  'The free plan is forever — no credit card required, and nothing to cancel later.',
  'If you want sync across devices, sign up with just your email address.',
  'Everything works offline. Upgrade only if you ever need team spaces.',
  'This paragraph pads the page so it comfortably passes the minimum text length for scoring.',
].join(' ');

const freeCapture = capture({
  url: 'http://localhost:5174/freeplan.html',
  title: 'NotePad Lite — free plan forever',
  siteName: 'NotePad Lite',
  headings: ['NotePad Lite', 'Free plan forever'],
  text: freeText,
  forms: [field('email', 'email', 'Email address', 'email')],
});

function rulesOnlyResult(cap) {
  const { findings, signals } = ruleScan(cap, settings);
  const merged = mergeFindings(findings, null, cap, settings);
  return buildResult({
    capture: cap,
    findings: merged,
    steps: [],
    costs: { upfront: null, recurring: null, minimumSpend: null },
    freePlan: 'unclear',
    offerSummary: '',
    offerType: 'other',
    aiUsed: false,
    durationMs: 0,
    settings,
    signals,
    aiFlags: [],
  });
}

test('demo (a): fake GCash prize page → hard effort, high trust risk, key signals', () => {
  const { signals } = ruleScan(prizeCapture, settings);
  const ids = signals.map(s => s.id);
  for (const id of ['otp_pin', 'prize_with_payment', 'brand_mismatch']) {
    assert.ok(ids.includes(id), `expected signal ${id}, got ${ids.join(',')}`);
  }
  const result = rulesOnlyResult(prizeCapture);
  assert.equal(result.effort.level, 'hard');
  assert.equal(result.trust.level, 'high');
  assert.equal(result.aiUsed, false);
});

test('demo (b): streaming trial → moderate effort, card asked in form', () => {
  const { findings } = ruleScan(trialCapture, settings);
  const card = findings.find(f => f.categoryId === 'card_details');
  assert.equal(card.status, 'asked_in_form');
  const result = rulesOnlyResult(trialCapture);
  assert.equal(result.effort.level, 'moderate');
  assert.equal(result.effort.score, 6); // card 3 + subscription 2 + signup 1
});

test('demo (c): coffee with minimum spend → moderate effort, trust ok', () => {
  const result = rulesOnlyResult(coffeeCapture);
  assert.equal(result.effort.level, 'moderate');
  assert.equal(result.effort.score, 5); // mobile 1 + min spend 2 + in person 2
  assert.equal(result.trust.level, 'ok');
  assert.equal(result.trust.points, 0);
});

test('demo (d): honest free plan → easy, trust ok, free_plan found', () => {
  const { findings } = ruleScan(freeCapture, settings);
  const free = findings.find(f => f.categoryId === 'free_plan');
  assert.ok(free, 'free_plan should be found');
  // "no credit card required" must NOT count as a card-details ask
  assert.ok(!findings.some(f => f.categoryId === 'card_details'), 'negated card mention should be skipped');
  const result = rulesOnlyResult(freeCapture);
  assert.equal(result.effort.level, 'easy');
  assert.equal(result.trust.level, 'ok');
});

test('negation filter: "no card required" is skipped, a later real ask still matches', () => {
  const negated = capture({ text: 'No credit card required. ' + 'Free forever for everyone. '.repeat(10) });
  assert.ok(!ruleScan(negated, settings).findings.some(f => f.categoryId === 'card_details'));

  const second = capture({
    text: 'Free plan, no card required. Enter your card number to upgrade to the paid tier whenever you want to unlock sync.',
  });
  const card = ruleScan(second, settings).findings.find(f => f.categoryId === 'card_details');
  assert.ok(card, 'second non-negated hit should be found');
  assert.equal(card.status, 'mentioned');
});

test('validateQuote: normalization handles case, curly quotes, dashes, whitespace', () => {
  const text = 'Pay the “Processing Fee” — only 3 slots left. It\u2019s easy.';
  assert.ok(validateQuote('pay the "processing fee" - only 3 slots left', text));
  assert.ok(validateQuote("IT'S EASY", text));
  assert.ok(validateQuote('  only   3\n slots   left ', text));
  assert.equal(validateQuote('not on the page at all', text), false);
  assert.equal(validateQuote('', text), false);
});

test('validateQuote: >120 char quotes match on first 80 normalized chars', () => {
  const start = 'congratulations gcash is celebrating its anniversary and you have been selected as a winner';
  const quote = 'Congratulations! GCash is celebrating its anniversary and YOU have been selected as a winner.' + ' x'.repeat(80);
  assert.ok(validateQuote(quote, prizeText), `probe: ${start}`);
});

test('mergeFindings: precedence required > asked_in_form > mentioned > ai_inferred > not_found', () => {
  const { findings: ruleFindings } = ruleScan(trialCapture, settings);
  const ai = {
    offerSummary: 'x', offerType: 'free_trial',
    requirements: [
      // valid quote → required beats the rule's asked_in_form
      { category: 'card_details', required: true, detail: 'Card required to start', quote: 'Enter your card details to activate streaming instantly' },
      // fabricated quote, no rule hit → ai_inferred
      { category: 'government_id', required: true, detail: 'ID upload required', quote: 'Upload a photo of your passport' },
    ],
    steps: [], costs: { upfront: null, recurring: null, minimumSpend: null },
    freePlan: 'yes', redFlags: [],
  };
  const merged = mergeFindings(ruleFindings, ai, trialCapture, settings);
  const byId = Object.fromEntries(merged.map(f => [f.categoryId, f]));
  assert.equal(byId.card_details.status, 'required');
  assert.equal(byId.card_details.source, 'ai');
  assert.equal(byId.government_id.status, 'ai_inferred');
  assert.equal(byId.subscription.status, 'mentioned'); // rule hit kept
  assert.equal(byId.survey.status, 'not_found');
});

test('mergeFindings: AI required:false + valid quote downgrades rule "mentioned", never "asked_in_form"', () => {
  const { findings: ruleFindings } = ruleScan(trialCapture, settings);
  const ai = {
    offerSummary: 'x', offerType: 'free_trial',
    requirements: [
      // AI read the context: the auto-renew mention is explained as optional → downgrade
      { category: 'subscription', required: false, detail: 'Trial can be cancelled', quote: 'auto-renews at ₱549 per month' },
      // asked_in_form is never downgraded, even when the AI says not required
      { category: 'card_details', required: false, detail: 'Card shown in the form', quote: 'Enter your card details to activate streaming instantly' },
    ],
    steps: [], costs: { upfront: null, recurring: null, minimumSpend: null },
    freePlan: 'yes', redFlags: [],
  };
  const merged = mergeFindings(ruleFindings, ai, trialCapture, settings);
  const byId = Object.fromEntries(merged.map(f => [f.categoryId, f]));
  assert.equal(byId.subscription.status, 'not_found', 'mentioned should be downgraded to not_found');
  assert.equal(byId.card_details.status, 'asked_in_form', 'asked_in_form must survive');
});

test('scoreEffort thresholds: 2 easy / 3 moderate / 6 moderate / 7 hard', () => {
  const mk = ids => ids.map(id => ({ categoryId: id, status: 'mentioned', detail: '', source: 'rules' }));
  assert.equal(scoreEffort(mk(['minimum_spend']), [], trialCapture, settings).level, 'easy'); // 2
  assert.equal(scoreEffort(mk(['card_details']), [], trialCapture, settings).level, 'moderate'); // 3
  assert.equal(scoreEffort(mk(['card_details', 'subscription', 'account_signup']), [], trialCapture, settings).level, 'moderate'); // 6
  assert.equal(scoreEffort(mk(['card_details', 'bank_ewallet', 'mobile_number']), [], trialCapture, settings).level, 'hard'); // 7
  // steps beyond 2 add points
  const steps = ['a', 'b', 'c', 'd'];
  assert.equal(scoreEffort(mk(['minimum_spend']), steps, trialCapture, settings).score, 4); // 2 + (4-2)
});

test('short captures (<200 chars) → effort and trust unknown', () => {
  const tiny = capture({ text: 'Win a phone! Pay now.' });
  const { findings, signals } = ruleScan(tiny, settings);
  assert.equal(scoreEffort(findings, [], tiny, settings).level, 'unknown');
  assert.equal(scoreEffort(findings, [], tiny, settings).score, null);
  assert.equal(scoreTrust(signals, [], tiny, settings).level, 'unknown');
});

test('blocked and trusted domain lists, including subdomains', () => {
  const s = mergeSettings({ domains: { blocked: ['evil.example'], trusted: ['trusted.example'] } });
  const blocked = capture({ ...trialCapture, hostname: 'promo.evil.example', text: trialText });
  assert.equal(scoreTrust([], [], blocked, s).level, 'high');
  assert.equal(scoreTrust([], [], blocked, s).domainList, 'blocked');
  const trusted = capture({ ...trialCapture, hostname: 'www.trusted.example', text: trialText });
  const trust = scoreTrust([], [], trusted, s);
  assert.equal(trust.domainList, 'trusted');
  assert.equal(trust.level, 'ok'); // still computed normally
  const unrelated = capture({ ...trialCapture, hostname: 'notevil.example', text: trialText });
  assert.equal(scoreTrust([], [], unrelated, s).domainList, undefined);
});

test('validatedAiFlags: fabricated quotes earn no trust points', () => {
  const ai = {
    offerSummary: '', offerType: 'giveaway_prize', requirements: [], steps: [],
    costs: { upfront: null, recurring: null, minimumSpend: null }, freePlan: 'unclear',
    redFlags: [
      { flag: 'Real flag', quote: 'Only 3 slots left' },
      { flag: 'Fabricated flag', quote: 'This text was never on the page' },
    ],
  };
  const flags = validatedAiFlags(ai, prizeCapture);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].flag, 'Real flag');
});

test('mergeSettings: garbage → defaults; custom category kept; malformed dropped; new built-ins appended to order', () => {
  assert.deepEqual(mergeSettings(42).categories.map(c => c.id), DEFAULT_SETTINGS.categories.map(c => c.id));
  assert.deepEqual(mergeSettings(null), DEFAULT_SETTINGS);

  const custom = { id: 'crypto_ask', label: 'Crypto payment', description: 'asks for crypto', keywords: ['usdt'], formSignals: [], weight: 3, trustWeight: 2, enabled: true };
  const stored = {
    categories: [
      { id: 'card_details', enabled: false, weight: 5 }, // built-in override
      { bad: 'entry' },                                   // malformed → dropped
      custom,                                             // custom → kept
    ],
    display: { order: ['crypto_ask', 'card_details'], hidden: ['survey'] },
  };
  const merged = mergeSettings(stored);
  const card = merged.categories.find(c => c.id === 'card_details');
  assert.equal(card.enabled, false);
  assert.equal(card.weight, 5);
  assert.equal(card.builtIn, true);
  const crypto = merged.categories.find(c => c.id === 'crypto_ask');
  assert.equal(crypto.builtIn, false);
  assert.equal(crypto.keywords[0], 'usdt');
  assert.ok(!merged.categories.some(c => c.bad));
  // order: kept ids first, then remaining categories appended
  assert.equal(merged.display.order[0], 'crypto_ask');
  assert.equal(merged.display.order[1], 'card_details');
  assert.equal(merged.display.order.length, merged.categories.length);
  assert.deepEqual(merged.display.hidden, ['survey']);
});

test('validateImport: rejects bad shapes, accepts settings+history', () => {
  assert.ok('error' in validateImport('nope'));
  assert.ok('error' in validateImport({ history: [] }));
  assert.ok('error' in validateImport({ settings: {}, history: 'not-an-array' }));
  const ok = validateImport({ settings: { scoring: { easyMax: 1 } }, history: [] });
  assert.ok('settings' in ok);
  assert.equal(ok.settings.scoring.easyMax, 1);
  assert.equal(ok.settings.scoring.moderateMax, 6);
});

test('buildSchema: enum excludes disabled and positive categories, includes custom', () => {
  const s = mergeSettings({
    categories: [
      ...DEFAULT_SETTINGS.categories.map(c => ({ ...c })),
      { id: 'crypto_ask', label: 'Crypto', description: 'asks crypto', keywords: ['usdt'], formSignals: [], weight: 2, trustWeight: 0, enabled: true },
    ],
  });
  s.categories.find(c => c.id === 'subscription').enabled = false;
  const enumIds = buildSchema(s).properties.requirements.items.properties.category.enum;
  assert.ok(!enumIds.includes('free_plan'), 'positive category must be excluded');
  assert.ok(!enumIds.includes('subscription'), 'disabled category must be excluded');
  assert.ok(enumIds.includes('crypto_ask'), 'custom category must be included');
  assert.ok(enumIds.includes('card_details'));
});

test('buildUserPrompt: stays in budget, contains keyword windows, fences page text', () => {
  const pad = 'filler '.repeat(2000);
  const cap = capture({
    url: 'https://x.example/p', title: 'Big page', headings: ['h1', 'h2'],
    text: pad + ' Please enter the 6-digit OTP sent to your phone now. ' + pad,
    forms: [field('text', 'otp', 'OTP code')],
  });
  const prompt = buildUserPrompt(cap, settings, 3000);
  const fenced = prompt.split('<<<\n')[1].split('\n>>>')[0];
  assert.ok(fenced.length <= 3000, `fenced text ${fenced.length} exceeds budget`);
  assert.ok(prompt.startsWith('PAGE URL: https://x.example/p'));
  assert.ok(prompt.includes('FORM FIELDS: text OTP code'));
  assert.ok(fenced.includes('6-digit OTP'), 'keyword window should include the OTP context');
});

test('prompt injection text stays inside the <<< >>> block', () => {
  const prompt = buildUserPrompt(prizeCapture, settings);
  const inside = prompt.split('<<<\n')[1].split('\n>>>')[0];
  assert.ok(inside.includes('Ignore previous instructions'));
  assert.ok(prompt.trimEnd().endsWith('>>>'));
  const system = buildSystemPrompt(settings);
  assert.ok(system.includes('untrusted data'));
  assert.ok(system.includes('- card_details: Card details'));
});

test('hashPin/verifyPin: right pin verifies, wrong pin fails', async () => {
  const rec = await hashPin('1234');
  assert.equal(typeof rec.salt, 'string');
  assert.equal(rec.iterations, 150000);
  assert.ok(await verifyPin('1234', rec));
  assert.ok(!(await verifyPin('9999', rec)));
  assert.ok(!(await verifyPin('1234', { salt: rec.salt, hash: 'AAAA', iterations: 1 })));
});

test('keywordWindows merges hits in page order', () => {
  const text = 'aaa pay here bbb ' + 'x'.repeat(800) + ' enter otp ccc';
  const wins = keywordWindows(text, settings);
  assert.ok(wins.length >= 2);
  assert.ok(wins[0].includes('pay here'));
});
