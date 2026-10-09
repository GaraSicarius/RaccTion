import { useState } from 'react';
import { ListChecks, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { BUILTIN_CATEGORIES } from '../../lib/categories.ts';
import { CATEGORY_ICONS, categoryIcon } from '../../components/icons.ts';
import type { CategoryDef, Settings } from '../../lib/types.ts';

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" className="adm-toggle" role="switch" aria-pressed={on} aria-label={label} onClick={() => onChange(!on)} />;
}

function KeywordEditor({ keywords, onChange }: { keywords: string[]; onChange: (kws: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const kw = draft.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) onChange([...keywords, kw]);
    setDraft('');
  };
  return (
    <>
      <div className="adm-kw">
        {keywords.map(kw => (
          <span key={kw} className="adm-kw-chip">
            {kw}
            <button type="button" aria-label={`Remove keyword ${kw}`} onClick={() => onChange(keywords.filter(k => k !== kw))}><X size={12} /></button>
          </span>
        ))}
        {keywords.length === 0 && <span style={{ fontSize: 12, color: '#7a8172' }}>No keywords — only the AI and form signals can find this.</span>}
      </div>
      <div className="adm-kw-add">
        <input
          type="text"
          value={draft}
          placeholder="Add keyword…"
          aria-label="Add keyword"
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" className="secondary-button" style={{ minHeight: 40, padding: '6px 12px' }} onClick={add}><Plus size={14} /> Add</button>
      </div>
    </>
  );
}

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
}

function CheckRow({ cat, update }: { cat: CategoryDef; update: (fn: (draft: Settings) => void) => void }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const Icon = categoryIcon(cat.icon);
  const patch = (fn: (c: CategoryDef) => void) => update(s => { const c = s.categories.find(x => x.id === cat.id); if (c) fn(c); });

  const resetBuiltin = () => {
    const base = BUILTIN_CATEGORIES.find(c => c.id === cat.id);
    if (!base) return;
    update(s => {
      const i = s.categories.findIndex(c => c.id === cat.id);
      if (i >= 0) s.categories[i] = { ...base, keywords: [...base.keywords], formSignals: [...base.formSignals] };
    });
    setConfirmReset(false);
  };

  const removeCustom = () => update(s => {
    s.categories = s.categories.filter(c => c.id !== cat.id);
    s.display.order = s.display.order.filter(id => id !== cat.id);
    s.display.hidden = s.display.hidden.filter(id => id !== cat.id);
  });

  return (
    <div className="adm-check">
      <div className="adm-check-head">
        <Toggle on={cat.enabled} onChange={v => patch(c => { c.enabled = v; })} label={`Enable ${cat.label}`} />
        <Icon size={16} />
        <strong>{cat.label}</strong>
        {cat.positive && <span className="adm-tag">positive</span>}
        <span className="adm-tag">{cat.builtIn ? 'built-in' : 'custom'}</span>
      </div>
      <div className="adm-check-body">
        <div className="adm-check-nums">
          <label>Effort points
            <input type="number" min={0} max={10} value={cat.weight}
              onChange={e => patch(c => { c.weight = Math.max(0, Math.min(10, Number(e.target.value) || 0)); })} />
          </label>
          <label>Red-flag points
            <input type="number" min={0} max={10} value={cat.trustWeight}
              onChange={e => patch(c => { c.trustWeight = Math.max(0, Math.min(10, Number(e.target.value) || 0)); })} />
          </label>
          <span className="adm-check-actions">
            {cat.builtIn
              ? (confirmReset
                ? <button className="secondary-button" style={{ minHeight: 40, padding: '6px 12px' }} onClick={resetBuiltin}><RotateCcw size={14} /> Confirm reset</button>
                : <button className="text-button" onClick={() => setConfirmReset(true)}><RotateCcw size={13} /> Reset</button>)
              : <button className="text-button" style={{ color: '#78382e' }} onClick={removeCustom}><Trash2 size={13} /> Delete</button>}
          </span>
        </div>
        <div>
          <span className="adm-hint" style={{ display: 'block', marginBottom: 4 }}>Description — sent to Gemini Nano as this check&apos;s meaning.</span>
          <textarea value={cat.description} aria-label={`${cat.label} description`}
            onChange={e => patch(c => { c.description = e.target.value.slice(0, 240); })} />
        </div>
        <div>
          <span className="adm-hint" style={{ display: 'block', marginBottom: 4 }}>Keywords — English and Filipino/Taglish.</span>
          <KeywordEditor keywords={cat.keywords} onChange={kws => patch(c => { c.keywords = kws; })} />
        </div>
      </div>
    </div>
  );
}

function AddCheckForm({ settings, update }: { settings: Settings; update: (fn: (draft: Settings) => void) => void }) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [weight, setWeight] = useState(1);
  const [trustWeight, setTrustWeight] = useState(0);
  const [icon, setIcon] = useState('FileText');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const name = label.trim();
    if (!name) { setError('A label is required.'); return; }
    const slug = slugify(name) || 'check';
    update(s => {
      let id = `custom_${slug}`.slice(0, 40);
      let n = 2;
      while (s.categories.some(c => c.id === id)) id = `custom_${slug}_${n++}`.slice(0, 40);
      s.categories.push({
        id, label: name.slice(0, 60), description: description.trim().slice(0, 240), icon,
        keywords: keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean),
        formSignals: [], weight, trustWeight, enabled: true, builtIn: false,
      });
      s.display.order.push(id);
    });
    setLabel(''); setDescription(''); setKeywords(''); setWeight(1); setTrustWeight(0); setIcon('FileText'); setError(null);
  };

  return (
    <div className="adm-check" style={{ borderStyle: 'dashed' }}>
      <div className="adm-check-head"><Plus size={16} /><strong>Add a custom check</strong></div>
      <div className="adm-check-body">
        <div className="adm-check-nums">
          <label style={{ flex: 1 }}>Label
            <input style={{ width: '100%' }} type="text" value={label} maxLength={60} onChange={e => setLabel(e.target.value)} placeholder="e.g. Crypto payment" />
          </label>
          <label>Icon
            <select value={icon} onChange={e => setIcon(e.target.value)} style={{ minHeight: 40, padding: '6px 10px', border: '1px solid #c7c1b3', background: '#fffaf0' }}>
              {Object.keys(CATEGORY_ICONS).concat('FileText').map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label>Effort pts
            <input type="number" min={0} max={10} value={weight} onChange={e => setWeight(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
          </label>
          <label>Red-flag pts
            <input type="number" min={0} max={10} value={trustWeight} onChange={e => setTrustWeight(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
          </label>
        </div>
        <div>
          <span className="adm-hint" style={{ display: 'block', marginBottom: 4 }}>Description — sent to Gemini Nano so it knows what this check means.</span>
          <textarea value={description} maxLength={240} onChange={e => setDescription(e.target.value)} placeholder="What the page asks for, e.g. payment in crypto." />
        </div>
        <div>
          <span className="adm-hint" style={{ display: 'block', marginBottom: 4 }}>Keywords, comma-separated.</span>
          <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="usdt, bitcoin, crypto wallet" style={{ width: '100%', minHeight: 40, padding: '6px 10px', border: '1px solid #c7c1b3', background: '#fffaf0', fontSize: 13 }} />
        </div>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <div className="adm-check-actions">
          <button className="primary-button" style={{ minHeight: 40, padding: '8px 14px' }} onClick={add} disabled={!label.trim()}><Plus size={14} /> Add check</button>
        </div>
      </div>
    </div>
  );
}

export default function ChecksSection({ settings, update }: { settings: Settings; update: (fn: (draft: Settings) => void) => void }) {
  const [confirmAll, setConfirmAll] = useState(false);
  const catById = new Map(settings.categories.map(c => [c.id, c]));
  const ordered = settings.display.order.map(id => catById.get(id)).filter((c): c is CategoryDef => !!c);
  const scoringErr = settings.scoring.moderateMax < settings.scoring.easyMax;

  const resetAll = () => update(s => {
    const customs = s.categories.filter(c => !c.builtIn);
    s.categories = [
      ...BUILTIN_CATEGORIES.map(c => ({ ...c, keywords: [...c.keywords], formSignals: [...c.formSignals] })),
      ...customs,
    ];
    const ids = new Set(s.categories.map(c => c.id));
    s.display.order = [...BUILTIN_CATEGORIES.map(c => c.id), ...s.display.order.filter(id => !BUILTIN_CATEGORIES.some(b => b.id === id) && ids.has(id))];
    s.scoring = { easyMax: 2, moderateMax: 6 };
  });

  return (
    <section className="adm-section">
      <div className="adm-section-head"><ListChecks size={19} /><h2>Checks</h2></div>
      <div className="adm-section-body">
        <p>Each check becomes a chip on the result card. Effort points feed the Effort meter; red-flag points feed Trust signals.</p>

        <div className="adm-check" style={{ background: '#eee8da' }}>
          <div className="adm-check-head"><strong>Scoring thresholds</strong></div>
          <div className="adm-check-body">
            <div className="adm-check-nums">
              <label>Easy up to
                <input type="number" min={0} max={100} value={settings.scoring.easyMax}
                  onChange={e => update(s => { s.scoring.easyMax = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))); })} />
              </label>
              <label>Moderate up to
                <input type="number" min={0} max={100} value={settings.scoring.moderateMax}
                  onChange={e => update(s => { s.scoring.moderateMax = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))); })} />
              </label>
            </div>
            {scoringErr && <p className="adm-error" role="alert">“Moderate up to” must be ≥ “Easy up to”.</p>}
            <p className="adm-help">Effort score = sum of effort points for found checks + 1 per step beyond 2.</p>
          </div>
        </div>

        {ordered.map(cat => <CheckRow key={cat.id} cat={cat} update={update} />)}

        <AddCheckForm settings={settings} update={update} />

        <div className="adm-actions">
          {confirmAll
            ? <button className="primary-button" style={{ minHeight: 40, padding: '8px 14px' }} onClick={() => { resetAll(); setConfirmAll(false); }}><RotateCcw size={14} /> Confirm: reset all checks</button>
            : <button className="secondary-button" style={{ minHeight: 40, padding: '8px 14px' }} onClick={() => setConfirmAll(true)}><RotateCcw size={14} /> Reset all checks to defaults</button>}
        </div>
      </div>
    </section>
  );
}
