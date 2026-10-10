import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import '../overlay/overlay.css'; // ResultCard styles for the live preview + history modal
import './admin.css';
import { Cpu, Eye, Globe2, History, Info, KeyRound, ListChecks, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { Raccoon } from '../components/Raccoon.tsx';
import { mergeSettings } from '../lib/settings.ts';
import { getPinRecord, getProfileEnc, getSettings, isAdminUnlocked, saveSettings, setAdminUnlocked, setProfile } from '../lib/storage.ts';
import { decryptProfile } from '../lib/profileCrypto.ts';
import { verifyPin } from '../lib/pin.ts';
import { getAvailability, type Availability } from '../ai/local.ts';
import { STATUS_TEXT } from './statusText.ts';
import type { Settings } from '../lib/types.ts';
import ModelSection from './sections/ModelSection.tsx';
import DisplaySection from './sections/DisplaySection.tsx';
import ChecksSection from './sections/ChecksSection.tsx';
import DomainsSection from './sections/DomainsSection.tsx';
import AutofillSection from './sections/AutofillSection.tsx';
import HistorySection from './sections/HistorySection.tsx';
import SecuritySection from './sections/SecuritySection.tsx';
import AboutSection from './sections/AboutSection.tsx';

type SectionId = 'model' | 'display' | 'checks' | 'domains' | 'autofill' | 'history' | 'security' | 'about';

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'model', label: 'Model', icon: <Cpu size={16} /> },
  { id: 'display', label: 'Display', icon: <Eye size={16} /> },
  { id: 'checks', label: 'Checks', icon: <ListChecks size={16} /> },
  { id: 'domains', label: 'Domains', icon: <Globe2 size={16} /> },
  { id: 'autofill', label: 'Autofill', icon: <UserRound size={16} /> },
  { id: 'history', label: 'History', icon: <History size={16} /> },
  { id: 'security', label: 'Security', icon: <KeyRound size={16} /> },
  { id: 'about', label: 'About', icon: <Info size={16} /> },
];

function LockScreen({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const record = await getPinRecord();
    const ok = record ? await verifyPin(pin, record) : false;
    if (ok) {
      await setAdminUnlocked(true);
      // A saved encrypted profile decrypts into session storage on unlock.
      try {
        const enc = await getProfileEnc();
        if (enc) await setProfile(await decryptProfile(enc, pin));
      } catch { /* corrupt record — continue without the profile */ }
      onUnlock(pin);
    } else {
      setPin('');
      setError('Wrong PIN — try again.');
      await new Promise(r => setTimeout(r, 1000)); // slow down retries
      setBusy(false);
    }
  };

  return (
    <div className="adm-lock">
      <form className="adm-lock-card" onSubmit={e => { e.preventDefault(); void submit(); }}>
        <Raccoon />
        <h1>RaccTion Admin</h1>
        <p><LockKeyhole size={13} style={{ verticalAlign: '-2px' }} /> This page is PIN-locked.</p>
        <label htmlFor="adm-pin" style={{ position: 'absolute', left: -9999 }}>Admin PIN</label>
        <input
          id="adm-pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={4}
          maxLength={8}
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="4–8 digit PIN"
        />
        {error && <p role="alert" style={{ color: '#78382e' }}>{error}</p>}
        <button className="primary-button" type="submit" disabled={busy || pin.length < 4}>Unlock</button>
        <p className="adm-lock-forgot">Forgot your PIN? Remove and reinstall RaccTion to reset it (this clears settings and history).</p>
      </form>
    </div>
  );
}

function AdminApp() {
  const [gate, setGate] = useState<'loading' | 'locked' | 'open'>('loading');
  const [gatePin, setGatePin] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [section, setSection] = useState<SectionId>(() => {
    const hash = location.hash.slice(1) as SectionId;
    return SECTIONS.some(s => s.id === hash) ? hash : 'model';
  });
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [savedTick, setSavedTick] = useState<'idle' | 'dirty' | 'saved'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void Promise.all([getPinRecord(), isAdminUnlocked()]).then(([pin, unlocked]) => {
      setGate(pin && !unlocked ? 'locked' : 'open');
    });
  }, []);

  useEffect(() => {
    if (gate !== 'open') return;
    void getSettings().then(setSettings);
    void getAvailability().then(setAvailability).catch(() => setAvailability('unavailable'));
  }, [gate]);

  useEffect(() => {
    const onHash = () => {
      const hash = location.hash.slice(1) as SectionId;
      if (SECTIONS.some(s => s.id === hash)) setSection(hash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const refreshAvailability = useCallback(() => {
    void getAvailability().then(setAvailability).catch(() => setAvailability('unavailable'));
  }, []);

  const update = useCallback((fn: (draft: Settings) => void) => {
    setSettings(prev => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSavedTick('dirty');
      saveTimer.current = setTimeout(() => {
        void saveSettings(next).then(() => setSavedTick('saved'));
      }, 300);
      return next;
    });
  }, []);

  if (gate === 'loading') return null;
  if (gate === 'locked') return <LockScreen onUnlock={pin => { setGatePin(pin); setGate('open'); }} />;
  if (!settings) return null;

  return (
    <>
      <header className="adm-hero">
        <div className="adm-hero-img" aria-hidden="true">
          <svg viewBox="0 0 5000 2000" preserveAspectRatio="xMidYMid slice">
            <image href="art/cave-background.jpg" width="8502" height="2000" />
          </svg>
        </div>
        <div className="adm-hero-shade" aria-hidden="true" />
        <div className="adm-hero-row">
          <Raccoon />
          <h1>Racc<span className="brand-light">Tion</span> Admin</h1>
          <span className="adm-sub">Local AI · nothing leaves this device</span>
          {availability && <span className={`adm-status adm-status--${availability}`}>{STATUS_TEXT[availability]}</span>}
        </div>
      </header>

      <div className="adm-shell">
        <nav className="adm-nav" aria-label="Admin sections">
          {SECTIONS.map(s => (
            <button key={s.id} className={section === s.id ? 'adm-nav--active' : ''} aria-current={section === s.id ? 'page' : undefined} onClick={() => { setSection(s.id); history.replaceState(null, '', `#${s.id}`); }}>
              {s.icon} {s.label}
            </button>
          ))}
          <span className="adm-saved" role="status" aria-live="polite">
            {savedTick === 'dirty' ? 'Saving…' : savedTick === 'saved' ? 'Saved' : '\u00a0'}
          </span>
        </nav>

        <main className="adm-content">
          {section === 'model' && <ModelSection availability={availability} onAvailabilityChange={refreshAvailability} />}
          {section === 'display' && <DisplaySection settings={settings} update={update} />}
          {section === 'checks' && <ChecksSection settings={settings} update={update} />}
          {section === 'domains' && <DomainsSection settings={settings} update={update} />}
          {section === 'autofill' && <AutofillSection gatePin={gatePin} />}
          {section === 'history' && <HistorySection settings={settings} update={update} />}
          {section === 'security' && <SecuritySection />}
          {section === 'about' && <AboutSection />}
        </main>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AdminApp /></React.StrictMode>);
