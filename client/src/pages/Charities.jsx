import { Search } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { useAsyncData } from "../hooks/useAsyncData";

export default function Charities() {
  const [search, setSearch] = useState("");
  const { data, loading, error, refresh } = useAsyncData(() => api(`/api/charities?limit=24&search=${encodeURIComponent(search)}`), [search]);
  return (
    <main className="page">
      <div className="section-head row">
        <div><p className="eyebrow">Verified partners</p><h1>Choose the cause your subscription supports.</h1></div>
        <label className="search-box"><Search size={17} /><input placeholder="Search charities" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      </div>
      {error && <button className="secondary-button" onClick={refresh}>{error}. Retry</button>}
      {loading ? <div className="loading-card">Loading charities...</div> : (
        <div className="card-grid">
          {(data?.charities || []).map((charity) => (
            <article className="charity-card tall" key={charity.id}>
              {charity.imageUrl && <img src={charity.imageUrl} alt="" />}
              <div><span className="pill">{charity.category}</span><h2>{charity.name}</h2><p>{charity.shortDescription || charity.description}</p></div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
