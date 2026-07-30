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
          <div className="wrap">
            <span className="eyebrow">A programme for Rwanda</span>
            <h1>Helping parents become their teenagers&rsquo; most trusted source on growing up.</h1>
            <p className="lede">
              Most parents want to talk with their 10&ndash;19-year-olds about puberty, relationships, and
              staying safe &mdash; they just don&rsquo;t always have the words, the confidence, or a private
              place to ask. ParentConnect AI gives parents that place: private coaching, conversation
              scripts, and community support, in Kinyarwanda first.
            </p>
            <div className="cta-row">
              <a className="btn primary" href="#how-it-works">
                See how it works <ArrowRight size={15} aria-hidden />
              </a>
              <a className="btn ghost" href="#safety">
                Read our safety &amp; privacy commitments
              </a>
            </div>
            <div className="status-pill">
              <span className="dot" aria-hidden />
              In development &mdash; preparing for a district pilot in Rwanda
            </div>
          </div>
        </section>

        <section id="how-it-works">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">How it works</span>
              <h2>One programme, reachable however a parent already has a phone.</h2>
              <p>
                Cultural taboos push adolescents toward peers and social media for answers. The gap isn&rsquo;t
                a lack of accurate information in the country &mdash; it&rsquo;s confidence at the parent level.
                ParentConnect AI closes that gap on the channel each parent can actually use.
              </p>
            </div>
            <div className="card-grid">
              <div className="card">
                <div className="icon"><MessageCircle size={19} /></div>
                <h3>A private coach, by app or SMS</h3>
                <p>
                  Ask a question in Kinyarwanda or English and get a grounded answer with a conversation
                  starter for your child&rsquo;s age &mdash; never a guess. If it doesn&rsquo;t have an approved
                  answer, it says so and points you to a person instead.
                </p>
              </div>
              <div className="card">
                <div className="icon"><BookOpenText size={19} /></div>
                <h3>Micro-lessons, with audio</h3>
                <p>
                  Short, clinically and culturally reviewed lessons on puberty, consent, and relationships
                  &mdash; built for low literacy first, with audio as a first-class option, not an afterthought.
                </p>
              </div>
              <div className="card">
                <div className="icon"><Users size={19} /></div>
                <h3>Community sessions</h3>
                <p>
                  Community health workers and trained parent champions run in-person sessions with guides
                  and discussion prompts &mdash; for parents who&rsquo;d rather learn alongside their neighbours.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="safety">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Safety &amp; privacy</span>
              <h2>Built so a wrong answer can&rsquo;t happen quietly.</h2>
              <p>A refusal is a success here when the alternative is an unsafe answer.</p>
            </div>
            <div className="trust-grid">
              <div className="trust-row">
                <div className="icon"><ShieldCheck size={17} /></div>
                <div>
                  <h4>Every answer traces to an approved source</h4>
                  <p>The coach only answers from a clinically and culturally reviewed knowledge base &mdash; never from open-ended guessing.</p>
                </div>
              </div>
              <div className="trust-row">
                <div className="icon"><KeyRound size={17} /></div>
                <div>
                  <h4>We never ask for your child&rsquo;s name or ID</h4>
                  <p>Only an age band is ever recorded. No adolescent identity is stored anywhere in the system.</p>
                </div>
              </div>
              <div className="trust-row">
                <div className="icon"><LifeBuoy size={17} /></div>
                <div>
                  <h4>Disclosures get help immediately</h4>
                  <p>A sign of abuse, exploitation, or crisis routes straight to local referral help &mdash; calmly, without judgement, and without needing anyone&rsquo;s identity.</p>
                </div>
              </div>
              <div className="trust-row">
                <div className="icon"><WifiOff size={17} /></div>
                <div>
                  <h4>Works even when the network doesn&rsquo;t</h4>
                  <p>Saved lessons and help information are available offline &mdash; a coach that&rsquo;s temporarily unreachable never leaves you stranded.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="help">
          <div className="wrap">
            <div className="help-band">
              <div className="icon"><LifeBuoy size={21} /></div>
              <div>
                <h3>Need help right now?</h3>
                <p>
                  If you or someone you know is in danger, ParentConnect AI&rsquo;s app and SMS service surface
                  local emergency and child-protection contacts for your district &mdash; no login and no
                  identity required. This site doesn&rsquo;t list phone numbers directly, so you always see
                  the current, correct contact for where you are.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <p>ParentConnect AI &mdash; a child-safeguarding and family-support programme for Rwanda.</p>
          <p>Not a diagnostic or clinical service. Not a substitute for schools, health facilities, or Isange One Stop Centres.</p>
        </div>
      </footer>
    </>
  );
}
