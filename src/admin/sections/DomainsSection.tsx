import { useState, type ReactNode } from 'react';
import { Globe2, Plus, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import type { Settings } from '../../lib/types.ts';

function normalizeDomain(raw: string): string | null {
  const d = raw.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .replace(/^www\./, '');
  if (!d || !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(d)) return null;
  if (!d.includes('.') && d !== 'localhost') return null;
  return d;
}

function DomainList({ title, icon, listKey, settings, update }: {
  title: string;
  icon: ReactNode;
  listKey: 'trusted' | 'blocked';
  settings: Settings;
  update: (fn: (draft: Settings) => void) => void;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const list = settings.domains[listKey];
  const other = listKey === 'trusted' ? 'blocked' : 'trusted';

  const add = () => {
    const d = normalizeDomain(draft);
    if (!d) { setError('Enter a domain like example.com'); return; }
    if (list.includes(d)) { setError('Already in this list.'); return; }
    setError(null);
    setDraft('');
    update(s => {
      s.domains[other] = s.domains[other].filter(x => x !== d); // a domain can't be in both
      if (!s.domains[listKey].includes(d)) s.domains[listKey].push(d);
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13, color: listKey === 'blocked' ? '#78382e' : '#395035' }}>
        {icon} {title}
      </div>
      <div className="adm-list">
        {list.length === 0 && <span style={{ fontSize: 12, color: '#7a8172' }}>None yet.</span>}
        {list.map(d => (
          <div key={d} className="adm-list-item">
            <span>{d}</span>
            <button className="icon-button" aria-label={`Remove ${d}`} onClick={() => update(s => { s.domains[listKey] = s.domains[listKey].filter(x => x !== d); })}><X size={14} /></button>
          </div>
        ))}
      </div>
      <div className="adm-add">
        <input type="text" value={draft} placeholder="example.com" aria-label={`Add ${title.toLowerCase()} domain`}
          onChange={e => { setDraft(e.target.value); setError(null); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button className="secondary-button" style={{ minHeight: 40, padding: '6px 12px' }} onClick={add}><Plus size={14} /> Add</button>
      </div>
      {error && <p className="adm-error" role="alert">{error}</p>}
    </div>
  );
}

export default function DomainsSection({ settings, update }: { settings: Settings; update: (fn: (draft: Settings) => void) => void }) {
  return (
    <section className="adm-section">
      <div className="adm-section-head"><Globe2 size={19} /><h2>Domains</h2></div>
      <div className="adm-section-body">
        <p>Blocked domains always read <strong>High risk</strong>; trusted domains get a note on the card. Subdomains are included.</p>
        <div className="adm-domains">
          <DomainList title="Trusted" icon={<ShieldCheck size={15} />} listKey="trusted" settings={settings} update={update} />
          <DomainList title="Blocked" icon={<ShieldAlert size={15} />} listKey="blocked" settings={settings} update={update} />
        </div>
      </div>
    </section>
  );
}
