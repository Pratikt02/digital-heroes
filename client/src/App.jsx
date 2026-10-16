import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, HeartHandshake, Home as HomeIcon, LayoutDashboard, LogOut, Menu, Moon, Sun, UserCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "./state/AuthContext.jsx";
import { useToast } from "./state/ToastContext.jsx";
import Home from "./pages/Home.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Admin from "./pages/Admin.jsx";
import Results from "./pages/Results.jsx";
import Charities from "./pages/Charities.jsx";

function RequireAuth({ children, admin = false }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="page narrow"><div className="loading-card">Loading your session...</div></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function Header({ theme, onToggleTheme }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  function goBack() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/", { replace: true });
  }

  async function handleLogout() {
    await logout();
    showToast("Signed out");
    navigate("/");
  }

  const links = (
    <>
      <NavLink to="/charities" onClick={() => setOpen(false)}>Charities</NavLink>
      <NavLink to="/results" onClick={() => setOpen(false)}>Results</NavLink>
      {user && <NavLink to="/dashboard" onClick={() => setOpen(false)}>My Dashboard</NavLink>}
      {user?.role === "admin" && <NavLink to="/admin" onClick={() => setOpen(false)}>Admin</NavLink>}
    </>
  );

  return (
    <header className="site-header">
      <div className="header-leading">
        {!isHome && <button type="button" className="icon-button navigation-button" onClick={goBack} aria-label="Go back" title="Go back"><ArrowLeft size={18} /></button>}
      <NavLink to="/" className="brand" aria-label="Digital Heroes home">
        <span className="brand-mark"><HeartHandshake size={22} /></span>
        <span>Digital Heroes</span>
      </NavLink>
      </div>
      <nav className="desktop-nav">{links}</nav>
      <div className="header-actions">
        {!isHome && <NavLink to="/" className="home-button" aria-label="Go to home"><HomeIcon size={17} /><span>Home</span></NavLink>}
        <button type="button" className="icon-button theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
        {user ? (
          <button type="button" className="ghost-button" onClick={handleLogout}><LogOut size={17} /> Logout</button>
        ) : (
          <NavLink className="primary-button small" to="/login"><UserCircle size={17} /> Sign in</NavLink>
        )}
        <button type="button" className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
      </div>
      {open && (
        <div className="mobile-panel">
          <button type="button" className="icon-button close-button" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
          <button type="button" className="ghost-button theme-menu-toggle" onClick={onToggleTheme}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />} Switch to {theme === "dark" ? "light" : "dark"} theme</button>
          {links}
          {user ? <button type="button" className="ghost-button" onClick={handleLogout}><LogOut size={17} /> Logout</button> : <NavLink to="/login" onClick={() => setOpen(false)}>Sign in</NavLink>}
        </div>
      )}
    </header>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("digital-heroes-theme") === "dark" ? "dark" : "light"; }
    catch { return "light"; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("digital-heroes-theme", theme); } catch { /* Storage may be unavailable in private browsing. */ }
  }, [theme]);

  return (
    <>
      <Header theme={theme} onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/charities" element={<Charities />} />
        <Route path="/results" element={<Results />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth admin><Admin /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-intro">
            <NavLink to="/" className="footer-brand"><span className="brand-mark"><HeartHandshake size={20} /></span><span>Digital Heroes</span></NavLink>
            <p>A skill-based monthly draw where participation supports a charity you choose.</p>
          </div>
          <nav className="footer-column" aria-label="Explore">
            <h2>Explore</h2>
            <NavLink to="/charities">Charities</NavLink>
            <NavLink to="/results">Draw results</NavLink>
          </nav>
          <nav className="footer-column" aria-label="Your account">
            <h2>Your account</h2>
            <NavLink to="/signup">Create account</NavLink>
            <NavLink to="/login">Sign in</NavLink>
          </nav>
          <div className="footer-note">
            <span className="footer-note-icon"><HeartHandshake size={18} /></span>
            <div><b>Play with purpose</b><p>Choose a cause that matters to you and follow each published draw.</p></div>
          </div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Digital Heroes</span><span>Charity-first skill draws</span></div>
      </footer>
    </>
  );
}

export default App;
