'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, ShieldCheck, LifeBuoy, Sparkles, BookText, MessageCirclePlus } from 'lucide-react';
import { askCoach, nextSuggestions, type AgeBand, type CoachReply, type HistoryTurn, type Lang } from '../lib/coach';
import { TypeOut } from './TypeOut';

interface Msg {
  id: number;
  role: 'user' | 'coach';
  reply?: CoachReply;
  text?: string;
}

const LABELS: Record<Lang, {
  title: string; subtitle: string; placeholder: string; ask: string;
  age: string; ageOpts: Record<AgeBand, string>; lang: string;
  disclaimer: string; demo: string; suggestions: string; continue: string; you: string; coach: string;
  chips: string[];
}> = {
  en: {
    title: 'Ask the coach',
    subtitle: 'Grounded answers from approved sources, on any device, in Kinyarwanda or English.',
    placeholder: 'Type your question…',
    ask: 'Ask',
    age: 'Child’s age',
    ageOpts: { '10_12': '10–12', '13_15': '13–15', '16_19': '16–19' },
    lang: 'Language',
    disclaimer: 'Not a diagnosis. The live coach answers only from a clinically & culturally reviewed knowledge base, and never stores your name or your child’s.',
    demo: 'Preview: sample grounded answers. The live coach connects to the approved knowledge base and routes any disclosure to real help.',
    suggestions: 'Try asking about',
    continue: 'You could also ask',
    you: 'You',
    coach: 'Coach',
    chips: ['How do I talk to my teen?', 'What should I say about periods?', 'How do I explain consent?', 'A friend told my child a myth'],
  },
  rw: {
    title: 'Baza umujyanama',
    subtitle: 'Ibisubizo bishingiye ku nyandiko zemejwe, ku gikoresho icyo ari cyo cyose, mu Kinyarwanda cyangwa Icyongereza.',
    placeholder: 'Andika ikibazo cyawe…',
    ask: 'Baza',
    age: 'Imyaka y’umwana',
    ageOpts: { '10_12': '10–12', '13_15': '13–15', '16_19': '16–19' },
    lang: 'Ururimi',
    disclaimer: 'Si isuzuma. Umujyanama nyawe asubiza gusa ashingiye ku bumenyi bwasuzumwe mu buvuzi no mu muco, kandi ntabika izina ryawe cyangwa iry’umwana wawe.',
    demo: 'Igerageza: ibisubizo by’urugero bishingiye ku nyandiko. Umujyanama nyawe yifashisha ubumenyi bwemejwe kandi akohereza ku bufasha nyabwo.',
    suggestions: 'Gerageza kubaza kuri',
    continue: 'Ushobora no kubaza',
    you: 'Wowe',
    coach: 'Umujyanama',
    chips: ['Nganire nte n’umwana wanjye?', 'Mvuge iki ku mihango?', 'Nsobanure nte kwemera?', 'Inshuti yabwiye umwana ikinyoma'],
  },
};

let idc = 1;

export function Coach() {
  const [lang, setLang] = useState<Lang>('en');
  const [ageBand, setAgeBand] = useState<AgeBand>('13_15');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const t = LABELS[lang];
  const lastCoachId = [...messages].reverse().find((m) => m.role === 'coach')?.id;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    const hist: HistoryTurn[] = messages
      .map((m) => ({ role: m.role, text: m.role === 'user' ? (m.text ?? '') : (m.reply?.answer ?? '') }))
      .filter((h) => h.text);
    setMessages((m) => [...m, { id: idc++, role: 'user', text: q }]);
    setBusy(true);
    const { reply, demo: isDemo } = await askCoach(q, lang, ageBand, hist);
    setDemo(isDemo);
    setMessages((m) => [...m, { id: idc++, role: 'coach', reply }]);
    setBusy(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="coach">
      <div className="coach-head">
        <div className="coach-title-row">
          <div className="coach-badge" aria-hidden><Sparkles size={18} /></div>
          <div>
            <h3>{t.title}</h3>
            <p>{t.subtitle}</p>
          </div>
        </div>
        <div className="coach-controls">
          <div className="coach-seg" role="group" aria-label={t.lang}>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')} type="button">EN</button>
            <button className={lang === 'rw' ? 'on' : ''} onClick={() => setLang('rw')} type="button">RW</button>
          </div>
          <label className="coach-age">
            <span>{t.age}</span>
            <select value={ageBand} onChange={(e) => setAgeBand(e.target.value as AgeBand)} aria-label={t.age}>
              {(Object.keys(t.ageOpts) as AgeBand[]).map((k) => (
                <option key={k} value={k}>{t.ageOpts[k]}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="coach-body" ref={listRef}>
        {messages.length === 0 ? (
          <div className="coach-empty">
            <div className="coach-suggest-label">{t.suggestions}</div>
            <div className="coach-chips">
              {t.chips.map((c) => (
                <button key={c} type="button" className="coach-chip" onClick={() => void send(c)}>{c}</button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="coach-msg user">
              <div className="coach-bubble">{m.text}</div>
            </div>
          ) : (
            <div key={m.id} className={`coach-msg coach ${m.reply?.kind ?? ''}`}>
              <div className="coach-avatar" aria-hidden>
                {m.reply?.kind === 'referral' ? <LifeBuoy size={14} /> : <ShieldCheck size={14} />}
              </div>
              <div className="coach-msg-col">
                <div className="coach-who">{t.coach}</div>
                <div className="coach-bubble">
                  <TypeOut text={m.reply?.answer ?? ''} animate={m.id === lastCoachId} />
                  {m.reply?.starter ? <div className="coach-starter">{m.reply.starter}</div> : null}
                  {m.reply?.source ? (
                    <div className="coach-source"><BookText size={12} aria-hidden /> {m.reply.source}</div>
                  ) : null}
                </div>
                {!busy && m.id === lastCoachId ? (() => {
                  const asked = messages.filter((x) => x.role === 'user').map((x) => x.text ?? '');
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
            </div>
          ),
        )}

        {busy ? (
          <div className="coach-msg coach">
            <div className="coach-avatar" aria-hidden><ShieldCheck size={14} /></div>
            <div className="coach-msg-col">
              <div className="coach-who">{t.coach}</div>
              <div className="coach-bubble coach-typing"><span></span><span></span><span></span></div>
            </div>
          </div>
        ) : null}
      </div>

      {demo ? <div className="coach-demo">{t.demo}</div> : null}

      <form className="coach-input" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
        />
        <button type="submit" className="btn primary" disabled={busy || !input.trim()}>
          {t.ask} <Send size={15} aria-hidden />
        </button>
      </form>

      <p className="coach-disclaimer"><ShieldCheck size={13} aria-hidden /> {t.disclaimer}</p>
    </div>
  );
}
