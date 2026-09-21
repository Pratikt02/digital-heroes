import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { HeartHandshake, LayoutDashboard, LogOut, Menu, ShieldCheck, Trophy, UserCircle, X } from "lucide-react";
import { useState } from "react";
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

function Header() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

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
      <NavLink to="/" className="brand" aria-label="Digital Heroes home">
        <span className="brand-mark"><HeartHandshake size={22} /></span>
        <span>Digital Heroes</span>
      </NavLink>
      <nav className="desktop-nav">{links}</nav>
      <div className="header-actions">
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
          {links}
          {user ? <button type="button" className="ghost-button" onClick={handleLogout}><LogOut size={17} /> Logout</button> : <NavLink to="/login" onClick={() => setOpen(false)}>Sign in</NavLink>}
        </div>
      )}
    </header>
  );
}

function App() {
  return (
    <>
      <Header />
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
        <span><ShieldCheck size={16} /> httpOnly cookies, verified payments, auditable draws</span>
        <span><Trophy size={16} /> Skill scores fund prizes and charity impact</span>
        <span><LayoutDashboard size={16} /> Built for subscribers and admins</span>
      </footer>
    </>
  );
}

export default App;
