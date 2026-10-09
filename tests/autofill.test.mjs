import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { matchField, isExcluded } from '../src/lib/autofill.ts';
import { encryptProfile, decryptProfile } from '../src/lib/profileCrypto.ts';
import { validateImport } from '../src/lib/settings.ts';

const field = (over) => ({ type: 'text', name: '', label: '', autocomplete: '', placeholder: '', ...over });

describe('matchField', () => {
  test('type email/tel map directly', () => {
    assert.equal(matchField(field({ type: 'email' })), 'email');
    assert.equal(matchField(field({ type: 'tel' })), 'mobile');
  });

  test('autocomplete tokens map correctly', () => {
    assert.equal(matchField(field({ autocomplete: 'name' })), 'fullName');
    assert.equal(matchField(field({ autocomplete: 'shipping street-address' })), 'street');
    assert.equal(matchField(field({ autocomplete: 'tel-national' })), 'mobile');
    assert.equal(matchField(field({ autocomplete: 'postal-code' })), 'postalCode');
    assert.equal(matchField(field({ autocomplete: 'bday' })), 'birthdate');
    assert.equal(matchField(field({ autocomplete: 'address-level2' })), 'city');
    assert.equal(matchField(field({ autocomplete: 'address-level1' })), 'province');
  });

  test('label-based matching incl. Filipino variants', () => {
    assert.equal(matchField(field({ label: 'Full name' })), 'fullName');
    assert.equal(matchField(field({ label: 'Pangalan' })), 'fullName');
    assert.equal(matchField(field({ label: 'Tirahan' })), 'street');
    assert.equal(matchField(field({ label: 'Mobile number' })), 'mobile');
    assert.equal(matchField(field({ label: 'City' })), 'city');
    assert.equal(matchField(field({ placeholder: 'ZIP code' })), 'postalCode');
    assert.equal(matchField(field({ label: 'Birthdate' })), 'birthdate');
  });

  test('sensitive fields are never filled', () => {
    const cases = [
      field({ type: 'password' }),
      field({ autocomplete: 'cc-number' }),
      field({ autocomplete: 'cc-csc' }),
      field({ autocomplete: 'one-time-code' }),
      field({ autocomplete: 'new-password' }),
      field({ label: 'Card number' }),
      field({ label: 'CVV' }),
      field({ label: 'Enter the 6-digit OTP sent to your phone' }),
      field({ label: 'MPIN' }),
      field({ label: 'Bank account number' }),
      field({ type: 'file' }),
      field({ type: 'hidden' }),
      field({ type: 'checkbox', label: 'I agree to the terms' }),
      field({ label: 'TIN' }),
      field({ label: 'Passport number' }),
    ];
    for (const f of cases) assert.equal(matchField(f), null, JSON.stringify(f));
  });

  test('isExcluded flags sensitive, matchField ignores unmatched safe fields', () => {
    assert.equal(isExcluded(field({ label: 'OTP' })), true);
    assert.equal(matchField(field({ label: 'Company' })), null);
    assert.equal(isExcluded(field({ label: 'Company' })), false);
  });
});

describe('profileCrypto', () => {
  const profile = { fullName: 'Juan Dela Cruz', mobile: '09171234567', street: '123 Sampaguita St.' };

  test('encrypt/decrypt roundtrip', async () => {
    const enc = await encryptProfile(profile, '1234');
    const dec = await decryptProfile(enc, '1234');
    assert.deepEqual(dec, profile);
  });

  test('wrong PIN throws', async () => {
    const enc = await encryptProfile(profile, '1234');
    await assert.rejects(decryptProfile(enc, '9999'));
  });

  test('two encryptions of the same profile differ (random salt+IV)', async () => {
    const a = await encryptProfile(profile, '1234');
    const b = await encryptProfile(profile, '1234');
    assert.notEqual(a.data, b.data);
    assert.notEqual(a.salt, b.salt);
    assert.notEqual(a.iv, b.iv);
  });
});

describe('import/export safety', () => {
  test('profile/profileEnc keys in an import blob are not carried into settings', () => {
    const res = validateImport({
      settings: { version: 1 },
      history: [],
      profile: { fullName: 'Should not import' },
      profileEnc: { salt: 'x', iv: 'x', data: 'x', iterations: 1 },
    });
    assert.ok('settings' in res);
    assert.equal(res.settings.profile, undefined);
    assert.equal(res.settings.profileEnc, undefined);
    assert.deepEqual(Object.keys(res).sort(), ['history', 'settings']);
  });
});
