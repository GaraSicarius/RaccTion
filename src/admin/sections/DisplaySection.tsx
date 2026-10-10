import { useMemo } from 'react';
import { ArrowDown, ArrowUp, Eye } from 'lucide-react';
import ResultCard from '../../components/ResultCard.tsx';
import { categoryIcon } from '../../components/icons.ts';
import { ruleScan } from '../../lib/rules.ts';
import { buildResult, mergeFindings } from '../../lib/scoring.ts';
import { SAMPLE_CAPTURE } from '../../lib/sample.ts';
import type { ScanState, Settings } from '../../lib/types.ts';

const SECTION_TOGGLES: { key: keyof Settings['display']['sections']; label: string }[] = [
  { key: 'summary', label: 'Offer summary' },
  { key: 'effort', label: 'Effort meter' },
  { key: 'trust', label: 'Trust meter' },
  { key: 'steps', label: 'Steps to claim' },
  { key: 'freePlan', label: 'Free option' },
  { key: 'redFlags', label: 'Red flags' },
];

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" className="adm-toggle" role="switch" aria-pressed={on} aria-label={label} onClick={() => onChange(!on)} />;
}

export default function DisplaySection({ settings, update }: { settings: Settings; update: (fn: (draft: Settings) => void) => void }) {
  const catById = new Map(settings.categories.map(c => [c.id, c]));
  const ordered = settings.display.order.map(id => catById.get(id)).filter((c): c is NonNullable<typeof c> => !!c);

  const preview = useMemo<ScanState>(() => {
    const { findings, signals } = ruleScan(SAMPLE_CAPTURE, settings);
    const result = buildResult({
      capture: SAMPLE_CAPTURE,
      findings: mergeFindings(findings, null, SAMPLE_CAPTURE, settings),
      steps: [],
      costs: { upfront: null, recurring: null, minimumSpend: null },
      freePlan: 'unclear',
      offerSummary: '',
      offerType: 'giveaway_prize',
      aiUsed: false,
      aiNote: 'Keyword scan preview — local model not used in this preview.',
      durationMs: 0,
      settings,
      signals,
      aiFlags: [],
    });
    return { scanId: 'preview', tabId: -1, stage: 'done', progress: 1, startedAt: Date.now(), updatedAt: Date.now(), result };
  }, [settings]);

  const move = (id: string, dir: -1 | 1) => {
    update(s => {
      const order = s.display.order;
      const i = order.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]];
    });
  };

  return (
    <section className="adm-section">
      <div className="adm-section-head"><Eye size={19} /><h2>Display</h2></div>
      <div className="adm-section-body">
        <div className="adm-display">
          <div>
            <div className="adm-field">
              <div>
                <label htmlFor="adm-position">Card position</label>
                <span className="adm-hint">Where the result card appears on the page.</span>
              </div>
              <select
                id="adm-position"
                value={settings.display.position}
                onChange={e => update(s => { s.display.position = e.target.value as Settings['display']['position']; })}
              >
                <option value="bottom-right">Bottom right</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
              </select>
            </div>
            <div className="adm-field">
              <div>
                <span className="adm-label">Show quotes</span>
                <span className="adm-hint">Show the exact page text under each finding.</span>
              </div>
              <Toggle on={settings.display.showQuotes} onChange={v => update(s => { s.display.showQuotes = v; })} label="Show quotes" />
            </div>

            <div className="adm-section-label" style={{ margin: '18px 0 4px', fontWeight: 700, fontSize: 12, color: '#6a7363', textTransform: 'uppercase', letterSpacing: '.06em' }}>Card sections</div>
            {SECTION_TOGGLES.map(t => (
              <div className="adm-field" key={t.key}>
                <span className="adm-label">{t.label}</span>
                <Toggle on={settings.display.sections[t.key]} onChange={v => update(s => { s.display.sections[t.key] = v; })} label={t.label} />
              </div>
            ))}

            <div style={{ margin: '18px 0 4px', fontWeight: 700, fontSize: 12, color: '#6a7363', textTransform: 'uppercase', letterSpacing: '.06em' }}>What they&apos;ll ask for — shown &amp; order</div>
            {ordered.map((cat, i) => {
              const Icon = categoryIcon(cat.icon);
              const shown = !settings.display.hidden.includes(cat.id);
              return (
                <div className="adm-order-row" key={cat.id}>
                  <Toggle on={shown} onChange={v => update(s => {
                    s.display.hidden = v ? s.display.hidden.filter(x => x !== cat.id) : [...s.display.hidden, cat.id];
                  })} label={`Show ${cat.label}`} />
                  <span className="adm-cat-name"><Icon size={15} /> {cat.label}</span>
                  <span className="adm-order-btns">
                    <button className="icon-button" aria-label={`Move ${cat.label} up`} disabled={i === 0} onClick={() => move(cat.id, -1)}><ArrowUp size={14} /></button>
                    <button className="icon-button" aria-label={`Move ${cat.label} down`} disabled={i === ordered.length - 1} onClick={() => move(cat.id, 1)}><ArrowDown size={14} /></button>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="adm-preview-wrap">
            <div className="adm-preview-label">Live preview — synthetic scam page</div>
            <div className="adm-preview">
              <ResultCard state={preview} settings={settings} tabId={-1} readOnly />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
