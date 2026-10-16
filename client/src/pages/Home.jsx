import { motion } from "framer-motion";
import { ArrowRight, BadgeIndianRupee, CalendarDays, Check, HeartHandshake, Medal, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { api, money } from "../lib/api";
import { useAsyncData } from "../hooks/useAsyncData";

export default function Home() {
  const { data } = useAsyncData(async () => {
    const [next, featured] = await Promise.all([api("/api/draws/next"), api("/api/charities/featured")]);
    return { next, charities: featured.charities || [] };
  }, []);
  const next = data?.next || {};
  const charities = data?.charities || [];
  const drawMonth = next.month ? new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${next.month}-01T00:00:00`)) : "upcoming";

  return (
    <main>
      <section className="hero landing-hero">
        <div className="hero-copy">
          <motion.p className="eyebrow landing-eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><span /> A little skill. A lot of good.</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>Make your<br /><em>next move</em><br />matter.</motion.h1>
          <motion.p className="hero-lede" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            Play a skill-based monthly draw, support a cause you believe in, and see exactly how every entry makes an impact.
          </motion.p>
          <motion.div className="hero-actions landing-actions" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Link className="primary-button" to="/signup">Join the next draw <ArrowRight size={18} /></Link>
            <Link className="landing-text-link" to="/results">See how it works <span>↓</span></Link>
          </motion.div>
          <div className="landing-trust"><span><Check size={15} /> Transparent monthly results</span><span><Check size={15} /> Verified charity partners</span></div>
        </div>
        <div className="hero-board landing-board">
          <div className="landing-orbit orbit-one" /><div className="landing-orbit orbit-two" />
          <div className="draw-card landing-jackpot">
            <div className="jackpot-card-top"><span><Sparkles size={15} /> NEXT JACKPOT</span><span className="live-dot">Live estimate</span></div>
            <p className="jackpot-month"><CalendarDays size={16} /> {drawMonth} draw</p>
            <strong>{money(next.jackpot || 0)}</strong>
            <p className="jackpot-caption">Current estimated top prize</p>
            <div className="jackpot-divider" />
            <div className="jackpot-stats"><span><UsersRound size={17} /><b>{next.activeSubscribers || 0}</b><small>active players</small></span><span><BadgeIndianRupee size={17} /><b>{money(next.rolloverIn || 0)}</b><small>rolled over</small></span></div>
            <Link className="jackpot-link" to="/results">Explore published draws <ArrowRight size={16} /></Link>
          </div>
          <div className="impact-note"><span className="impact-icon"><HeartHandshake size={20} /></span><span><b>Your play gives back.</b><small>Choose a verified charity to support.</small></span><Sparkles className="impact-sparkle" size={19} />
          </div>
          <div className="floating-seal"><ShieldCheck size={17} /><span>Built on<br /><b>transparency</b></span></div>
          <div className="split-grid landing-split">
            <span><BadgeIndianRupee /> Prize pool <b>70%</b></span>
            <span><HeartHandshake /> Charity <b>10%+</b></span>
            <span><ShieldCheck /> Platform <b>balance</b></span>
          </div>
        </div>
      </section>

      <section className="band landing-how" id="how-it-works">
        <div className="section-head">
          <p className="eyebrow">Your path to play</p>
          <h2>Three simple steps.<br /><span className="muted">One meaningful impact.</span></h2>
          <p className="muted">A clear, transparent journey from your first score to every draw.</p>
        </div>
        <div className="steps">
          {[
            ["Subscribe", "Choose a monthly or yearly plan and set how much supports your charity."],
            ["Enter scores", "Keep five score numbers from 1 to 45. Your latest five are draw entries."],
            ["Draw and verify", "Published draws create winner records, proof upload, approval and payout tracking."],
          ].map(([title, text], i) => <article key={title} className="step landing-step"><span>{String(i + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p><ArrowRight size={19} className="step-arrow" /></article>)}
        </div>
      </section>   

      <section className="band light landing-impact">
        <div className="section-head row">
          <div><p className="eyebrow">Play with purpose</p><h2>Good things happen<br />when we play together.</h2><p className="muted">Back a cause that matters to you. Your subscription helps support the charity you choose.</p></div>
          <Link className="secondary-button" to="/charities">Meet our charities <ArrowRight size={16} /></Link>
        </div>
        <div className="card-grid">
          {charities.slice(0, 3).map((charity) => (
            <article className="charity-card" key={charity.id}>
              {charity.imageUrl && <img src={charity.imageUrl} alt="" />}
              <div><span className="pill">{charity.category}</span><h3>{charity.name}</h3><p>{charity.shortDescription || charity.description || "A verified cause in the Digital Heroes pool."}</p></div>
            </article>
          ))}
          {!charities.length && (
            <article className="home-impact-placeholder span-3">
              <img src="https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1500&q=85" alt="Hands holding a small green plant, representing community support" loading="lazy" />
              <div className="home-impact-overlay"><span className="pill"><HeartHandshake size={15} /> Community impact</span><h3>Small acts can grow into lasting change.</h3><p>Choose a cause close to your heart and make every month count.</p><Link className="primary-button" to="/charities">Explore causes <ArrowRight size={17} /></Link></div>
            </article>
          )}
        </div>
      </section>

      <section className="band">
        <div className="section-head">
          <p className="eyebrow">Prize tiers</p>
          <h2>Three chances to win every published draw.</h2>
        </div>
        <div className="tiers">
          <article><Medal /><h3>5 matches</h3><p>Jackpot tier, with rollover when no one hits all five.</p></article>
          <article><Medal /><h3>4 matches</h3><p>Shared middle tier for strong monthly entries.</p></article>
          <article><Medal /><h3>3 matches</h3><p>Entry tier that keeps more players in the story.</p></article>
        </div>
      </section>

      <section className="landing-cta">
        <div><p className="eyebrow">Ready when you are</p><h2>Your next score could do more than you think.</h2></div>
        <Link className="primary-button" to="/signup">Get started <ArrowRight size={18} /></Link>
      </section>
    </main>
  );
}
