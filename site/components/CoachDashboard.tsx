'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Send, ShieldCheck, LifeBuoy, BookText, Plus, Trash2, MessageSquare,
  Menu, ArrowLeft, Sparkles, MessageCirclePlus,
} from 'lucide-react';
import { askCoach, nextSuggestions, type AgeBand, type HistoryTurn, type Lang } from '../lib/coach';
import { TypeOut } from './TypeOut';
import {
  loadSessions, saveSessions, newSession, titleFrom, upsert, type Session, type StoredMsg,
} from '../lib/coachStore';

const LABELS: Record<Lang, {
  brand: string; back: string; newChat: string; recent: string; empty: string;
  placeholder: string; ask: string; age: string; you: string; coach: string;
  suggestions: string; continue: string; chips: string[]; disclaimer: string; demo: string;
  clearAll: string; privacy: string; deleteChat: string; untitled: string; greeting: string;
}> = {
  en: {
    brand: 'Coach workspace', back: 'Back to site', newChat: 'New chat', recent: 'Your chats',
    empty: 'No saved chats yet.', placeholder: 'Type your question…', ask: 'Ask',
    age: 'Child’s age', you: 'You', coach: 'Coach', suggestions: 'Try asking about',
    continue: 'You could also ask',
    chips: ['How do I talk to my teen?', 'What should I say about periods?', 'How do I explain consent?', 'A friend told my child a myth'],
    disclaimer: 'Not a diagnosis. The live coach answers only from a reviewed knowledge base and never stores your name or your child’s.',
    demo: 'Preview — sample grounded answers. The live coach connects to the approved knowledge base and routes any disclosure to real help.',
    clearAll: 'Clear all chats', deleteChat: 'Delete chat', untitled: 'New conversation',
    privacy: 'Saved only on this device — never on our servers. On a shared phone, delete chats when you’re done.',
    greeting: 'Ask a question the way a parent would. Every answer is grounded in an approved source.',
  },
  rw: {
    brand: 'Ahakorerwa umujyanama', back: 'Subira ku rubuga', newChat: 'Ikiganiro gishya', recent: 'Ibiganiro byawe',
    empty: 'Nta biganiro byabitswe.', placeholder: 'Andika ikibazo cyawe…', ask: 'Baza',
    age: 'Imyaka y’umwana', you: 'Wowe', coach: 'Umujyanama', suggestions: 'Gerageza kubaza kuri',
    continue: 'Ushobora no kubaza',
    chips: ['Nganire nte n’umwana wanjye?', 'Mvuge iki ku mihango?', 'Nsobanure nte kwemera?', 'Inshuti yabwiye umwana ikinyoma'],
    disclaimer: 'Si isuzuma. Umujyanama nyawe asubiza ashingiye ku bumenyi bwasuzumwe kandi ntabika izina ryawe cyangwa iry’umwana.',
    demo: 'Igerageza — ibisubizo by’urugero bishingiye ku nyandiko. Umujyanama nyawe yifashisha ubumenyi bwemejwe kandi akohereza ku bufasha nyabwo.',
    clearAll: 'Siba ibiganiro byose', deleteChat: 'Siba ikiganiro', untitled: 'Ikiganiro gishya',
    privacy: 'Bibikwa kuri iki gikoresho gusa — ntabwo biba kuri seriveri. Ku telefone isangiwe, siba ibiganiro nurangiza.',
    greeting: 'Baza ikibazo nk’uko umubyeyi yakibaza. Buri gisubizo gishingira ku nkomoko yemejwe.',
  },
};

const AGE_OPTS: AgeBand[] = ['10_12', '13_15', '16_19'];
const AGE_LABEL: Record<AgeBand, string> = { '10_12': '10–12', '13_15': '13–15', '16_19': '16–19' };

export function CoachDashboard() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [current, setCurrent] = useState<Session>(() => newSession('en', '13_15'));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const idRef = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);

  const t = LABELS[current.lang];

  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);
    if (loaded.length > 0) setCurrent(loaded[0]!);
    // Seed the id counter above any persisted message id so React keys stay
    // unique after a reload (ids would otherwise restart at 1 and collide).
    let maxId = 0;
    for (const s of loaded) for (const m of s.messages) if (m.id > maxId) maxId = m.id;
    idRef.current = maxId + 1;
    setMounted(true);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [current.messages, busy]);

  function persist(list: Session[]) {
    setSessions(list);
    saveSessions(list);
  }

  function startNew() {
    setCurrent(newSession(current.lang, current.ageBand));
    setNavOpen(false);
  }

  function select(id: string) {
    const s = sessions.find((x) => x.id === id);
    if (s) setCurrent({ ...s });
    setNavOpen(false);
  }

  function remove(id: string) {
    const list = sessions.filter((x) => x.id !== id);
    persist(list);
    if (current.id === id) {
      if (list.length > 0) setCurrent({ ...list[0]! });
      else setCurrent(newSession(current.lang, current.ageBand));
    }
  }

  function clearAll() {
    persist([]);
    setCurrent(newSession(current.lang, current.ageBand));
  }

  function updateMeta(patch: Partial<Pick<Session, 'lang' | 'ageBand'>>) {
    const next = { ...current, ...patch };
    setCurrent(next);
    if (next.messages.length > 0) persist(upsert(sessions, next));
  }

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');

    const hist: HistoryTurn[] = current.messages
      .map((m) => ({ role: m.role, text: m.role === 'user' ? (m.text ?? '') : (m.reply?.answer ?? '') }))
      .filter((h) => h.text);

    const userMsg: StoredMsg = { id: idRef.current++, role: 'user', text: q };
    let sess: Session = {
      ...current,
      messages: [...current.messages, userMsg],
      updatedAt: Date.now(),
    };
    if (sess.messages.length === 1) sess.title = titleFrom(q);
    setCurrent(sess);
    let list = upsert(sessions, sess);
    persist(list);

    setBusy(true);
    const { reply, demo: isDemo } = await askCoach(q, sess.lang, sess.ageBand, hist);
    setDemo(isDemo);

    const coachMsg: StoredMsg = { id: idRef.current++, role: 'coach', reply };
    sess = { ...sess, messages: [...sess.messages, coachMsg], updatedAt: Date.now() };
    setCurrent(sess);
    persist(upsert(list, sess));
    setBusy(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const shownSessions = mounted ? sessions : [];
  const lastCoachId = [...current.messages].reverse().find((m) => m.role === 'coach')?.id;

  return (
    <div className={`cw${navOpen ? ' nav-open' : ''}`}>
      <div className="cw-scrim" onClick={() => setNavOpen(false)} aria-hidden />

      <aside className="cw-side">
        <Link href="/" className="cw-back"><ArrowLeft size={15} /> {t.back}</Link>
        <button className="cw-new" onClick={startNew}><Plus size={16} /> {t.newChat}</button>

        <div className="cw-recent-label">{t.recent}</div>
        <div className="cw-list">
          {shownSessions.length === 0 ? (
            <div className="cw-empty">{t.empty}</div>
          ) : (
            shownSessions.map((s) => (
              <div key={s.id} className={`cw-item${s.id === current.id ? ' active' : ''}`}>
                <button className="cw-item-main" onClick={() => select(s.id)}>
                  <MessageSquare size={14} aria-hidden />
                  <span className="cw-item-title">{s.title || t.untitled}</span>
                </button>
                <button className="cw-item-del" onClick={() => remove(s.id)} aria-label={t.deleteChat} title={t.deleteChat}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {shownSessions.length > 0 ? (
          <button className="cw-clear" onClick={clearAll}><Trash2 size={13} /> {t.clearAll}</button>
        ) : null}
        <p className="cw-privacy"><ShieldCheck size={13} aria-hidden /> {t.privacy}</p>
      </aside>

      <main className="cw-main">
        <header className="cw-top">
          <button className="cw-menu" onClick={() => setNavOpen((v) => !v)} aria-label="Open chats"><Menu size={18} /></button>
          <div className="cw-brand"><span className="cw-brand-mark">PC</span> <span className="cw-brand-text">{t.brand}</span></div>
          <div className="cw-controls">
            <div className="coach-seg" role="group" aria-label="Language">
              <button className={current.lang === 'en' ? 'on' : ''} onClick={() => updateMeta({ lang: 'en' })} type="button">EN</button>
              <button className={current.lang === 'rw' ? 'on' : ''} onClick={() => updateMeta({ lang: 'rw' })} type="button">RW</button>
            </div>
            <label className="coach-age">
              <span>{t.age}</span>
              <select
                value={current.ageBand}
                onChange={(e) => updateMeta({ ageBand: e.target.value as AgeBand })}
                aria-label={t.age}
              >
                {AGE_OPTS.map((k) => <option key={k} value={k}>{AGE_LABEL[k]}</option>)}
              </select>
            </label>
          </div>
        </header>

        <div className="cw-body" ref={listRef}>
          {current.messages.length === 0 ? (
            <div className="cw-welcome">
              <div className="cw-welcome-badge"><Sparkles size={26} /></div>
              <h1>{t.newChat}</h1>
              <p>{t.greeting}</p>
              <div className="coach-suggest-label">{t.suggestions}</div>
              <div className="coach-chips">
                {t.chips.map((c) => (
                  <button key={c} type="button" className="coach-chip" onClick={() => void send(c)}>{c}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="cw-thread">
              {current.messages.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="coach-msg user">
                    <div className="coach-who">{t.you}</div>
                    <div className="coach-bubble">{m.text}</div>
                  </div>
                ) : (
                  <div key={m.id} className={`coach-msg coach ${m.reply?.kind ?? ''}`}>
                    <div className="coach-who">
                      {m.reply?.kind === 'referral' ? <LifeBuoy size={13} /> : <ShieldCheck size={13} />}
                      {t.coach}
                    </div>
                    <div className="coach-bubble">
                      <TypeOut text={m.reply?.answer ?? ''} animate={m.id === lastCoachId} />
                      {m.reply?.starter ? <div className="coach-starter">{m.reply.starter}</div> : null}
                      {m.reply?.source ? <div className="coach-source"><BookText size={12} aria-hidden /> {m.reply.source}</div> : null}
                    </div>
                    {!busy && m.id === lastCoachId ? (() => {
                      const asked = current.messages.filter((x) => x.role === 'user').map((x) => x.text ?? '');
                      const options = nextSuggestions(m.reply, asked, t.chips);
                      return options.length > 0 ? (
                        <div className="coach-followups">
                          <span className="coach-followups-label"><MessageCirclePlus size={12} aria-hidden /> {t.continue}</span>
                          <div className="coach-chips">
                            {options.map((c) => (
                              <button key={c} type="button" className="coach-chip" onClick={() => void send(c)}>{c}</button>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })() : null}
                  </div>
                ),
              )}
              {busy ? (
                <div className="coach-msg coach">
                  <div className="coach-who"><ShieldCheck size={13} /> {t.coach}</div>
                  <div className="coach-bubble coach-typing"><span></span><span></span><span></span></div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {demo ? <div className="coach-demo cw-demo">{t.demo}</div> : null}

        <form className="cw-input" onSubmit={onSubmit}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.placeholder} aria-label={t.placeholder} />
          <button type="submit" className="btn primary" disabled={busy || !input.trim()}>{t.ask} <Send size={15} aria-hidden /></button>
        </form>
        <p className="cw-disclaimer"><ShieldCheck size={13} aria-hidden /> {t.disclaimer}</p>
      </main>
    </div>
  );
}
