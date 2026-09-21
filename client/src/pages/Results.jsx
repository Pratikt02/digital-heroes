import { CalendarDays, Hash, Trophy } from "lucide-react";
import { api, money } from "../lib/api";
import { useAsyncData } from "../hooks/useAsyncData";

export default function Results() {
  const { data, loading, error } = useAsyncData(() => api("/api/draws"), []);
  const draws = data?.draws || [];
  return (
    <main className="page">
      <div className="section-head">
        <p className="eyebrow">Published draws</p>
        <h1>Transparent monthly results.</h1>
      </div>
      {loading && <div className="loading-card">Loading results...</div>}
      {error && <div className="error-card">{error}</div>}
      <div className="table-list">
        {draws.map((draw) => (
          <article className="result-row" key={draw.id}>
            <div><span className="pill"><CalendarDays size={15} /> {draw.month}</span><h2>{money(draw.pool?.total)}</h2></div>
            <div className="number-row">{draw.numbers?.map((n) => <span key={n}>{n}</span>)}</div>
            <div className="mini-stats"><span><Trophy size={16} /> {draw.participants || 0} players</span><span><Hash size={16} /> rollover {money(draw.pool?.rolloverOut)}</span></div>
          </article>
        ))}
      </div>
    </main>
  );
}
