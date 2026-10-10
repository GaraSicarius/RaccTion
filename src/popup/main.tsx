import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import './popup.css';
import { CircleAlert, Globe, LoaderCircle, ScanLine, Settings, ShieldCheck } from 'lucide-react';
import { Raccoon } from '../components/Raccoon.tsx';
import type { Availability } from '../ai/local.ts';

const RESTRICTED = /^(chrome|edge|about|view-source|devtools|chrome-extension|moz-extension|brave|vivaldi|opera):|chromewebstore\.google\.com|microsoftedge\.microsoft\.com|addons\.opera\.com/;

function statusLine(status: Availability | null): { cls: string; text: React.ReactNode; icon: React.ReactNode } {
  switch (status) {
    case 'available':
      return { cls: 'pop-status--ready', text: 'Ready — Qwen3 0.6B is running locally.', icon: <ShieldCheck size={15} /> };
    case 'unavailable':
      return { cls: 'pop-status--warn', text: 'Start the local AI server — open Admin for setup. Keyword scans still work.', icon: <CircleAlert size={15} /> };
    default:
      return { cls: '', text: 'Checking local AI…', icon: <LoaderCircle size={15} className="spin" /> };
  }
}

function PopupApp() {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
  const [status, setStatus] = useState<Availability | null>(null);

  useEffect(() => {
    void chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => setTab(tabs[0] ?? null));
    void chrome.runtime.sendMessage({ type: 'model-status' })
      .then(r => setStatus((r as { availability?: Availability })?.availability ?? null))
      .catch(() => setStatus('unavailable'));
  }, []);

  const url = tab?.url ?? '';
  let hostname = 'this page';
  try { hostname = new URL(url).hostname || 'this page'; } catch { /* keep default */ }
  const restricted = !tab?.id || !url || RESTRICTED.test(url);

  const scan = () => {
    if (tab?.id == null) return;
    void chrome.runtime.sendMessage({ type: 'scan', tabId: tab.id });
    window.close();
  };

  const s = statusLine(status);

  return (
    <div className="pop">
      <div className="pop-header">
        <Raccoon />
        <strong>Racc<span className="brand-light">Tion</span></strong>
      </div>
      <div className="pop-body">
        <div className="pop-page"><Globe size={15} /><span>Scanning <strong>{hostname}</strong></span></div>
        <button className="primary-button pop-scan" disabled={restricted} onClick={scan}>
          <ScanLine size={17} /> Scan this page
        </button>
        {restricted && (
          <p className="pop-blocked">This page can&apos;t be scanned — the browser blocks extensions here. Try it on a normal web page.</p>
        )}
        <button className="secondary-button pop-admin" onClick={() => void chrome.runtime.openOptionsPage()}>
          <Settings size={16} /> Admin
        </button>
        <p className={`pop-status ${s.cls}`}>{s.icon}<span>{s.text}</span></p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><PopupApp /></React.StrictMode>);
