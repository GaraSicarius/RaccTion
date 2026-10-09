import { useEffect, useState } from 'react';
import { Save, Trash2, UserRound } from 'lucide-react';
import type { Profile, ProfileKey } from '../../lib/autofill.ts';
import { encryptProfile } from '../../lib/profileCrypto.ts';
import { verifyPin } from '../../lib/pin.ts';
import { getPinRecord, getProfile, getProfileEnc, setProfile, setProfileEnc } from '../../lib/storage.ts';

const FIELD_META: { key: ProfileKey; label: string; type: string; placeholder: string }[] = [
  { key: 'fullName', label: 'Full name', type: 'text', placeholder: 'Juan M. Dela Cruz' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
  { key: 'mobile', label: 'Mobile number', type: 'tel', placeholder: '0917 123 4567' },
  { key: 'street', label: 'Street address', type: 'text', placeholder: 'Unit 4, 123 Sampaguita St.' },
  { key: 'city', label: 'City / municipality', type: 'text', placeholder: 'Quezon City' },
  { key: 'province', label: 'Province / region', type: 'text', placeholder: 'Metro Manila' },
  { key: 'postalCode', label: 'Postal / ZIP code', type: 'text', placeholder: '1100' },
  { key: 'birthdate', label: 'Birthdate', type: 'date', placeholder: '' },
];

function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" className="adm-toggle" role="switch" aria-pressed={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} />;
}

export default function AutofillSection({ gatePin }: { gatePin: string | null }) {
  const [form, setForm] = useState<Profile | null>(null);
  const [hasPin, setHasPin] = useState(false);
  const [remember, setRemember] = useState(false);
  const [encPin, setEncPin] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([getProfile(), getPinRecord(), getProfileEnc()]).then(([p, pin, enc]) => {
      setForm(p ?? {});
      setHasPin(!!pin);
      setRemember(!!enc);
    });
  }, []);

  if (!form) return null;

  const setField = (key: ProfileKey, value: string) => setForm(f => f && { ...f, [key]: value });
  const clean = (p: Profile): Profile =>
    Object.fromEntries(Object.entries(p).map(([k, v]) => [k, (v ?? '').trim()]).filter(([, v]) => v !== ''));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const profile = clean(form);
      await setProfile(Object.keys(profile).length ? profile : null);
      if (!hasPin || !remember) {
        await setProfileEnc(null);
      } else {
        let pin = gatePin;
        if (!pin) {
          const rec = await getPinRecord();
          const ok = rec ? await verifyPin(encPin, rec) : false;
          if (!ok) {
            setMsg({ kind: 'err', text: 'Enter your Admin PIN to keep an encrypted copy.' });
            return;
          }
          pin = encPin;
        }
        await setProfileEnc(await encryptProfile(profile, pin));
      }
      setMsg({ kind: 'ok', text: 'Details saved.' });
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await setProfile(null);
      await setProfileEnc(null);
      setForm({});
      setRemember(false);
      setMsg({ kind: 'ok', text: 'Details deleted.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="adm-section">
      <div className="adm-section-head"><UserRound size={19} /><h2>Autofill</h2></div>
      <div className="adm-section-body">
        <p>Details RaccTion can offer to type into forms <strong>only when you approve it</strong>, field by field, on a scanned page. RaccTion never fills passwords, card numbers, OTP or PIN codes, bank or ID numbers, uploads or consent checkboxes — and it never submits the form for you.</p>

        <div className="adm-profile-grid">
          {FIELD_META.map(meta => (
            <label key={meta.key} className="adm-profile-field">
              <span>{meta.label}</span>
              <input
                type={meta.type}
                value={form[meta.key] ?? ''}
                placeholder={meta.placeholder}
                autoComplete="off"
                onChange={e => setField(meta.key, e.target.value)}
              />
            </label>
          ))}
        </div>

        {hasPin ? (
          <div className="adm-field" style={{ marginTop: 14 }}>
            <div>
              <span className="adm-label">Remember on this device (encrypted)</span>
              <span className="adm-hint">
                Plaintext lives in session storage and is cleared when the browser closes.
                With this on, RaccTion also keeps an AES-GCM-256 copy only your PIN can unlock.
              </span>
            </div>
            <Toggle on={remember} onChange={setRemember} label="Remember on this device (encrypted)" />
          </div>
        ) : (
          <div className="adm-field" style={{ marginTop: 14 }}>
            <div>
              <span className="adm-label">Remember on this device (encrypted)</span>
              <span className="adm-hint">Needs an Admin PIN — set one in Security first.</span>
            </div>
            <Toggle on={false} onChange={() => {}} label="Remember on this device (encrypted)" disabled />
          </div>
        )}

        {hasPin && remember && !gatePin && (
          <label className="adm-profile-field" style={{ maxWidth: 220 }}>
            <span>Admin PIN (to encrypt)</span>
            <input
              type="password" inputMode="numeric" minLength={4} maxLength={8} autoComplete="off"
              value={encPin} onChange={e => setEncPin(e.target.value.replace(/\D/g, ''))}
            />
          </label>
        )}

        <p className="adm-help" style={{ marginTop: 12 }}>
          {hasPin
            ? 'Plaintext stays in session storage (cleared when the browser closes); the encrypted copy is stored only if the toggle is on.'
            : 'Stored in session storage only — cleared when the browser closes.'}
        </p>

        {msg && <p role={msg.kind === 'err' ? 'alert' : 'status'} className={msg.kind === 'err' ? 'adm-error' : 'adm-help'}>{msg.text}</p>}

        <div className="adm-actions">
          <button className="primary-button" disabled={busy} onClick={() => void save()}><Save size={15} /> Save details</button>
          <button className="secondary-button" disabled={busy} onClick={() => void del()}><Trash2 size={15} /> Delete my details</button>
        </div>
      </div>
    </section>
  );
}


