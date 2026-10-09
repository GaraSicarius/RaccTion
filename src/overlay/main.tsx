import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import './overlay.css';
import ResultCard from '../components/ResultCard.tsx';
import { Raccoon } from '../components/Raccoon.tsx';
import { mergeSettings } from '../lib/settings.ts';
import type { ScanState, Settings } from '../lib/types.ts';

function OverlayApp() {
  const tabId = Number(new URLSearchParams(location.search).get('tab'));
  const [settings, setSettings] = useState<Settings | null>(null);
  const [state, setState] = useState<ScanState | null>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(tabId)) return;
    void chrome.storage.local.get('settings').then(d => setSettings(mergeSettings(d.settings)));
    const key = `scan:${tabId}`;
    void chrome.storage.session.get(key).then(d => setState((d[key] as ScanState | undefined) ?? null));
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'session' && changes[key]) setState((changes[key].newValue as ScanState | undefined) ?? null);
      if (area === 'local' && changes.settings) setSettings(mergeSettings(changes.settings.newValue));
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [tabId]);

  if (!settings || !Number.isFinite(tabId)) return null;

  const post = (type: 'minimize' | 'expand' | 'close') => window.parent.postMessage({ source: 'racction', type }, '*');

  if (minimized) {
    return (
      <button className="rc-mini" aria-label="Expand RaccTion" onClick={() => { setMinimized(false); post('expand'); }}>
        <Raccoon />
      </button>
    );
  }

  return (
    <ResultCard
      state={state}
      settings={settings}
      tabId={tabId}
      onRescan={() => void chrome.runtime.sendMessage({ type: 'rescan', tabId })}
      onAdmin={() => void chrome.runtime.openOptionsPage()}
      onMinimize={() => { setMinimized(true); post('minimize'); }}
      onClose={() => post('close')}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><OverlayApp /></React.StrictMode>);
