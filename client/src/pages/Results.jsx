import { ArrowDownRight, ArrowRight, CalendarDays, CheckCircle2, Hash, Sparkles, Trophy, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { api, money } from "../lib/api";
import { useAsyncData } from "../hooks/useAsyncData";

export default function Results() {
  const { data, loading, error } = useAsyncData(() => api("/api/draws"), []);
  const draws = data?.draws || [];
  const latest = draws[0];
  const monthName = (month) => new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00`));
  return (
    <main className="results-page">
      <section className="results-hero">
        <div><p className="eyebrow"><CheckCircle2 size={15} /> Published & verified</p><h1>Every draw.<br /><em>Out in the open.</em></h1><p>Explore the monthly results, winning numbers, and prize pools. Transparent by design, so everyone can see how the draw played out.</p><div className="results-trust"><span><ShieldCheckIcon /> Public results</span><span><Hash size={15} /> Verifiable numbers</span></div></div>
        <div className="results-hero-graphic" aria-hidden="true"><div className="results-glow" /><div className="results-orbit orbit-back" /><div className="results-orbit orbit-front" /><div className="results-ball ball-a">7</div><div className="results-ball ball-b">18</div><div className="results-ball ball-c">32</div><div className="results-ball ball-d">41</div><div className="results-ball ball-e">5</div><div className="results-trophy"><Trophy size={46} /></div><span className="results-graphic-caption"><Sparkles size={14} /> Results you can trust</span></div>
      </section>

      <section className="results-content">
        <div className="results-heading"><div><p className="eyebrow">Draw archive</p><h2>Published results</h2><p className="muted">{draws.length ? `Showing ${draws.length} recent published draw${draws.length === 1 ? "" : "s"}.` : "Your monthly results will appear here."}</p></div><Link className="secondary-button" to="/charities">Explore the causes <ArrowRight size={16} /></Link></div>
        {loading && <div className="results-loading">{[0, 1, 2].map((item) => <div className="result-skeleton" key={item}><i /><b /><span /></div>)}</div>}
        {error && <div className="error-card">{error}</div>}
        {!loading && !error && !draws.length && <div className="empty-state results-empty"><Trophy size={34} /><h3>The first result is on its way</h3><p>Once a monthly draw is published, you’ll find its winning numbers and prize details here.</p><Link className="primary-button" to="/signup">Join the community <ArrowRight size={17} /></Link></div>}
        {!!draws.length && <div className="results-list">{draws.map((draw, index) => (
          <article className={`draw-result-card ${index === 0 ? "featured-result" : ""}`} key={draw.id}>
            <div className="draw-result-top"><div><span className="draw-month"><CalendarDays size={16} /> {monthName(draw.month)}</span>{index === 0 && <span className="latest-result-tag"><Sparkles size={13} /> Latest result</span>}</div><span className="published-label"><CheckCircle2 size={14} /> Published</span></div>
            <div className="draw-result-main"><div className="draw-total"><small>Total prize pool</small><strong>{money(draw.pool?.total)}</strong></div><div className="draw-winning-numbers"><small>Winning numbers</small><div className="number-row">{draw.numbers?.map((number, numberIndex) => <span key={`${number}-${numberIndex}`}>{number}</span>)}</div></div></div>
            <div className="draw-result-details"><span><UsersRound size={16} /><b>{draw.participants ?? 0}</b> eligible players</span><span><ArrowDownRight size={16} /><b>{money(draw.pool?.rolloverOut)}</b> rollover</span><span><Trophy size={16} /><b>{draw.tiers?.match5?.winners ?? 0}</b> jackpot winners</span></div>
            <div className="draw-tier-list">{[["5 matches", draw.tiers?.match5], ["4 matches", draw.tiers?.match4], ["3 matches", draw.tiers?.match3]].map(([label, tier]) => <div key={label}><span>{label}</span><b>{money(tier?.prizeEach || 0)} <small>each</small></b><small>{tier?.winners ?? 0} {tier?.winners === 1 ? "winner" : "winners"}</small></div>)}</div>
          </article>
        ))}</div>}
        {latest?.publishedAt && <p className="results-footnote"><CheckCircle2 size={15} /> Latest published {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(latest.publishedAt))}. Result data is shown as published.</p>}
      </section>
    </main>
  );
}

function ShieldCheckIcon() {
  return <CheckCircle2 size={15} />;
}
