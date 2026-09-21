import { motion } from "framer-motion";
import { ArrowRight, BadgeIndianRupee, CalendarDays, HeartHandshake, Medal, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
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

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <motion.p className="eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>Charity-first skill draw</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>Digital Heroes</motion.h1>
          <motion.p className="hero-lede" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            Enter five monthly scores, back a verified charity, and compete in transparent monthly draws funded by real subscriptions.
          </motion.p>
          <motion.div className="hero-metrics" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <span><b>{next.month || "Next"}</b> draw month</span>
            <span><b>{next.activeSubscribers || 0}</b> active players</span>
            <span><b>{money(next.rolloverIn || 0)}</b> rollover in</span>
          </motion.div>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Link className="primary-button" to="/signup">Start playing <ArrowRight size={18} /></Link>
            <Link className="secondary-button" to="/charities">See charities</Link>
          </motion.div>
        </div>
        <div className="hero-board">
          <div className="draw-card">
            <span className="pill"><CalendarDays size={16} /> Next jackpot</span>
            <strong>{money(next.jackpot || 0)}</strong>
            <p>{next.activeSubscribers || 0} active players so far</p>
            <div className="draw-card-foot">
              <span><UsersRound size={16} /> Live estimate</span>
              <span><Sparkles size={16} /> Published by admin</span>
            </div>
          </div>
          <div className="split-grid">
            <span><BadgeIndianRupee /> Prize pool <b>70%</b></span>
            <span><HeartHandshake /> Charity <b>10%+</b></span>
            <span><ShieldCheck /> Platform <b>balance</b></span>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="section-head">
          <p className="eyebrow">How it works</p>
          <h2>Simple enough for players, auditable enough for admins.</h2>
        </div>
        <div className="steps">
          {[
            ["Subscribe", "Choose a monthly or yearly plan and set how much supports your charity."],
            ["Enter scores", "Keep five score numbers from 1 to 45. Your latest five are draw entries."],
            ["Draw and verify", "Published draws create winner records, proof upload, approval and payout tracking."],
          ].map(([title, text], i) => <article key={title} className="step"><span>{i + 1}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="band light">
        <div className="section-head row">
          <div><p className="eyebrow">Featured impact</p><h2>Charities players are backing</h2></div>
          <Link className="text-link" to="/charities">Browse all</Link>
        </div>
        <div className="card-grid">
          {charities.slice(0, 3).map((charity) => (
            <article className="charity-card" key={charity.id}>
              {charity.imageUrl && <img src={charity.imageUrl} alt="" />}
              <div><span className="pill">{charity.category}</span><h3>{charity.name}</h3><p>{charity.shortDescription || charity.description || "A verified cause in the Digital Heroes pool."}</p></div>
            </article>
          ))}
          {!charities.length && (
            <article className="empty-state span-3">
              <HeartHandshake size={26} />
              <h3>Charity spotlights will appear after seeding.</h3>
              <p>Add charities from the backend seed script or admin API, then refresh this page.</p>
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
    </main>
  );
}
