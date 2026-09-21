import { BadgeIndianRupee, CheckCircle2, HeartHandshake, Plus, RefreshCcw, Upload, X } from "lucide-react";
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

  return (
    <main className="page">
      <div className="section-head row">
        <div><p className="eyebrow">Member dashboard</p><h1>Hello, {user.name}</h1></div>
        <button className="secondary-button" onClick={page.refresh}><RefreshCcw size={17} /> Refresh</button>
      </div>

      <section className="progress-panel">
        <div>
          <p className="eyebrow">Next draw readiness</p>
          <h2>{data?.mine?.eligibleForNext ? "You are ready for the next draw." : "Finish these steps to enter the next draw."}</h2>
        </div>
        <div className="task-strip">
          {nextTasks.map((task) => <span className={task.done ? "done" : ""} key={task.label}><CheckCircle2 size={17} /> {task.label}</span>)}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>Subscription</h2>
          <p className="status-line">{user.isSubscribed ? "Active" : "Inactive"} · {user.subscription?.plan || "no plan"} · ends {dateOnly(user.subscription?.currentPeriodEnd)}</p>
          <div className="plan-row">
            {(data?.plans?.plans || []).map((plan) => <button key={plan.key} className="primary-button" onClick={() => subscribe(plan.key)}><BadgeIndianRupee size={17} /> {plan.label} {money(plan.amountMinor)}</button>)}
          </div>
        </section>

        <section className="panel">
          <h2>Charity choice</h2>
          <form className="form compact" onSubmit={saveCharity}>
            <label><span>Charity</span><select value={choice.charityId} onChange={(e) => setChoice({ ...choice, charityId: e.target.value })}>{(data?.charities?.charities || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label><span>Contribution percent</span><input type="number" min="10" max="90" value={choice.percentage} onChange={(e) => setChoice({ ...choice, percentage: e.target.value })} /></label>
            <button className="secondary-button"><HeartHandshake size={17} /> Save choice</button>
          </form>
        </section>

        <section className="panel">
          <h2>Your five scores</h2>
          <form className="inline-form" onSubmit={saveScore}>
            <input type="number" min="1" max="45" placeholder="1-45" value={score.value} onChange={(e) => setScore({ ...score, value: e.target.value })} required />
            <input type="date" value={score.date} onChange={(e) => setScore({ ...score, date: e.target.value })} required />
            <button className="primary-button"><Plus size={17} /> Add</button>
          </form>
          <div className="chip-list">{(data?.scores?.scores || []).map((s) => <span className="score-chip" key={s.id}>{s.value} <small>{dateOnly(s.date)}</small><button onClick={() => deleteScore(s.id)} aria-label="Delete score"><X size={14} /></button></span>)}</div>
        </section>

        <section className="panel">
          <h2>Draw status</h2>
          <p>{data?.mine?.eligibleForNext ? "You are eligible for the next draw." : "Add five scores and keep an active subscription to enter."}</p>
          <p className="muted">Published draws entered: {data?.mine?.drawsEntered || 0} · Scores stored: {data?.mine?.scoresStored || 0}/{data?.mine?.scoresNeeded || 5}</p>
        </section>

        <section className="panel wide">
          <h2>Winnings</h2>
          <div className="stat-row"><span>Won {money(data?.winnings?.totals?.totalWon)}</span><span>Paid {money(data?.winnings?.totals?.totalPaid)}</span><span>Outstanding {money(data?.winnings?.totals?.totalOutstanding)}</span></div>
          <div className="table-list compact-list">
            {(data?.winnings?.winnings || []).map((win) => (
              <article className="result-row" key={win.id}>
                <div><b>{win.month}</b><p>{win.matchCount} matches · {money(win.prizeAmount)}</p></div>
                <span className="pill">{win.verificationStatus} / {win.paymentStatus}</span>
                <label className="secondary-button file-button"><Upload size={16} /> Upload proof<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadProof(win.id, e.target.files[0])} /></label>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
