import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck, CheckCircle2, ChevronRight, CircleAlert, Gauge, KeyRound, LoaderCircle, Minus,
  RefreshCw, ScanLine, Settings as SettingsIcon, ShieldAlert, ShieldCheck, UserRound, X,
} from 'lucide-react';
import { Raccoon } from './Raccoon.tsx';
import { categoryIcon } from './icons.ts';
import { getProfile, getProfileEnc, setProfile } from '../lib/storage.ts';
import { decryptProfile } from '../lib/profileCrypto.ts';
import type { Profile, ProfileKey } from '../lib/autofill.ts';
import type { Finding, ScanResult, ScanState, Settings } from '../lib/types.ts';

const STATUS_LABELS: Record<Exclude<Finding['status'], 'not_found'>, string> = {
  required: 'Required',
  asked_in_form: 'Asked in form',
  mentioned: 'Mentioned on page',
  ai_inferred: 'AI inferred',
};

const STAGES: { id: ScanState['stage']; label: string }[] = [
  { id: 'reading', label: 'Reading the page' },
  { id: 'rules', label: 'Checking forms & fine print' },
  { id: 'ai', label: 'Asking Qwen3 0.6B (on this device)' },
  { id: 'scoring', label: 'Scoring' },
];

const STALE_MS = 200_000;

const EFFORT_LABELS: Record<ScanResult['effort']['level'], string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
  unknown: 'Not enough info',
};

const TRUST_LABELS: Record<ScanResult['trust']['level'], string> = {
  ok: 'No red flags found',
  careful: 'Be careful',
  high: 'High risk',
  unknown: 'Not enough info',
};

function elapsed(startedAt: number, now: number): string {
  return `${Math.max(0, (now - startedAt) / 1000).toFixed(1)}s`;
}

// --- approved autofill ----------------------------------------------------
interface PreviewField { key: string; label: string; profileKey: ProfileKey }
interface PreviewResponse { origin: string; fields: PreviewField[]; skipped: { label: string; reason: string }[] }

function hostnameOf(origin: string): string {
  try { return new URL(origin).hostname; } catch { return origin; }
}

function AutofillSection({ tabId }: { tabId: number }) {
  const [profile, setProfileState] = useState<Profile | null | undefined>(undefined);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'preview' | 'filled' | 'none'>('idle');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [fillBusy, setFillBusy] = useState(false);
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    void Promise.all([getProfile(), getProfileEnc()]).then(([p, enc]) => {
      setProfileState(p);
      setLocked(!p && !!enc);
    });
  }, []);

  if (profile === undefined) return null;

  const unlock = async () => {
    const enc = await getProfileEnc();
    if (!enc) { setLocked(false); return; }
    try {
      const p = await decryptProfile(enc, pin);
      await setProfile(p);
      setProfileState(p);
      setLocked(false);
      setPinErr(false);
      setPin('');
    } catch {
      setPinErr(true);
    }
  };

  const findFields = async () => {
    setFillBusy(true);
    try {
      const res = await chrome.tabs.sendMessage(tabId, { type: 'racction:fill-preview' }) as PreviewResponse | undefined;
      if (res && Array.isArray(res.fields) && res.fields.length > 0) {
        setPreview(res);
        const init: Record<string, boolean> = {};
        for (const f of res.fields) init[f.key] = !!profile?.[f.profileKey];
        setChecked(init);
        setPhase('preview');
      } else {
        setPreview(res ?? null);
        setPhase('none');
      }
    } catch {
      setPreview(null);
      setPhase('none');
    } finally {
      setFillBusy(false);
    }
  };

  const doFill = async () => {
    if (!preview || !profile) return;
    setFillBusy(true);
    try {
      const items = preview.fields
        .filter(f => checked[f.key] && profile[f.profileKey])
        .map(f => ({ key: f.key, value: profile[f.profileKey] as string }));
      const res = await chrome.tabs.sendMessage(tabId, { type: 'racction:fill', origin: preview.origin, items }) as { filled?: number } | undefined;
      setFilled(res?.filled ?? 0);
      setPhase('filled');
    } finally {
      setFillBusy(false);
    }
  };

  const skippedList = preview?.skipped.length ? (
    <div className="rc-af-skipped">
      Won&apos;t fill: {preview.skipped.map(s => s.label).join(', ')}
      <span className="rc-af-skipreason"> ({preview.skipped[0].reason})</span>
    </div>
  ) : null;

  return (
    <div className="rc-autofill">
      <div className="rc-section-label">Fill a form</div>
      {profile === null ? (
        locked ? (
          <div className="rc-af-unlock">
            <p className="rc-af-note"><KeyRound size={13} /> Your saved details are PIN-locked.</p>
            <div className="rc-af-pinrow">
              <input
                type="password" inputMode="numeric" aria-label="Admin PIN"
                minLength={4} maxLength={8} placeholder="PIN" value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => { if (e.key === 'Enter' && pin.length >= 4) void unlock(); }}
              />
              <button className="secondary-button" disabled={pin.length < 4} onClick={() => void unlock()}>Unlock</button>
            </div>
            {pinErr && <span className="rc-show-page--miss">Wrong PIN — try again.</span>}
          </div>
        ) : (
          <button
            className="secondary-button"
            onClick={() => void chrome.tabs.create({ url: chrome.runtime.getURL('admin.html#autofill') })}
          >
            <UserRound size={14} /> Add your details in Admin
          </button>
        )
      ) : phase === 'idle' ? (
        <button className="secondary-button" disabled={fillBusy} onClick={() => void findFields()}>
          <UserRound size={14} /> Find fields to fill
        </button>
      ) : phase === 'none' ? (
        <>
          <p className="rc-af-note">No fields RaccTion can fill here.</p>
          {skippedList}
        </>
      ) : phase === 'filled' ? (
        <p className="rc-af-note">Filled {filled} field{filled === 1 ? '' : 's'}. Review and submit the form yourself.</p>
      ) : preview && (
        <>
          <div className="rc-af-dest">On {hostnameOf(preview.origin)}</div>
          <div className="rc-af-rows">
            {preview.fields.map(f => {
              const value = profile[f.profileKey] ?? '';
              return (
                <label className="rc-af-row" key={f.key}>
                  <input
                    type="checkbox"
                    checked={!!checked[f.key] && !!value}
                    disabled={!value}
                    onChange={e => setChecked(c => ({ ...c, [f.key]: e.target.checked }))}
                  />
                  <span className="rc-af-row-label">{f.label || f.key}</span>
                  <span className="rc-af-row-value">{value ? `→ ${value}` : '— no value saved'}</span>
                </label>
              );
            })}
          </div>
          {skippedList}
          <p className="rc-af-note">
            The website can read these values as soon as they&apos;re filled — even before you submit.
            RaccTion never submits for you.
          </p>
          <div className="rc-actions">
            <button
              className="primary-button"
              disabled={fillBusy || !preview.fields.some(f => checked[f.key] && profile[f.profileKey])}
              onClick={() => void doFill()}
            >
              Fill these fields
            </button>
            <button className="secondary-button" onClick={() => setPhase('idle')}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

export interface ResultCardProps {
  state: ScanState | null;
  settings: Settings;
  tabId: number;
  onRescan?: () => void;
  onAdmin?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
  /** Read-only mode (Admin preview / history): no show-on-page, rescan or minimize. */
  readOnly?: boolean;
}

export default function ResultCard({ state, settings, tabId, onRescan, onAdmin, onMinimize, onClose, readOnly = false }: ResultCardProps) {
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [missed, setMissed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const catById = useMemo(() => new Map(settings.categories.map(c => [c.id, c])), [settings]);

  const showOnPage = async (finding: Finding) => {
    if (!finding.quote) return;
    setBusy(true);
    setMissed(null);
    try {
      const res = await chrome.tabs.sendMessage(tabId, { type: 'racction:highlight', quote: finding.quote });
      if (!res?.found) setMissed(finding.categoryId);
    } catch {
      setMissed(finding.categoryId);
    } finally {
      setBusy(false);
    }
  };

  const stale = !!state && state.stage !== 'done' && state.stage !== 'error' && now - state.updatedAt > STALE_MS;
  const result = state?.result ?? (state?.stage === 'done' ? state.partial : undefined);

  const header = (
    <div className="rc-header">
      <Raccoon small />
      <strong>RaccTion</strong>
      <span className="rc-host">{state?.result?.hostname ?? state?.partial?.hostname ?? ''}</span>
      {!readOnly && onMinimize && <button className="icon-button" aria-label="Minimize" onClick={onMinimize}><Minus size={17} /></button>}
      {onClose && <button className="icon-button" aria-label="Close" onClick={onClose}><X size={17} /></button>}
    </div>
  );

  // --- interrupted -------------------------------------------------------
  if (!state || stale) {
    return (
      <div className="rc-card">
        {header}
        <div className="rc-error" role="alert">
          <Raccoon />
          <h2>Scan interrupted</h2>
          <p>{state ? 'The scan stopped before it finished — the page may have reloaded.' : 'No scan has run on this page yet.'}</p>
          {onRescan && <button className="primary-button" onClick={onRescan}><RefreshCw size={15} /> Rescan</button>}
        </div>
      </div>
    );
  }

  // --- error ---------------------------------------------------------------
  if (state.stage === 'error') {
    return (
      <div className="rc-card">
        {header}
        <div className="rc-error" role="alert">
          <CircleAlert size={34} color="#78382e" />
          <h2>Couldn&apos;t scan this page</h2>
          <p>{state.error ?? 'Something went wrong.'}</p>
          {onRescan && <button className="primary-button" onClick={onRescan}><RefreshCw size={15} /> Rescan</button>}
        </div>
      </div>
    );
  }

  // --- scanning --------------------------------------------------------------
  if (state.stage !== 'done' || !result) {
    const stageIndex = Math.max(0, STAGES.findIndex(s => s.id === state.stage));
    const partial = state.partial;
    const found = partial?.findings.filter(f => f.status !== 'not_found' && !catById.get(f.categoryId)?.positive) ?? [];
    return (
      <div className="rc-card">
        {header}
        <div className="rc-scan" role="status">
          <Raccoon />
          <h2>Scanning this page</h2>
          <span className="rc-scan-timer">{elapsed(state.startedAt, now)}</span>
          <div className="rc-progress" aria-hidden="true"><div style={{ width: `${Math.round(state.progress * 100)}%` }} /></div>
          <div className="rc-stages">
            {STAGES.map((s, i) => {
              const done = i < stageIndex;
              const active = i === stageIndex;
              return (
                <div key={s.id} className={`rc-stage${active ? ' rc-stage--active' : ''}${done ? ' rc-stage--done' : ''}`}>
                  {done ? <CheckCircle2 size={16} /> : active ? <LoaderCircle size={16} className="spin" /> : <ChevronRight size={16} />}
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
          {found.length > 0 && (
            <div className="rc-partial">
              <div className="rc-section-label">Found so far (keyword scan)</div>
              <div className="rc-chips">
                {found.map(f => {
                  const cat = catById.get(f.categoryId);
                  const Icon = categoryIcon(cat?.icon);
                  return <span key={f.categoryId} className="rc-chip"><Icon size={14} /> {cat?.label ?? f.categoryId}</span>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- result -----------------------------------------------------------------
  const disp = settings.display;
  const visibleFindings = disp.order
    .map(id => result.findings.find(f => f.categoryId === id))
    .filter((f): f is Finding & { status: Exclude<Finding['status'], 'not_found'> } =>
      !!f && f.status !== 'not_found' && !disp.hidden.includes(f.categoryId))
    .filter(f => !catById.get(f.categoryId)?.positive);
  const costs = result.costs;
  const hasCosts = !!(costs.upfront || costs.recurring || costs.minimumSpend);
  const freePlanFound = result.findings.some(f => f.categoryId === 'free_plan' && f.status !== 'not_found');
  const freePlan = result.freePlan === 'yes' || freePlanFound ? 'yes' : result.freePlan;
  const expandedFinding = expanded ? result.findings.find(f => f.categoryId === expanded) : null;

  return (
    <div className="rc-card">
      {header}
      <div className="rc-body">
        {disp.sections.summary && (
          <>
            <h2 className="rc-title">{result.aiUsed && result.offerSummary ? result.offerSummary : result.title || result.hostname}</h2>
            {!result.aiUsed && (
              <p className="rc-summary">
                {result.aiNote?.includes("Gemini Nano isn't available")
                  ? 'Keyword scan only — no AI on this device.'
                  : `Keyword scan only${result.aiNote ? ` — ${result.aiNote}` : '.'}`}
              </p>
            )}
          </>
        )}

        {disp.sections.effort && (
          <div className={`rc-meter rc-meter--${result.effort.level === 'unknown' ? 'unknown' : result.effort.level}`}>
            <div className="rc-meter-top">
              <Gauge size={16} />
              <span className="rc-meter-label">Effort to claim</span>
              <span className="rc-meter-value">{EFFORT_LABELS[result.effort.level]}</span>
            </div>
            {result.effort.reasons.length > 0 && <p className="rc-meter-reasons">{result.effort.reasons.join(' · ')}</p>}
          </div>
        )}

        {disp.sections.trust && (
          <div className={`rc-meter rc-meter--${result.trust.level}`}>
            <div className="rc-meter-top">
              {result.trust.level === 'ok' ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
              <span className="rc-meter-label">Trust signals</span>
              <span className="rc-meter-value">{TRUST_LABELS[result.trust.level]}</span>
            </div>
            {result.trust.domainList && (
              <p className="rc-meter-reasons">This domain is on your {result.trust.domainList} list.</p>
            )}
            <p className="rc-meter-caveat">Signals, not a guarantee.</p>
          </div>
        )}

        {visibleFindings.length > 0 && (
          <>
            <div className="rc-section-label">What they&apos;ll ask for</div>
            <div className="rc-chips" role="list">
              {visibleFindings.map(f => {
                const cat = catById.get(f.categoryId);
                const Icon = categoryIcon(cat?.icon);
                const isOpen = expanded === f.categoryId;
                return (
                  <button
                    key={f.categoryId}
                    role="listitem"
                    className="rc-chip"
                    aria-expanded={isOpen}
                    onClick={() => { setExpanded(isOpen ? null : f.categoryId); setMissed(null); }}
                  >
                    <Icon size={14} />
                    {cat?.label ?? f.categoryId}
                    <span className={`rc-chip-status rc-chip-status--${f.status}`}>{STATUS_LABELS[f.status]}</span>
                  </button>
                );
              })}
            </div>
            {expandedFinding && (
              <div className="rc-chip-detail">
                <p style={{ margin: 0 }}>{expandedFinding.detail || STATUS_LABELS[expandedFinding.status as keyof typeof STATUS_LABELS]}</p>
                {expandedFinding.status === 'ai_inferred' && <p style={{ margin: '6px 0 0', fontStyle: 'italic' }}>AI inferred — no exact quote found on the page.</p>}
                {disp.showQuotes && expandedFinding.quote && <blockquote>{expandedFinding.quote}</blockquote>}
                {!readOnly && expandedFinding.quote && (
                  <button className="rc-show-page" disabled={busy} onClick={() => void showOnPage(expandedFinding)}>
                    <ScanLine size={13} /> Show on page
                  </button>
                )}
                {missed === expandedFinding.categoryId && <span className="rc-show-page--miss">Couldn&apos;t find it on the page.</span>}
              </div>
            )}
          </>
        )}

        {hasCosts && (
          <>
            <div className="rc-section-label">Costs</div>
            <div className="rc-costs">
              {costs.upfront && <div><span>Upfront</span><strong>{costs.upfront}</strong></div>}
              {costs.recurring && <div><span>Recurring</span><strong>{costs.recurring}</strong></div>}
              {costs.minimumSpend && <div><span>Minimum spend</span><strong>{costs.minimumSpend}</strong></div>}
            </div>
          </>
        )}

        {disp.sections.freePlan && (
          <>
            <div className="rc-section-label">Free option</div>
            <div className={`rc-free rc-free--${freePlan}`}>
              <BadgeCheck size={15} />
              {freePlan === 'yes' ? 'Yes — a free way exists' : freePlan === 'no' ? 'No free way mentioned' : 'Unclear from the page'}
            </div>
          </>
        )}

        {disp.sections.steps && result.steps.length > 0 && (
          <>
            <div className="rc-section-label">Steps to claim</div>
            <ol className="rc-steps">
              {result.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </>
        )}

        {disp.sections.redFlags && result.trust.signals.length > 0 && (
          <>
            <div className="rc-section-label">Red flags</div>
            <div className="rc-flags">
              {result.trust.signals.map(s => (
                <div key={s.id} className="rc-flag">
                  <strong>{s.label}</strong>
                  {s.detail}
                  {disp.showQuotes && s.quote && <blockquote>{s.quote}</blockquote>}
                </div>
              ))}
            </div>
          </>
        )}

        {!readOnly && <AutofillSection tabId={tabId} />}
      </div>

      <div className="rc-footer">
        <p className="rc-footer-note">
          <ShieldCheck size={13} />
          <span>{result.aiUsed
            ? `Analyzed on this device by ${result.aiModel ?? 'Gemini Nano'} · no cloud AI · ${(result.durationMs / 1000).toFixed(1)}s`
            : (result.aiNote ?? 'Keyword scan only · nothing sent')}</span>
        </p>
        <div className="rc-actions">
          {!readOnly && onRescan && <button className="secondary-button" onClick={onRescan}><RefreshCw size={14} /> Rescan</button>}
          {!readOnly && onAdmin && <button className="secondary-button" onClick={onAdmin}><SettingsIcon size={14} /> Admin</button>}
          {readOnly && onClose && <button className="secondary-button" onClick={onClose}><X size={14} /> Close</button>}
        </div>
      </div>
    </div>
  );
}
