import { ArrowRight, BadgeIndianRupee, CheckCircle2, CircleDollarSign, HeartHandshake, Plus, RefreshCcw, ShieldCheck, Sparkles, Trophy, Upload, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { api, dateOnly, money } from "../lib/api";
import { useAsyncData } from "../hooks/useAsyncData";
import { useAuth } from "../state/AuthContext.jsx";
import { useToast } from "../state/ToastContext.jsx";

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Razorpay checkout could not load"));
    document.body.appendChild(s);
  });
}

export default function Dashboard() {
  const { user, refresh: refreshUser } = useAuth();
  const { showToast } = useToast();
  const [score, setScore] = useState({ value: "", date: new Date().toISOString().slice(0, 10) });
  const [choice, setChoice] = useState({ charityId: user.charityId || "", percentage: user.charityPercentage || 10 });
  const page = useAsyncData(async () => {
    const [plans, sub, scores, charities, mine, winnings] = await Promise.all([
      api("/api/subscription/plans"),
      api("/api/subscription"),
      api("/api/scores").catch(() => ({ scores: [], max: 5 })),
      api("/api/charities?limit=50"),
      api("/api/draws/me").catch(() => null),
      api("/api/winners/me").catch(() => ({ winnings: [], totalWon: 0, totalPaid: 0, outstanding: 0 })),
    ]);
    return { plans, sub, scores, charities, mine, winnings };
  }, []);

  async function subscribe(plan) {
    try {
      await loadRazorpay();
      const checkout = await api("/api/subscription/checkout", { method: "POST", body: { plan } });
      const options = {
        key: checkout.keyId,
        subscription_id: checkout.subscriptionId,
        name: "Digital Heroes",
        description: `${plan} subscription`,
        handler: async (response) => {
          await api("/api/subscription/verify", { method: "POST", body: response });
          await refreshUser();
          page.refresh();
          showToast("Subscription activated");
        },
        theme: { color: "#0e4a5f" },
      };
      new window.Razorpay(options).open();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function saveScore(event) {
    event.preventDefault();
    try {
      await api("/api/scores", { method: "POST", body: { value: Number(score.value), date: score.date } });
      setScore({ value: "", date: new Date().toISOString().slice(0, 10) });
      page.refresh();
      showToast("Score added");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function deleteScore(id) {
    await api(`/api/scores/${id}`, { method: "DELETE" });
    page.refresh();
    showToast("Score deleted");
  }

  async function saveCharity(event) {
    event.preventDefault();
    try {
      await api("/api/users/me/charity", { method: "PUT", body: { charityId: choice.charityId, percentage: Number(choice.percentage) } });
      await refreshUser();
      showToast("Charity choice saved");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function uploadProof(winningId, file) {
    if (!file) return;
    const body = new FormData();
    body.append("proof", file);
    try {
      await api(`/api/winners/${winningId}/proof`, { method: "POST", body });
      page.refresh();
      showToast("Proof uploaded");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  const data = page.data;
  const scoreCount = data?.scores?.scores?.length || 0;
  const nextTasks = [
    { label: "Choose charity", done: Boolean(user.charityId || choice.charityId) },
    { label: "Activate plan", done: Boolean(user.isSubscribed) },
    { label: "Store 5 scores", done: scoreCount >= 5 },
  ];
  const scoreTarget = data?.mine?.scoresNeeded || 5;
  const scoreProgress = Math.min(100, (scoreCount / scoreTarget) * 100);

  return (
    <main className="page member-dashboard">
      <div className="section-head row dashboard-heading">
        <div><p className="eyebrow">Your member space</p><h1>Welcome back, {user.name.split(" ")[0]}.</h1><p className="muted">Your scores, impact, and draw activity at a glance.</p></div>
        <button className="secondary-button" onClick={page.refresh} disabled={page.loading}><RefreshCcw size={17} className={page.loading ? "admin-spin" : ""} /> {page.loading ? "Updating…" : "Refresh"}</button>
      </div>

      {page.error && <div className="error-card dashboard-error">{page.error}<button className="secondary-button" onClick={page.refresh}>Try again</button></div>}

      <section className={`progress-panel dashboard-readiness ${data?.mine?.eligibleForNext ? "ready" : "incomplete"}`}>
        <div className="readiness-copy"><span className="readiness-icon">{data?.mine?.eligibleForNext ? <CheckCircle2 size={24} /> : <Sparkles size={24} />}</span><div><p className="eyebrow">Next draw readiness</p><h2>{data?.mine?.eligibleForNext ? "You’re ready to enter." : "You’re getting closer."}</h2><p>{data?.mine?.eligibleForNext ? "Your membership and scores are ready for the next draw." : "Complete your checklist to become eligible for the next draw."}</p></div></div>
        <div className="readiness-tasks">{nextTasks.map((task) => <span className={task.done ? "done" : ""} key={task.label}><CheckCircle2 size={16} /> {task.label}</span>)}</div>
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-card subscription-card">
          <div className="dashboard-card-heading"><span className="dashboard-icon"><BadgeIndianRupee size={19} /></span><span className={`dashboard-status ${user.isSubscribed ? "positive" : "neutral"}`}>{user.isSubscribed ? "Active" : "Inactive"}</span></div>
          <div className="subscription-art" role="img" aria-label="Digital Heroes membership brings players together for monthly draws and charity impact"><div className="subscription-art-glow" /><div className="subscription-art-ring" /><span className="subscription-art-star star-one"><Sparkles size={16} /></span><span className="subscription-art-star star-two"><Sparkles size={12} /></span><div className="subscription-art-medal"><Trophy size={34} /></div><div className="subscription-art-caption"><span>MEMBERSHIP</span><b>Play with purpose</b></div><span className="subscription-art-leaf"><HeartHandshake size={20} /></span></div>
          <p className="eyebrow">Membership</p><h2>Subscription</h2>
          <p className="dashboard-card-description">{user.isSubscribed ? `${user.subscription?.plan || "Plan"} plan · renews or ends ${dateOnly(user.subscription?.currentPeriodEnd)}` : "Choose a plan to unlock your place in the monthly draw."}</p>
          <div className="plan-row dashboard-plan-row">
            {(data?.plans?.plans || []).map((plan) => <button key={plan.key} className="primary-button" onClick={() => subscribe(plan.key)}><BadgeIndianRupee size={17} /> {plan.label} {money(plan.amountMinor)}</button>)}
          </div>
        </section>

        <section className="panel dashboard-card charity-choice-card">
          <div className="dashboard-card-heading"><span className="dashboard-icon impact"><HeartHandshake size={19} /></span><span className="dashboard-status positive">Your impact</span></div>
          <p className="eyebrow">Give back</p><h2>Charity choice</h2>
          <p className="dashboard-card-description">Choose the cause your subscription supports.</p>
          <form className="form compact dashboard-form" onSubmit={saveCharity}>
            <label><span>Charity</span><select value={choice.charityId} onChange={(e) => setChoice({ ...choice, charityId: e.target.value })}>{(data?.charities?.charities || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label><span>Contribution percent</span><input type="number" min="10" max="90" value={choice.percentage} onChange={(e) => setChoice({ ...choice, percentage: e.target.value })} /></label>
            <button className="secondary-button"><HeartHandshake size={17} /> Save choice</button>
          </form>
        </section>

        <section className="panel dashboard-card scores-card">
          <div className="dashboard-card-heading"><span className="dashboard-icon score"><Trophy size={19} /></span><span className="dashboard-count">{scoreCount} / {scoreTarget}</span></div>
          <p className="eyebrow">Your draw entry</p><h2>Your five scores</h2>
          <div className="score-progress-track"><span style={{ width: `${scoreProgress}%` }} /></div>
          <p className="dashboard-card-description">{scoreCount >= scoreTarget ? "Your score list is complete." : `${scoreTarget - scoreCount} more ${scoreTarget - scoreCount === 1 ? "score" : "scores"} to complete your entry.`}</p>
          <form className="inline-form dashboard-score-form" onSubmit={saveScore}>
            <input type="number" min="1" max="45" placeholder="1-45" value={score.value} onChange={(e) => setScore({ ...score, value: e.target.value })} required />
            <input type="date" value={score.date} onChange={(e) => setScore({ ...score, date: e.target.value })} required />
            <button className="primary-button"><Plus size={17} /> Add</button>
          </form>
          <div className="chip-list dashboard-score-list">{(data?.scores?.scores || []).map((s) => <span className="score-chip" key={s.id}><b>{s.value}</b><small>{dateOnly(s.date)}</small><button onClick={() => deleteScore(s.id)} aria-label={`Delete score ${s.value}`}><X size={14} /></button></span>)}{Array.from({ length: Math.max(0, scoreTarget - scoreCount) }, (_, index) => <span className="score-slot" key={`empty-${index}`}>+</span>)}</div>
        </section>

        <section className="panel dashboard-card draw-activity-card">
          <div className="dashboard-card-heading"><span className="dashboard-icon draw"><UsersRound size={19} /></span><span className="dashboard-status">Draw activity</span></div>
          <p className="eyebrow">Your journey</p><h2>Draw status</h2>
          <div className="activity-stat"><strong>{data?.mine?.drawsEntered ?? 0}</strong><span>published draws entered</span></div>
          <p className="dashboard-card-description">{data?.mine?.eligibleForNext ? "You’re set for the next draw." : "Keep your subscription active and add your scores to enter."}</p>
          <div className="activity-meta"><span><CheckCircle2 size={15} /> Scores stored</span><b>{data?.mine?.scoresStored ?? scoreCount}/{scoreTarget}</b></div>
        </section>

        <section className="panel wide dashboard-card winnings-card">
          <div className="dashboard-card-heading"><div><p className="eyebrow">Your rewards</p><h2>Winnings</h2></div><span className="dashboard-icon reward"><Trophy size={20} /></span></div>
          <div className="winnings-summary"><div><span><CircleDollarSign size={16} /> Total won</span><b>{money(data?.winnings?.totals?.totalWon)}</b></div><div><span><CheckCircle2 size={16} /> Paid</span><b>{money(data?.winnings?.totals?.totalPaid)}</b></div><div><span><ShieldCheck size={16} /> Outstanding</span><b>{money(data?.winnings?.totals?.totalOutstanding)}</b></div></div>
          <div className="table-list compact-list">
            {(data?.winnings?.winnings || []).map((win) => (
              <article className="result-row" key={win.id}>
                <div><b>{win.month}</b><p>{win.matchCount} matches · {money(win.prizeAmount)}</p></div>
                <span className={`dashboard-status ${win.paymentStatus === "paid" ? "positive" : "neutral"}`}>{win.verificationStatus.replaceAll("_", " ")} · {win.paymentStatus}</span>
                {win.paymentStatus !== "paid" && win.verificationStatus !== "approved" && <label className="secondary-button file-button"><Upload size={16} /> Upload proof<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadProof(win.id, e.target.files[0])} /></label>}
              </article>
            ))}
            {!data?.winnings?.winnings?.length && <div className="dashboard-empty"><Trophy size={22} /><span>Winnings from published draws will show up here.</span><ArrowRight size={17} /></div>}
          </div>
        </section>
      </div>
    </main>
  );
}
