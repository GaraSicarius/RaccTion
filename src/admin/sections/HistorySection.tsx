import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Download, FileUp, History, Trash2, X } from 'lucide-react';
import ResultCard from '../../components/ResultCard.tsx';
import { validateImport } from '../../lib/settings.ts';
import { clearHistory, deleteHistoryItem, getHistory } from '../../lib/storage.ts';
import type { ScanResult, ScanState, Settings } from '../../lib/types.ts';

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" className="adm-toggle" role="switch" aria-pressed={on} aria-label={label} onClick={() => onChange(!on)} />;
}

function ConfirmDialog({ open, title, children, onCancel, onConfirm }: {
  open: boolean; title: string; children: ReactNode; onCancel: () => void; onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="adm-dialog" onClose={onCancel} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="adm-dialog-text">
        <h3>{title}</h3>
        <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{children}</div>
      </div>
      <div className="adm-dialog-actions">
        <button className="secondary-button" onClick={onCancel}><X size={14} /> Cancel</button>
        <button className="primary-button" onClick={onConfirm}>Import</button>
      </div>
    </dialog>
  );
}

export default function HistorySection({ settings, update }: { settings: Settings; update: (fn: (draft: Settings) => void) => void }) {
  const [history, setHistory] = useState<ScanResult[] | null>(null);
  const [openResult, setOpenResult] = useState<ScanResult | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{ settings: Settings; history: ScanResult[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const reload = () => void getHistory().then(setHistory);
  useEffect(reload, []);
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (openResult && !d.open) d.showModal();
    if (!openResult && d.open) d.close();
  }, [openResult]);

  const exportAll = async () => {
    const blob = new Blob([JSON.stringify({
      app: 'RaccTion',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings, // never includes the PIN record — it lives under a separate key
      history: history ?? [],
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `racction-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onFile = async (file: File) => {
    setImportErr(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const res = validateImport(parsed);
      if ('error' in res) setImportErr(res.error);
      else setImportPreview(res);
    } catch {
      setImportErr('That file isn\'t valid JSON.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const applyImport = async () => {
    if (!importPreview) return;
    const { settings: imported, history: importedHistory } = importPreview;
    update(s => Object.assign(s, imported));
    await chrome.storage.local.set({ history: importedHistory });
    setImportPreview(null);
    reload();
  };

  const openState = (r: ScanResult): ScanState => ({
    scanId: `hist-${r.capturedAt}`, tabId: -1, stage: 'done', progress: 1,
    startedAt: Date.parse(r.capturedAt), updatedAt: Date.parse(r.capturedAt), result: r,
  });

  const customCount = importPreview?.settings.categories.filter(c => !c.builtIn).length ?? 0;

  return (
    <section className="adm-section">
      <div className="adm-section-head"><History size={19} /><h2>History</h2></div>
      <div className="adm-section-body">
        <div className="adm-field">
          <div>
            <span className="adm-label">Save scan history</span>
            <span className="adm-hint">Stored only on this device (chrome.storage.local).</span>
          </div>
          <Toggle on={settings.history.enabled} onChange={v => update(s => { s.history.enabled = v; })} label="Save scan history" />
        </div>
        <div className="adm-field">
          <div>
            <label htmlFor="adm-hist-max">Keep at most</label>
            <span className="adm-hint">Oldest entries are dropped first.</span>
          </div>
          <input id="adm-hist-max" type="number" min={1} max={500} value={settings.history.max}
            onChange={e => update(s => { s.history.max = Math.max(1, Math.min(500, Math.round(Number(e.target.value) || 50))); })} />
        </div>

        {settings.history.enabled && history && (
          history.length === 0
            ? <p className="adm-help">No scans saved yet.</p>
            : history.map(r => (
              <div key={r.capturedAt} className="adm-hist-item">
                <button className="adm-hist-open" onClick={() => setOpenResult(r)}>
                  <strong>{r.hostname}</strong>
                  <span className="adm-hist-meta">{r.title.slice(0, 48)} · {new Date(r.capturedAt).toLocaleString()}</span>
                </button>
                <span className={`adm-badge adm-badge--${r.effort.level}`}>{r.effort.level}</span>
                <span className={`adm-badge ${r.trust.level === 'ok' ? 'adm-badge--easy' : r.trust.level === 'careful' ? 'adm-badge--moderate' : r.trust.level === 'high' ? 'adm-badge--hard' : 'adm-badge--unknown'}`}>{r.trust.level}</span>
                <span className={`adm-badge ${r.aiUsed ? 'adm-badge--ai' : 'adm-badge--kw'}`}>{r.aiUsed ? 'AI' : 'Keywords'}</span>
                <button className="icon-button" aria-label={`Delete scan of ${r.hostname}`} onClick={() => void deleteHistoryItem(r.capturedAt).then(reload)}><Trash2 size={15} /></button>
              </div>
            ))
        )}

        <div className="adm-actions">
          <button className="secondary-button" onClick={() => void exportAll()}><Download size={15} /> Export settings + history</button>
          <button className="secondary-button" onClick={() => fileRef.current?.click()}><FileUp size={15} /> Import…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void onFile(f); }} />
          {settings.history.enabled && history && history.length > 0 && (
            confirmClear
              ? <button className="secondary-button" onClick={() => void clearHistory().then(() => { setConfirmClear(false); reload(); })}><Trash2 size={15} /> Confirm clear all</button>
              : <button className="secondary-button" onClick={() => setConfirmClear(true)}><Trash2 size={15} /> Clear all</button>
          )}
        </div>
        {importErr && <p className="adm-error" role="alert">{importErr}</p>}
        <p className="adm-help" style={{ marginTop: 10 }}>Exports never contain the PIN record.</p>
      </div>

      {/* read-only result modal */}
      <dialog ref={dialogRef} className="adm-dialog" onClose={() => setOpenResult(null)} onClick={e => { if (e.target === e.currentTarget) setOpenResult(null); }}>
        {openResult && <ResultCard state={openState(openResult)} settings={settings} tabId={-1} readOnly onClose={() => setOpenResult(null)} />}
      </dialog>

      {/* import confirm */}
      <ConfirmDialog open={!!importPreview} title="Import this file?" onCancel={() => setImportPreview(null)} onConfirm={() => void applyImport()}>
        {importPreview && (
          <p style={{ margin: 0 }}>
            {customCount} custom check{customCount === 1 ? '' : 's'},
            {' '}{importPreview.settings.domains.trusted.length} trusted + {importPreview.settings.domains.blocked.length} blocked domains,
            {' '}{importPreview.history.length} history item{importPreview.history.length === 1 ? '' : 's'}.
            This replaces your current settings{importPreview.history.length ? ' and history' : ''}.
          </p>
        )}
      </ConfirmDialog>
    </section>
  );
}
