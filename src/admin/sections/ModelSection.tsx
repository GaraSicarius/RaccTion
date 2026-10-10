import { useEffect, useState } from 'react';
import { Cpu, LoaderCircle, Play, RefreshCw } from 'lucide-react';
import { STATUS_TEXT } from '../statusText.ts';
import { analyze, type Availability } from '../../ai/local.ts';
import { mergeSettings } from '../../lib/settings.ts';
import { SAMPLE_CAPTURE } from '../../lib/sample.ts';

export default function ModelSection({ availability, onAvailabilityChange }: { availability: Availability | null; onAvailabilityChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<{ ms: number; json: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(onAvailabilityChange, 5000);
    return () => clearInterval(timer);
  }, [onAvailabilityChange]);

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
        <p>Qwen3 0.6B analyzes pages on this laptop through the CPU-only llama.cpp runtime. No cloud AI is used.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {availability && <span className={`adm-status adm-status--${availability}`}>{STATUS_TEXT[availability]}</span>}
          <span className="adm-status">CPU · local model</span>
        </div>
        <p className="adm-help" style={{ marginTop: 10 }}>Keep the local AI server running while scanning. Initial setup needs internet; inference does not. Scans may take up to three minutes on a small CPU.</p>
        {availability !== 'available' && (
          <div className="adm-test-out">
            <p>From the project folder, start the included local server:</p>
            <pre>{`powershell -ExecutionPolicy Bypass -File scripts/start-local-ai.ps1 -ExtensionId ${chrome.runtime.id}`}</pre>
          </div>
        )}
        {error && <p role="alert" style={{ color: '#78382e' }}>{error}</p>}
        <div className="adm-actions">
          <button className="secondary-button" disabled={busy} onClick={onAvailabilityChange}>
            <RefreshCw size={15} /> Check connection
          </button>
          <button className="secondary-button" disabled={busy || availability !== 'available'} onClick={() => void runTest()}>
            {busy ? <LoaderCircle size={15} className="spin" /> : <Play size={15} />} {busy ? 'Running local model…' : 'Run test'}
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
