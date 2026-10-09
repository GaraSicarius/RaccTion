import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { hashPin, verifyPin, type PinRecord } from '../../lib/pin.ts';
import { decryptProfile, encryptProfile } from '../../lib/profileCrypto.ts';
import { getPinRecord, getProfileEnc, setAdminUnlocked, setPinRecord, setProfile, setProfileEnc } from '../../lib/storage.ts';

function PinInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>{label}
      <input
        type="password" inputMode="numeric" pattern="[0-9]*" minLength={4} maxLength={8}
        autoComplete="off" value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      />
    </label>
  );
}

export default function SecuritySection() {
  const [record, setRecord] = useState<PinRecord | null | undefined>(undefined);
  const [cur, setCur] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void getPinRecord().then(r => setRecord(r ?? null)); }, []);
  if (record === undefined) return null;

  const valid = /^\d{4,8}$/.test(pin) && pin === confirm;

  const save = async (needCurrent: boolean) => {
    setBusy(true);
    setMsg(null);
    try {
      if (needCurrent) {
        const ok = record ? await verifyPin(cur, record) : false;
        if (!ok) { setMsg({ kind: 'err', text: 'Current PIN is wrong.' }); return; }
      }
      await setPinRecord(await hashPin(pin));
      await setAdminUnlocked(true);
      // Re-encrypt a saved profile under the new PIN (decrypt with the old one).
      if (needCurrent) {
        const enc = await getProfileEnc();
        if (enc) {
          try {
            const p = await decryptProfile(enc, cur);
            await setProfileEnc(await encryptProfile(p, pin));
          } catch {
            await setProfileEnc(null);
          }
        }
      }
      setRecord(await getPinRecord());
      setCur(''); setPin(''); setConfirm('');
      setMsg({ kind: 'ok', text: 'PIN saved.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const ok = record ? await verifyPin(cur, record) : false;
      if (!ok) { setMsg({ kind: 'err', text: 'Current PIN is wrong.' }); return; }
      // Keep details usable for the rest of the session; drop the encrypted copy.
      const enc = await getProfileEnc();
      if (enc) {
        try { await setProfile(await decryptProfile(enc, cur)); } catch { /* corrupt */ }
      }
      await setProfileEnc(null);
      await setPinRecord(null);
      await setAdminUnlocked(true);
      setRecord(null);
      setCur(''); setPin(''); setConfirm('');
      setMsg({ kind: 'ok', text: 'PIN removed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="adm-section">
      <div className="adm-section-head"><KeyRound size={19} /><h2>Security</h2></div>
      <div className="adm-section-body">
        <p>The PIN stops casual changes on a shared computer. It is <strong>not strong security</strong> — anyone who can remove the extension can reset it. The PIN is stored only as a salted PBKDF2 hash, and stays unlocked until the browser restarts.</p>
        <p><strong>Optional — off by default.</strong> Turn it on if this computer is shared.</p>

        <div className="adm-pin-row">
          {record && <PinInput label="Current PIN" value={cur} onChange={setCur} />}
          <PinInput label={record ? 'New PIN' : 'PIN'} value={pin} onChange={setPin} />
          <PinInput label="Confirm PIN" value={confirm} onChange={setConfirm} />
        </div>
        {pin && !/^\d{4,8}$/.test(pin) && <p className="adm-error">PIN must be 4–8 digits.</p>}
        {pin && confirm && pin !== confirm && <p className="adm-error">PINs don&apos;t match.</p>}
        {msg && <p role={msg.kind === 'err' ? 'alert' : 'status'} style={{ color: msg.kind === 'err' ? '#78382e' : '#314b32', fontSize: 13 }}>{msg.text}</p>}

        <div className="adm-actions">
          <button className="primary-button" disabled={busy || !valid || (!!record && !cur)} onClick={() => void save(!!record)}>
            <ShieldCheck size={15} /> {record ? 'Change PIN' : 'Set PIN'}
          </button>
          {record && (
            <button className="secondary-button" disabled={busy || !cur} onClick={() => void remove()}>
              <Trash2 size={15} /> Remove PIN
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
