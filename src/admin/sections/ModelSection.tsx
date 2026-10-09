import { useEffect, useState } from 'react';
import { Cpu, Download, LoaderCircle, Play, Wifi, WifiOff } from 'lucide-react';
import { STATUS_TEXT } from '../statusText.ts';
import { analyze, downloadModel, getAvailability, type Availability } from '../../ai/nano.ts';
import { mergeSettings } from '../../lib/settings.ts';
import { SAMPLE_CAPTURE } from '../../lib/sample.ts';

export default function ModelSection({ availability, onAvailabilityChange }: { availability: Availability | null; onAvailabilityChange: () => void }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<{ ms: number; json: string } | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  const refresh = () => void getAvailability().then(() => onAvailabilityChange());

  const download = async () => {
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      await downloadModel(f => setProgress(f));
      setProgress(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const runTest = async () => {
    setBusy(true);
    setError(null);
    setTest(null);
    const t0 = performance.now();
    try {
      const out = await analyze(SAMPLE_CAPTURE, mergeSettings(null));
      setTest({ ms: Math.round(performance.now() - t0), json: JSON.stringify(out, null, 2) });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="adm-section">
      <div className="adm-section-head"><Cpu size={19} /><h2>Model</h2></div>
      <div className="adm-section-body">
        <p>Gemini Nano analyzes scanned pages entirely on this device through Chrome&apos;s built-in Prompt API.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {availability && <span className={`adm-status adm-status--${availability}`}>{STATUS_TEXT[availability]}</span>}
          <span className={`adm-status adm-status--${online ? 'online' : 'offline'}`}>
            {online ? <Wifi size={13} /> : <WifiOff size={13} />} {online ? 'Online' : 'Offline'}
          </span>
        </div>
        <p className="adm-help" style={{ marginTop: 10 }}>The download happens once, inside Chrome. After download, scans work offline.</p>
        {progress !== null && progress < 1 && (
          <div className="adm-progress" aria-hidden="true"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        )}
        {error && <p role="alert" style={{ color: '#78382e' }}>{error}</p>}
        <div className="adm-actions">
          <button className="primary-button" disabled={busy || availability !== 'downloadable'} onClick={() => void download()}>
            {busy && progress !== null ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
            {availability === 'downloading' || (busy && progress !== null) ? `Downloading… ${Math.round((progress ?? 0) * 100)}%` : 'Download Gemini Nano'}
          </button>
          <button className="secondary-button" disabled={busy || availability !== 'available'} onClick={() => void runTest()}>
            <Play size={15} /> Run test
          </button>
        </div>
        {test && (
          <div className="adm-test-out">
            <p>Test scan finished in {(test.ms / 1000).toFixed(2)}s.</p>
            <pre>{test.json}</pre>
          </div>
        )}
      </div>
    </section>
  );
}
