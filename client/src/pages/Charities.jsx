import { ArrowRight, HeartHandshake, Leaf, Search, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { useAsyncData } from "../hooks/useAsyncData";

const categoryImages = {
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1000&q=82",
  children: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1000&q=82",
  health: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=82",
  environment: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=82",
  animals: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1000&q=82",
  community: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&w=1000&q=82",
  poverty: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1000&q=82",
  "disaster relief": "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1000&q=82",
  "women empowerment": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=82",
  "arts & culture": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1000&q=82",
};

const defaultCategoryImage = "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1000&q=82";

function charityImage(charity) {
  if (charity.imageUrl) return charity.imageUrl;
  const category = (charity.category || "").toLowerCase().trim();
  return categoryImages[category] || defaultCategoryImage;
}

export default function Charities() {
  const [search, setSearch] = useState("");
  const { data, loading, error, refresh } = useAsyncData(() => api(`/api/charities?limit=24&search=${encodeURIComponent(search)}`), [search]);
  const charities = data?.charities || [];
  const categories = [...new Set(charities.map((charity) => charity.category).filter(Boolean))];
  return (
    <main className="charities-page">
      <section className="charities-hero">
        <div className="charities-hero-copy"><p className="eyebrow"><HeartHandshake size={15} /> Make your play mean more</p><h1>Good things grow<br />when we <em>give together.</em></h1><p>Meet the verified causes making a difference. Pick the mission that matters to you and let every month make an impact.</p><div className="charities-proof"><span><ShieldCheck size={17} /> Verified partners</span><span><Leaf size={17} /> Real community impact</span></div></div>
        <div className="charities-hero-art" aria-hidden="true"><div className="charity-art-ring ring-a" /><div className="charity-art-ring ring-b" /><span className="charity-art-leaf leaf-a">✳</span><span className="charity-art-leaf leaf-b">✿</span><div className="charity-art-center"><HeartHandshake size={64} /><span>Small acts.<br /><b>Lasting change.</b></span></div><div className="charity-art-tag"><Sparkles size={16} /> Choose your cause</div></div>
      </section>

      <section className="charities-discover">
        <div className="charities-list-head"><div><p className="eyebrow">The causes you can back</p><h2>Find your reason to give.</h2><p className="muted">Every charity here is part of the Digital Heroes community.</p></div><label className="search-box charities-search"><Search size={18} /><input aria-label="Search charities" placeholder="Search by name or cause" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>
        {!!categories.length && <div className="charity-category-list"><span className="category-label">Explore causes</span>{categories.map((category) => <span className="category-chip" key={category}>{category}</span>)}</div>}
        {error && <div className="error-card charities-error"><span>{error}</span><button className="secondary-button" onClick={refresh}>Try again</button></div>}
        {loading ? <div className="charities-loading-grid">{[0, 1, 2].map((item) => <div className="charity-skeleton" key={item}><div /><span /><b /><i /></div>)}</div> : charities.length ? (
          <div className="card-grid charities-grid">
            {charities.map((charity, index) => (
              <article className="charity-card charity-discovery-card" key={charity.id}>
                <div className="charity-image-wrap"><img src={charityImage(charity)} alt={`${charity.name} — ${charity.category} charity`} loading={index > 2 ? "lazy" : "eager"} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = defaultCategoryImage; }} /><span className="charity-verified"><ShieldCheck size={14} /> Verified</span></div>
                <div className="charity-card-content"><span className="pill charity-category-pill">{charity.category}</span><h3>{charity.name}</h3><p>{charity.shortDescription || charity.description || "A verified cause making a difference in the community."}</p><div className="charity-card-footer"><span><UsersRound size={15} /> Part of our community</span><span className="charity-arrow" aria-hidden="true"><ArrowRight size={17} /></span></div></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state charities-empty"><HeartHandshake size={34} /><h3>{search ? "No causes found just yet" : "New causes are on their way"}</h3><p>{search ? "Try another name or cause category." : "Check back soon to discover charities you can support."}</p>{search && <button className="secondary-button" onClick={() => setSearch("")}>Clear search</button>}</div>
        )}
        <div className="charities-footer-note"><ShieldCheck size={18} /><p><b>Every cause is reviewed.</b> Your charity choice is managed securely from your member dashboard.</p></div>
      </section>
    </main>
  );
}
