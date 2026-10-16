import { Activity, Check, CircleDollarSign, CreditCard, Eye, HeartHandshake, Play, RefreshCcw, Search, Send, ShieldCheck, Trophy, UsersRound, X } from "lucide-react";
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
  const revenueMonths = page.data?.revenue?.months || [];
  const peakRevenue = Math.max(...revenueMonths.map((month) => month.revenue || 0), 0);
  const formatMoney = (paise) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((paise || 0) / 100);
  const monthLabel = (month) => new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" }).format(new Date(`${month}-01T00:00:00`));

  return (
    <main className="page admin-page">
      <div className="section-head row">
        <div><p className="eyebrow">Control center</p><h1>Good day, admin.</h1><p className="muted">A live overview of your players, payouts, and monthly draws.</p></div>
        <button className="secondary-button" onClick={page.refresh} disabled={page.loading}><RefreshCcw size={17} className={page.loading ? "admin-spin" : ""} /> {page.loading ? "Updating…" : "Refresh data"}</button>
      </div>

      {page.error && <div className="error-card admin-error"><b>Some dashboard data could not be loaded.</b><span>{page.error}</span><button className="secondary-button" onClick={page.refresh}>Try again</button></div>}

      <div className="metrics">
        <article className="admin-metric"><span><CircleDollarSign size={18} /> Total revenue</span><strong>{formatMoney(o?.money?.revenue)}</strong><small>Across {o?.money?.payments ?? 0} recorded payments</small></article>
        <article className="admin-metric"><span><Trophy size={18} /> Prize pool funded</span><strong>{formatMoney(o?.money?.prizePoolContributed)}</strong><small>{formatMoney(o?.money?.totalPrizesAwarded)} awarded in published draws</small></article>
        <article className="admin-metric"><span><HeartHandshake size={18} /> Charity funded</span><strong>{formatMoney(o?.money?.charityContributed)}</strong><small>Contributions from recorded payments</small></article>
        <article className="admin-metric"><span><UsersRound size={18} /> Active subscribers</span><strong>{o?.users?.activeSubscribers ?? 0}</strong><small>Currently inside an active paid period</small></article>
      </div>

      <div className="admin-summary-strip">
        <span><Activity size={17} /><b>{o?.draws?.published ?? 0}</b> published draws</span>
        <span><UsersRound size={17} /><b>{o?.users?.subscribers ?? 0}</b> total subscribers</span>
        <span><ShieldCheck size={17} /><b>{formatMoney(o?.money?.paidOut)}</b> prizes paid out</span>
        <span><CircleDollarSign size={17} /><b>{formatMoney(o?.money?.awaitingPayout)}</b> approved, awaiting payout</span>
      </div>

      <div className="dashboard-grid">
        <section className="panel wide admin-section">
          <div className="admin-section-heading"><div><p className="eyebrow">Monthly operations</p><h2>Draw control</h2></div><span className="admin-count">{page.data?.draws?.draws?.length ?? 0} draws</span></div>
          <form className="inline-form" onSubmit={createDraw}>
            <label className="admin-field"><span>Draw month</span><input type="month" value={drawForm.month} onChange={(e) => setDrawForm({ ...drawForm, month: e.target.value })} /></label>
            <label className="admin-field"><span>Draw mode</span><select value={drawForm.mode} onChange={(e) => setDrawForm({ ...drawForm, mode: e.target.value })}><option value="random">Random</option><option value="algorithmic">Algorithmic</option></select></label>
            {drawForm.mode === "algorithmic" && <label className="admin-field"><span>Number bias</span><select value={drawForm.algorithmBias} onChange={(e) => setDrawForm({ ...drawForm, algorithmBias: e.target.value })}><option value="frequent">Frequent</option><option value="rare">Rare</option></select></label>}
            <button className="primary-button"><Send size={17} /> Create</button>
          </form>
          <p className="admin-hint">Draws must be simulated before they can be published. Publishing is final.</p>
          <div className="table-list compact-list">
            {(page.data?.draws?.draws || []).map((draw) => (
              <article className="result-row" key={draw.id}>
                <div><div className="admin-row-title"><b>{monthLabel(draw.month)}</b><span className={`admin-status ${draw.status}`}>{draw.status}</span></div><p>{draw.mode}{draw.simulationCount ? ` · ${draw.simulationCount} simulation${draw.simulationCount === 1 ? "" : "s"}` : " · not simulated"} · pool {formatMoney(draw.result?.poolTotal)}</p></div>
                <div className="admin-actions">
                  {draw.status !== "published" && <button className="secondary-button" onClick={() => action(`/api/admin/draws/${draw.id}/simulate`, "Simulation updated")}><Play size={16} /> {draw.status === "simulated" ? "Re-simulate" : "Simulate"}</button>}
                  {draw.status === "simulated" && <button className="primary-button" onClick={() => action(`/api/admin/draws/${draw.id}/publish`, "Draw published")}><Check size={16} /> Publish</button>}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel wide admin-section">
          <div className="admin-section-heading"><div><p className="eyebrow">Proof review & payout</p><h2>Winner verification</h2></div><span className="admin-count">{page.data?.winners?.total ?? 0} total</span></div>
          <div className="table-list compact-list">
            {(page.data?.winners?.winners || []).map((winner) => (
              <article className="result-row" key={winner.id}>
                <div><div className="admin-row-title"><b>{winner.user?.name || "Unknown player"}</b><span className={`admin-status ${winner.verificationStatus}`}>{winner.verificationStatus.replaceAll("_", " ")}</span></div><p>{winner.draw?.month || "Unknown draw"} · {winner.matchCount} matches · {formatMoney(winner.prizeAmount)}</p><small className="admin-email">{winner.user?.email}</small></div>
                <span className={`admin-status payment-${winner.paymentStatus}`}>{winner.paymentStatus === "paid" ? "Paid" : "Payment pending"}</span>
                <div className="admin-actions">
                  {winner.proofUrl && (
                    <a href={winner.proofUrl} target="_blank" rel="noreferrer" className="secondary-button" title="View uploaded proof">
                      <Eye size={16} /> View
                    </a>
                  )}
                  {winner.verificationStatus === "pending_review" && <><button className="secondary-button" onClick={() => action(`/api/admin/winners/${winner.id}/approve`, "Winner approved")}><Check size={16} /> Approve</button><button className="secondary-button" onClick={() => action(`/api/admin/winners/${winner.id}/reject`, "Winner rejected", { reason: "Proof needs a clearer payment screenshot." })}><X size={16} /> Reject</button></>}
                  {winner.verificationStatus === "approved" && winner.paymentStatus === "pending" && <button className="primary-button" onClick={() => action(`/api/admin/winners/${winner.id}/mark-paid`, "Marked paid")}><CreditCard size={16} /> Mark paid</button>}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel admin-section">
          <div className="admin-section-heading"><div><p className="eyebrow">Member activity</p><h2>Subscribers</h2></div><span className="admin-count">{page.data?.users?.total ?? 0}</span></div>
          <label className="search-box full"><Search size={17} /><input placeholder="Search users" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} /></label>
          <div className="mini-table">{(page.data?.users?.users || []).map((u) => <div key={u.id}><span>{u.name}<small>{u.email}</small></span><b className={`admin-status ${u.subscription?.status || "none"}`}>{u.subscription?.status || "No plan"}</b></div>)}</div>
        </section>

        <section className="panel admin-section">
          <div className="admin-section-heading"><div><p className="eyebrow">Community impact</p><h2>Charity funding</h2></div><span className="admin-count">{formatMoney(page.data?.charityReport?.grandTotal)}</span></div>
          <div className="mini-table">{(page.data?.charityReport?.charities || []).slice(0, 8).map((c) => <div key={c.charityId}><span>{c.name}<small>{c.subscribers} subscribers · {c.payments} payments</small></span><b>{formatMoney(c.totalContributed)}</b></div>)}</div>
          {!!page.data?.charityReport?.unassignedContributions && <p className="admin-hint">Unassigned contributions: {formatMoney(page.data.charityReport.unassignedContributions)}</p>}
        </section>

        <section className="panel wide admin-section">
          <div className="admin-section-heading"><div><p className="eyebrow">Last 12 months</p><h2>Revenue trend</h2></div><span className="admin-count">Peak {formatMoney(peakRevenue)}</span></div>
          {revenueMonths.length ? <div className="bar-chart admin-chart">
            {revenueMonths.map((m) => <div key={m.month} title={`${monthLabel(m.month)}: ${formatMoney(m.revenue)} · ${m.payments} payments`}><strong>{m.revenue > 0 ? formatMoney(m.revenue) : ""}</strong><span style={{ height: `${peakRevenue ? Math.max(5, (m.revenue / peakRevenue) * 100) : 5}%` }} /><small>{monthLabel(m.month)}</small></div>)}
          </div> : <p className="muted">Revenue history will appear here when report data is available.</p>}
          <div className="admin-chart-legend"><span><i /> Monthly recorded revenue</span><span>{revenueMonths.reduce((sum, item) => sum + (item.payments || 0), 0)} payments in this period</span></div>
        </section>
      </div>
    </main>
  );
}
