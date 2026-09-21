import { Check, CreditCard, Play, RefreshCcw, Search, Send, X } from "lucide-react";
import { useState } from "react";
import { api, money } from "../lib/api";
import { useAsyncData } from "../hooks/useAsyncData";
import { useToast } from "../state/ToastContext.jsx";

export default function Admin() {
  const { showToast } = useToast();
  const [userSearch, setUserSearch] = useState("");
  const [drawForm, setDrawForm] = useState({ month: "", mode: "random", algorithmBias: "frequent" });
  const page = useAsyncData(async () => {
    const [overview, revenue, charityReport, draws, winners, users, charities] = await Promise.all([
      api("/api/admin/reports/overview"),
      api("/api/admin/reports/revenue"),
      api("/api/admin/reports/charities"),
      api("/api/admin/draws"),
      api("/api/admin/winners?limit=12"),
      api(`/api/admin/users?limit=12&search=${encodeURIComponent(userSearch)}`),
      api("/api/admin/charities?limit=12"),
    ]);
    return { overview, revenue, charityReport, draws, winners, users, charities };
  }, [userSearch]);

  async function action(path, message, body) {
    try {
      await api(path, { method: "POST", body });
      showToast(message);
      page.refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function createDraw(event) {
    event.preventDefault();
    const body = { mode: drawForm.mode, algorithmBias: drawForm.algorithmBias };
    if (drawForm.month) body.month = drawForm.month;
    await action("/api/admin/draws", "Draw created", body);
  }

  const o = page.data?.overview;

  return (
    <main className="page admin-page">
      <div className="section-head row">
        <div><p className="eyebrow">Admin console</p><h1>Operate draws, winners, users and reports.</h1></div>
        <button className="secondary-button" onClick={page.refresh}><RefreshCcw size={17} /> Refresh</button>
      </div>

      <div className="metrics">
        <article><span>Revenue</span><strong>{money(o?.money?.revenue)}</strong></article>
        <article><span>Prize pool</span><strong>{money(o?.money?.prizePoolContributed)}</strong></article>
        <article><span>Charity</span><strong>{money(o?.money?.charityContributed)}</strong></article>
        <article><span>Active players</span><strong>{o?.users?.activeSubscribers || 0}</strong></article>
      </div>

      <div className="dashboard-grid">
        <section className="panel wide">
          <h2>Draw control</h2>
          <form className="inline-form" onSubmit={createDraw}>
            <input type="month" value={drawForm.month} onChange={(e) => setDrawForm({ ...drawForm, month: e.target.value })} />
            <select value={drawForm.mode} onChange={(e) => setDrawForm({ ...drawForm, mode: e.target.value })}><option value="random">Random</option><option value="algorithmic">Algorithmic</option></select>
            <select value={drawForm.algorithmBias} onChange={(e) => setDrawForm({ ...drawForm, algorithmBias: e.target.value })}><option value="frequent">Frequent bias</option><option value="rare">Rare bias</option></select>
            <button className="primary-button"><Send size={17} /> Create</button>
          </form>
          <div className="table-list compact-list">
            {(page.data?.draws?.draws || []).map((draw) => (
              <article className="result-row" key={draw.id}>
                <div><b>{draw.month}</b><p>{draw.status} · {draw.mode} · {money(draw.result?.poolTotal)}</p></div>
                <div className="admin-actions">
                  <button className="secondary-button" onClick={() => action(`/api/admin/draws/${draw.id}/simulate`, "Simulation updated")}><Play size={16} /> Simulate</button>
                  <button className="primary-button" onClick={() => action(`/api/admin/draws/${draw.id}/publish`, "Draw published")}><Check size={16} /> Publish</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel wide">
          <h2>Winner verification</h2>
          <div className="table-list compact-list">
            {(page.data?.winners?.winners || []).map((winner) => (
              <article className="result-row" key={winner.id}>
                <div><b>{winner.user?.name}</b><p>{winner.draw?.month} · {winner.matchCount} matches · {money(winner.prizeAmount)}</p></div>
                <span className="pill">{winner.verificationStatus} / {winner.paymentStatus}</span>
                <div className="admin-actions">
                  <button className="secondary-button" onClick={() => action(`/api/admin/winners/${winner.id}/approve`, "Winner approved")}><Check size={16} /> Approve</button>
                  <button className="secondary-button" onClick={() => action(`/api/admin/winners/${winner.id}/reject`, "Winner rejected", { reason: "Proof needs a clearer payment screenshot." })}><X size={16} /> Reject</button>
                  <button className="primary-button" onClick={() => action(`/api/admin/winners/${winner.id}/mark-paid`, "Marked paid")}><CreditCard size={16} /> Paid</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Users</h2>
          <label className="search-box full"><Search size={17} /><input placeholder="Search users" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} /></label>
          <div className="mini-table">{(page.data?.users?.users || []).map((u) => <div key={u.id}><span>{u.name}<small>{u.email}</small></span><b>{u.subscription?.status}</b></div>)}</div>
        </section>

        <section className="panel">
          <h2>Charity report</h2>
          <div className="mini-table">{(page.data?.charityReport?.charities || []).slice(0, 8).map((c) => <div key={c.charityId}><span>{c.name}<small>{c.subscribers} backers</small></span><b>{money(c.totalContributed)}</b></div>)}</div>
        </section>

        <section className="panel wide">
          <h2>Revenue trend</h2>
          <div className="bar-chart">
            {(page.data?.revenue?.months || []).map((m) => <div key={m.month} title={`${m.month}: ${money(m.revenue)}`}><span style={{ height: `${Math.max(8, Math.min(100, (m.revenue || 0) / 1000))}%` }} /><small>{m.month.slice(5)}</small></div>)}
          </div>
        </section>
      </div>
    </main>
  );
}
