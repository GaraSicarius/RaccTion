import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { MotionConfig, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowRight, Bookmark, Check, ChevronDown, ChevronRight, CircleHelp, Coffee, ExternalLink, FileText, Fingerprint, Info, Leaf, LoaderCircle, LockKeyhole, Move, ScanLine, Search, ShieldCheck, SlidersHorizontal, Trash2, UserRound, X } from 'lucide-react';
import Alert from '@/components/ui/alert';
import { offers, type Offer } from '@/lib/demo-data';
import { reorderSections } from '@/lib/review-rules.mjs';

type Tab = 'review' | 'saved' | 'profile';
type Profile = { name: string; email: string; phone: string; address: string };
type Saved = { id: string; capturedAt: string };
type Modal = { type: 'source'; sourceId: string } | { type: 'help' | 'navigate' | 'fill' } | null;
const emptyProfile: Profile = { name: '', email: '', phone: '', address: '' };
const profileLabels: Record<keyof Profile, string> = { name: 'Full name', email: 'Email address', phone: 'Phone number', address: 'Address' };
const priorities = [{ value: 'conditions', label: 'Key conditions' }, { value: 'costs', label: 'Costs first' }, { value: 'steps', label: 'Steps first' }, { value: 'dates', label: 'Dates first' }, { value: 'eligibility', label: 'Eligibility first' }];

function loadSaved(): Saved[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem('racction-saved') || '[]');
    return Array.isArray(data) ? data.filter((item): item is Saved => item && typeof item.id === 'string' && offers.some(o => o.id === item.id) && typeof item.capturedAt === 'string' && Number.isFinite(Date.parse(item.capturedAt))).slice(0, 3) : [];
  } catch { return []; }
}

export function Raccoon({ small = false }: { small?: boolean }) {
  return <svg viewBox="0 0 64 54" fill="none" className={small ? 'raccoon small' : 'raccoon'} aria-hidden="true">
    <path d="M8 23 7 5c9-2 16 3 19 9h12C41 8 48 3 57 5l-1 18c6 8 3 18-7 24-10 7-24 7-34 0C5 41 2 31 8 23Z" fill="currentColor" />
    <path d="m11 9 3 14 9-7c-4-4-7-6-12-7Zm42 0-3 14-9-7c4-4 7-6 12-7Z" fill="#292d2d" />
    <path d="M7 31c6-10 18-11 25-2 7-9 19-8 25 2l-4 9c-8 6-16 1-21-4-5 5-13 10-21 4Z" fill="#292d2d" />
    <path d="M21 29c-4 0-6 2-6 5 4 1 7 0 8-3l-2-2Zm22 0c4 0 6 2 6 5-4 1-7 0-8-3l2-2Z" fill="#f5f3ed" />
    <path d="M27 40h10l-5 5-5-5Z" fill="#292d2d" />
  </svg>;
}

function Background({ enabled }: { enabled: boolean }) {
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    element.style.transform = 'translate3d(0,0,0) scale(1.04)';
    if (!enabled || !matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / innerWidth - .5) * -20;
        const y = (event.clientY / innerHeight - .5) * -12;
        element.style.transform = `translate3d(${x}px,${y}px,0) scale(1.04)`;
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(frame); };
  }, [enabled]);
  return <div className="scenery" aria-hidden="true"><div ref={scene} className="scenery-image"><svg viewBox="0 0 5000 2000" preserveAspectRatio="xMidYMid slice"><image href={`${import.meta.env.BASE_URL}assets/cave-background.jpg`} width="8502" height="2000" /></svg></div><div className="scenery-shade" /></div>;
}

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}
  </dialog>;
}

export default function App() {
  const reducedMotion = useReducedMotion();
  const [motionOn, setMotionOn] = useState(true);
  const [tab, setTab] = useState<Tab>('review');
  const [offerId, setOfferId] = useState('coffee');
  const offer = offers.find(item => item.id === offerId) || offers[0];
  const [saved, setSaved] = useState<Saved[]>(loadSaved);
  const [priority, setPriority] = useState(() => { try { const value = localStorage.getItem('racction-priority'); return priorities.some(p => p.value === value) ? value! : 'conditions'; } catch { return 'conditions'; } });
  const [profile, setProfile] = useState<Profile>({ ...emptyProfile });
  const [draft, setDraft] = useState<Profile>({ ...emptyProfile });
  const [form, setForm] = useState<Profile>({ ...emptyProfile });
  const [formVisible, setFormVisible] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const formRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [openSection, setOpenSection] = useState<string | null>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (notice) { const timeout = setTimeout(() => setNotice(null), 6000); return () => clearTimeout(timeout); } }, [notice]);
  useEffect(() => {
    if (formVisible) {
      formRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
      formRef.current?.focus({ preventScroll: true });
    }
  }, [formVisible, reducedMotion]);
  const announce = (text: string, type: 'success' | 'error' | 'info' = 'success') => setNotice({ text, type });
  const persist = (items: Saved[]) => {
    setSaved(items);
    try { localStorage.setItem('racction-saved', JSON.stringify(items)); return true; }
    catch { announce('Browser storage is unavailable. Changes will last only while this page is open.', 'error'); return false; }
  };
  const saveOffer = () => {
    if (persist([{ id: offer.id, capturedAt: new Date().toISOString() }, ...saved.filter(s => s.id !== offer.id)])) announce('Sample review saved on this device.');
  };
  const chooseOffer = (id: string) => {
    setOfferId(id); setSnapshot(null); setFormVisible(false); setForm({ ...emptyProfile }); setOpenSection(null); setBusy(true); setNotice(null);
    clearTimeout(timer.current); timer.current = setTimeout(() => setBusy(false), 600);
  };
  const choosePriority = (value: string) => {
    setPriority(value);
    try { localStorage.setItem('racction-priority', value); } catch { announce('Your display order could not be saved for next time.', 'info'); }
  };
  const saveProfile = (event: FormEvent) => { event.preventDefault(); setProfile({ ...draft }); announce('Profile ready for this session. It has not been sent anywhere.'); };
  const sections: Record<string, { title: string; detail: string; icon: ReactNode }> = {
    conditions: { title: 'The conditions', detail: offer.exclusions, icon: <FileText size={17} /> },
    costs: { title: 'What you’ll pay', detail: `${offer.costLabel}: ${offer.cost}. ${offer.kind === 'coffee' ? 'The required purchase is separate from any optional coffee add-ons.' : offer.kind === 'trial' ? 'The recurring charge begins after the 7-day trial. Cancel before the trial ends to avoid it.' : 'The complete amount cannot be established without the terms.'}`, icon: <Fingerprint size={17} /> },
    steps: { title: 'How to claim', detail: '', icon: <ScanLine size={17} /> },
    dates: { title: 'Dates & deadlines', detail: `${offer.deadlineLabel}: ${offer.deadline}. ${offer.kind === 'coffee' ? 'Redemption closes at 11:59 PM Philippine time on 31 October 2026. Ad publication date is not provided.' : offer.kind === 'trial' ? 'The trial deadline is relative to signup. A calendar deadline cannot be calculated before you sign up.' : 'No verified start, end or redemption date.'}`, icon: <Bookmark size={17} /> },
    eligibility: { title: 'Who can claim', detail: `${offer.eligibility} Your account eligibility has not been checked.`, icon: <UserRound size={17} /> },
  };
  const statusText = offer.status === 'unknown' ? 'Not enough information' : offer.status === 'clear' ? 'Fewer warning signs' : 'One condition to look closer at';
  const source = modal?.type === 'source' ? offer.sources.find(item => item.id === modal.sourceId) : undefined;
  const selectedFields = (Object.entries(profile) as [keyof Profile, string][]).filter(([, value]) => value.trim());

  return <MotionConfig reducedMotion="user"><Background enabled={motionOn && !reducedMotion} />
    <a className="skip-link" href="#workspace">Skip to offer review</a>
    <div className="page-shell">
      <header className="site-header"><a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('review'); }} aria-label="RaccTion home"><Raccoon /><span>Racc<span className="brand-light">Tion</span><small>A curious eye for the fine print.</small></span></a>
        <div className="header-actions"><button className="quiet-button motion-toggle" aria-label="Toggle background motion" aria-pressed={motionOn && !reducedMotion} disabled={!!reducedMotion} onClick={() => setMotionOn(!motionOn)} title={reducedMotion ? 'Motion disabled by your device preference' : 'Toggle background movement'}><Move size={15} /><span>Motion {motionOn && !reducedMotion ? 'on' : 'off'}</span></button><button className="quiet-button" aria-label="How it works" onClick={() => setModal({ type: 'help' })}><CircleHelp size={17} /><span>How it works</span></button></div>
      </header>
      <main className="main-layout">
        <aside className="introduction"><div className="intro-copy"><h1>Look a little<br /><em>closer.</em></h1><p>Big promises. Tiny print.<br />Know what an offer really asks of you<br className="desktop-break" /> before you take the next step.</p><a className="intro-link" href="#workspace">Let’s unpack an offer <ArrowDown size={17} /></a></div>
          <div className="field-note"><Raccoon small /><div><strong>Curiosity looks good on you.</strong><p>Inspect the offer.<br />Know the conditions.</p></div></div>
          <div className="intro-footnote"><LockKeyhole size={14} /> Designed for analysis on your device.</div>
        </aside>
        <section id="workspace" className="workspace" aria-label="RaccTion interface preview" tabIndex={-1}>
          <div className="workspace-top"><div className="workspace-wordmark"><Raccoon small /><span>RaccTion</span></div><span className="demo-label"><span /> Interface preview</span></div>
          <nav className="tabs" aria-label="Workspace"><button className={tab === 'review' ? 'tab active' : 'tab'} aria-current={tab === 'review' ? 'page' : undefined} onClick={() => setTab('review')}><Search size={16} /> Offer review</button><button className={tab === 'saved' ? 'tab active' : 'tab'} aria-current={tab === 'saved' ? 'page' : undefined} onClick={() => setTab('saved')}><Bookmark size={16} /> Saved <span className="count">{saved.length}</span></button><button className={tab === 'profile' ? 'tab active' : 'tab'} aria-current={tab === 'profile' ? 'page' : undefined} onClick={() => setTab('profile')}><UserRound size={16} /> Your profile</button></nav>
          <div className="workspace-content">
            {tab === 'review' && <>
              <div className="page-title"><div><h2>The offer, unpacked.</h2><p>The useful details, before you commit.</p></div><button className="icon-button save-button" aria-label="Save this sample review" onClick={saveOffer} disabled={busy}><Bookmark size={19} fill={saved.some(s => s.id === offer.id) ? 'currentColor' : 'none'} /></button></div>
              <div className="sample-bar"><label htmlFor="sample-offer">Try a sample</label><div className="select-wrap"><select id="sample-offer" value={offer.id} onChange={e => chooseOffer(e.target.value)}><option value="coffee">The “free” coffee</option><option value="trial">A 7-day trial</option><option value="unknown">The missing fine print</option></select><ChevronDown size={15} /></div></div>
              {snapshot && <p className="snapshot-note"><Info size={14} /> Saved {new Date(snapshot).toLocaleDateString()}. Live terms not rechecked.</p>}
              {busy ? <div className="loading-state" role="status"><LoaderCircle className="spin" size={30} /><h3>Opening the sample review…</h3><p>Loading prepared findings for this demo.</p></div> : <>
                <div className="offer-heading"><span className="merchant-mark">{offer.kind === 'coffee' ? <Coffee size={24} /> : <Leaf size={24} />}</span><div><p className="merchant-name">{offer.merchant} <span>· Sample promotion</span></p><h3>{offer.title}</h3><p className="offer-subtitle">{offer.subtitle}</p></div></div>
                <div className={`review-indicator ${offer.status}`}><div className="indicator-title"><span className="status-symbol">{offer.status === 'clear' ? <Check size={14} /> : <Info size={14} />}</span><strong>{statusText}</strong><button className="text-button" onClick={() => setModal({ type: 'help' })} aria-label="About the warning indicator"><CircleHelp size={15} /></button></div><div className="indicator-track"><span className="indicator-pointer" /></div><div className="indicator-labels"><span>More warning signs</span><span>Fewer warning signs</span></div><p>{offer.status === 'unknown' ? 'Insufficient data to verify. The linked terms are unavailable.' : 'Based on the sample sources. This does not certify an offer as safe.'}</p></div>
                <Alert type={offer.status === 'unknown' ? 'info' : offer.status === 'clear' ? 'success' : 'warning'} message={offer.alert} />
                <div className="key-facts"><div><span>{offer.costLabel}</span><strong>{offer.cost}</strong></div><div><span>{offer.deadlineLabel}</span><strong>{offer.deadline}</strong></div></div>
                <div className="findings-toolbar"><h3>A closer look</h3><label className="priority-control"><SlidersHorizontal size={14} /><span className="sr-only">Show first</span><select value={priority} onChange={e => choosePriority(e.target.value)}>{priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select><ChevronDown size={13} /></label></div>
                <div className="findings">{reorderSections(priority).map((id: string) => <div className="finding" key={id}><button className="finding-toggle" onClick={() => setOpenSection(openSection === id ? null : id)} aria-expanded={openSection === id} aria-controls={`finding-${id}`}><span className="finding-icon">{sections[id].icon}</span><span>{sections[id].title}</span>{id === 'steps' && <small>{offer.steps.length} steps</small>}<ChevronRight size={16} className={openSection === id ? 'rotated' : ''} /></button><div id={`finding-${id}`} hidden={openSection !== id} className="finding-detail">{id === 'steps' ? <ol>{offer.steps.map(step => <li key={step}>{step}</li>)}</ol> : <p>{sections[id].detail}</p>}<button className="source-link" onClick={() => setModal({ type: 'source', sourceId: offer.sources.at(-1)!.id })}>Read supporting source <ArrowRight size={13} /></button></div></div>)}</div>
                <div className="source-row"><span><FileText size={14} /> {offer.status === 'unknown' ? '1 source · terms unavailable' : '2 sample sources reviewed'}</span><button className="source-link" onClick={() => setModal({ type: 'source', sourceId: offer.sources[0].id })}>View evidence <ExternalLink size={13} /></button></div>
                {offer.kind !== 'unknown' && <div className="form-assistance"><div><span className="round-icon"><ScanLine size={18} /></span><div><strong>A signup form is required</strong><p>You choose when to move and what to fill.</p></div></div><button className="primary-button" onClick={() => setModal({ type: 'navigate' })}>Find the form <ArrowRight size={16} /></button></div>}
                {formVisible && <section ref={formRef} tabIndex={-1} className="demo-form" aria-label="Sample signup form"><div className="section-title"><h3>Your sample signup</h3><span className="demo-label">Demo only</span></div><p>This form belongs to this preview. Nothing is sent.</p><form onSubmit={e => { e.preventDefault(); announce('Demo finished. No signup or purchase was submitted.'); }}>{(Object.keys(profileLabels) as (keyof Profile)[]).map(key => <label key={key}>{profileLabels[key]}<input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} autoComplete="off" /></label>)}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => setModal({ type: 'fill' })}>Preview autofill</button><button className="primary-button" type="submit">Finish demo <Check size={15} /></button></div></form></section>}
              </>}
            </>}
            {tab === 'saved' && <><div className="page-title"><div><h2>Keep a closer eye.</h2><p>Your sample reviews, saved on this device.</p></div><Bookmark size={23} /></div>{saved.length ? <div className="saved-list">{saved.map(item => { const savedOffer = offers.find(o => o.id === item.id)!; return <article className="saved-item" key={item.id}><span className="merchant-mark"><FileText size={22} /></span><div><h3>{savedOffer.title}</h3><p>{savedOffer.merchant} · {new Date(item.capturedAt).toLocaleDateString()}</p><button className="source-link" onClick={() => { setOfferId(item.id); setSnapshot(item.capturedAt); setTab('review'); setFormVisible(false); setOpenSection(null); }}>Open saved review <ArrowRight size={14} /></button></div><button className="icon-button" aria-label={`Delete saved review for ${savedOffer.merchant}`} onClick={() => persist(saved.filter(s => s.id !== item.id))}><Trash2 size={17} /></button></article>; })}</div> : <div className="empty-state"><span className="empty-icon"><Bookmark size={31} /></span><h3>A place for your findings.</h3><p>Save a sample review using the bookmark.<br />You can come back to its details here.</p><button className="secondary-button" onClick={() => setTab('review')}>Explore an offer <ArrowRight size={16} /></button></div>}<div className="privacy-note"><LockKeyhole size={16} /><p>Saved reviews are snapshots. Live terms are not rechecked when you open them.</p></div></>}
            {tab === 'profile' && <><div className="page-title"><div><h2>A little less typing.</h2><p>Your details, only when you choose to use them.</p></div><UserRound size={23} /></div><Alert type="info" message="Session only. Your details are cleared when this page reloads or closes." /><form className="profile-form" onSubmit={saveProfile}>{(Object.keys(profileLabels) as (keyof Profile)[]).map(key => <label key={key}>{profileLabels[key]}<input name={key} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} autoComplete={key === 'name' ? 'name' : key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'street-address'} placeholder={key === 'name' ? 'Your full name' : key === 'email' ? 'you@example.com' : key === 'phone' ? 'Optional' : 'Optional'} maxLength={key === 'address' ? 240 : 120} /></label>)}<div className="form-actions"><button type="button" className="text-button" onClick={() => { setDraft({ ...emptyProfile }); setProfile({ ...emptyProfile }); setForm({ ...emptyProfile }); announce('Profile and filled demo fields cleared.'); }}><Trash2 size={15} /> Clear details</button><button className="primary-button" type="submit">Use for this session <ArrowRight size={16} /></button></div></form><div className="privacy-note"><ShieldCheck size={18} /><p>Filling always needs your approval. RaccTion’s planned extension will leave submission and consent choices to you.</p></div></>}
          </div>
          <footer className="workspace-footer"><span><LockKeyhole size={12} /> Sample data stays in this browser</span><span>Live AI is not connected</span></footer>
        </section>
      </main>
      <footer className="page-footer"><span>RaccTion · A little clarity goes a long way.</span><span>Interactive prototype <span className="footer-dot">·</span> Synthetic offers</span></footer>
    </div>
    {notice && <div className="toast"><Alert type={notice.type} message={notice.text} /><button className="icon-button" onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={16} /></button></div>}
    {modal && <Dialog title={modal.type === 'help' ? 'A curious eye. A clear process.' : modal.type === 'source' ? 'The words behind the finding' : modal.type === 'navigate' ? 'Go to the signup form?' : 'Review before filling'} onClose={() => setModal(null)}>
      {modal.type === 'help' && <><p>RaccTion is being built to explain promotional conditions using local AI. This interface uses prepared sample findings so you can explore the flow.</p><ol className="help-steps"><li><strong>Open an offer.</strong><span>Review the benefit, costs, deadlines and conditions.</span></li><li><strong>Check the evidence.</strong><span>Read the source passages behind each finding.</span></li><li><strong>Choose your next step.</strong><span>Approve locating a form, then separately approve filling it.</span></li></ol><p className="muted">The indicator describes warning signs in reviewed content. It cannot certify authenticity. Missing information produces an unknown result.</p><button className="primary-button full-width" onClick={() => setModal(null)}>Take a closer look <ArrowRight size={16} /></button></>}
      {modal.type === 'source' && <><p className="source-meta"><FileText size={15} /> {source?.title}</p><blockquote>{source?.text}</blockquote><p className="muted">Original synthetic fixture · supplied with this prototype. No live merchant page was fetched.</p><div className="source-tabs">{offer.sources.map(s => <button key={s.id} className={s.id === source?.id ? 'secondary-button selected' : 'secondary-button'} onClick={() => setModal({ type: 'source', sourceId: s.id })}>{s.title}</button>)}</div></>}
      {modal.type === 'navigate' && <><p>The sample terms require registration. This will reveal and scroll to a demonstration form within RaccTion.</p><div className="destination"><ScanLine size={20} /><div><strong>Sample signup form</strong><span>This preview · no external website</span></div></div><p className="muted">Your details will not be filled by this step.</p><div className="dialog-actions"><button className="secondary-button" onClick={() => setModal(null)}>Stay here</button><button className="primary-button" onClick={() => { setModal(null); setFormVisible(true); if (formVisible) formRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' }); }}>Go to form <ArrowDown size={16} /></button></div></>}
      {modal.type === 'fill' && <>{selectedFields.length ? <><p>Only these fields will be filled in the sample signup form:</p><dl className="field-preview">{selectedFields.map(([key, value]) => <div key={key}><dt>{profileLabels[key]}</dt><dd>{value}</dd></div>)}</dl><p className="muted">Destination: this preview only. On a real website, inserted values may be read before submission. Submission remains your choice.</p><div className="dialog-actions"><button className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" onClick={() => { setForm(previous => ({ ...previous, ...Object.fromEntries(selectedFields) })); setModal(null); announce('Approved fields filled. Nothing has been submitted.'); }}>Fill these fields <Check size={16} /></button></div></> : <><p>Add the details you want to use in Your profile. They stay in memory for this session.</p><div className="dialog-actions"><button className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" onClick={() => { setModal(null); setTab('profile'); }}>Open your profile <ArrowRight size={16} /></button></div></>}</>}
    </Dialog>}
  </MotionConfig>;
}


