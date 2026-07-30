import {
  MessageCircle,
  BookOpenText,
  Users,
  ShieldCheck,
  KeyRound,
  LifeBuoy,
  WifiOff,
  ArrowRight,
} from 'lucide-react';
import { Reveal } from '../components/Reveal';

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'A private coach, by app or SMS',
    body: 'Ask a question in Kinyarwanda or English and get a grounded answer with a conversation starter for your child’s age — never a guess. If it doesn’t have an approved answer, it says so and points you to a person instead.',
  },
  {
    icon: BookOpenText,
    title: 'Micro-lessons, with audio',
    body: 'Short, clinically and culturally reviewed lessons on puberty, consent, and relationships — built for low literacy first, with audio as a first-class option, not an afterthought.',
  },
  {
    icon: Users,
    title: 'Community sessions',
    body: 'Community health workers and trained parent champions run in-person sessions with guides and discussion prompts — for parents who’d rather learn alongside their neighbours.',
  },
];

const TRUST = [
  { icon: ShieldCheck, title: 'Every answer traces to an approved source', body: 'The coach only answers from a clinically and culturally reviewed knowledge base — never open-ended guessing.' },
  { icon: KeyRound, title: 'We never ask for your child’s name or ID', body: 'Only an age band is ever recorded. No adolescent identity is stored anywhere in the system.' },
  { icon: LifeBuoy, title: 'Disclosures get help immediately', body: 'A sign of abuse, exploitation, or crisis routes straight to local referral help — calmly, without needing anyone’s identity.' },
  { icon: WifiOff, title: 'Works even when the network doesn’t', body: 'Saved lessons and help information are available offline — a coach that’s temporarily unreachable never leaves you stranded.' },
];

export default function HomePage() {
  return (
    <>
      <nav className="site-nav">
        <div className="wrap">
          <div className="brand">
            <span className="brand-mark">PC</span>
            ParentConnect AI
          </div>
          <div className="site-links">
            <a href="#how-it-works">How it works</a>
            <a href="#safety">Safety &amp; privacy</a>
            <a href="#help">Get help</a>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-orbs" aria-hidden>
            <div className="orb orb-1" />
            <div className="orb orb-2" />
          </div>
          <div className="wrap">
            <div className="hero-grid">
              <div>
                <span className="eyebrow">A programme for Rwanda</span>
                <h1>
                  Helping parents become their teenagers&rsquo; <em>most trusted</em> source on growing up.
                </h1>
                <p className="lede">
                  Most parents want to talk with their 10&ndash;19-year-olds about puberty, relationships,
                  and staying safe &mdash; they just don&rsquo;t always have the words, the confidence, or a
                  private place to ask. ParentConnect AI gives parents that place.
                </p>
                <div className="cta-row">
                  <a className="btn primary" href="#how-it-works">
                    See how it works <ArrowRight size={15} aria-hidden />
                  </a>
                  <a className="btn ghost" href="#safety">
                    Read our safety commitments
                  </a>
                </div>
              </div>

              <Reveal delay={150}>
                <div className="hero-card">
                  <span className="quote-mark" aria-hidden>&ldquo;</span>
                  <blockquote>
                    A refusal is a success here when the alternative is an unsafe answer.
                  </blockquote>
                  <cite>Our guiding design principle</cite>
                  <hr />
                  <div className="hero-status">
                    <span className="dot" aria-hidden />
                    <span>Currently in development, preparing for a district pilot in Rwanda.</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="how-it-works">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <span className="eyebrow">How it works</span>
                <h2>Reachable however a parent already has a phone.</h2>
                <p>
                  Cultural taboos push adolescents toward peers and social media for answers. The gap
                  isn&rsquo;t a lack of accurate information in the country &mdash; it&rsquo;s confidence at
                  the parent level.
                </p>
              </div>
            </Reveal>
            <div>
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Reveal key={f.title} delay={i * 90}>
                    <div className="feature-row">
                      <div className="feature-icon"><Icon size={20} /></div>
                      <div className="feature-body">
                        <h3>{f.title}</h3>
                        <p>{f.body}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section id="safety" className="ink-band">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <span className="eyebrow">Safety &amp; privacy</span>
                <h2>Built so a wrong answer can&rsquo;t happen quietly.</h2>
                <p>Four commitments that hold regardless of channel, district, or how the pilot goes.</p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="trust-list">
                {TRUST.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div className="trust-item" key={t.title}>
                      <div className="icon"><Icon size={17} /></div>
                      <h4>{t.title}</h4>
                      <p>{t.body}</p>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

        <section id="help">
          <div className="wrap">
            <Reveal>
              <div className="help-band">
                <div className="icon"><LifeBuoy size={21} /></div>
                <div>
                  <h3>Need help right now?</h3>
                  <p>
                    If you or someone you know is in danger, ParentConnect AI&rsquo;s app and SMS service
                    surface local emergency and child-protection contacts for your district &mdash; no login
                    and no identity required. This site doesn&rsquo;t list phone numbers directly, so you
                    always see the current, correct contact for where you are.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="brand">
            <span className="brand-mark">PC</span>
            ParentConnect AI
          </div>
          <p>Not a diagnostic or clinical service. Not a substitute for schools, health facilities, or Isange One Stop Centres.</p>
        </div>
      </footer>
    </>
  );
}
