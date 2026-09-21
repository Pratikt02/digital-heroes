import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, HeartHandshake, LockKeyhole, Mail, ShieldCheck, Trophy, UserRound } from "lucide-react";
import { useAuth } from "../state/AuthContext.jsx";
import { useToast } from "../state/ToastContext.jsx";

export default function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const { login, signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await (isSignup ? signup(form) : login({ email: form.email, password: form.password }));
      showToast(isSignup ? "Account created" : "Welcome back");
      navigate("/dashboard");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <aside className="auth-story">
        <p className="eyebrow">{isSignup ? "Start in two minutes" : "Continue your run"}</p>
        <h1>{isSignup ? "Join the monthly draw with a cause already attached." : "Pick up your scores, charity and winnings."}</h1>
        <p className="hero-lede">Digital Heroes keeps the charity choice, payment record, draw entry and winner verification in one clean account.</p>
        <div className="auth-proof-grid">
          <span><HeartHandshake size={18} /> Charity first</span>
          <span><Trophy size={18} /> Five-score entry</span>
          <span><ShieldCheck size={18} /> Secure cookie login</span>
        </div>
      </aside>
      <section className="auth-panel">
        <Link className="back-home" to="/">
          <ArrowLeft size={17} />
          Back to home
        </Link>
        <div>
          <p className="eyebrow">{isSignup ? "Join the pool" : "Welcome back"}</p>
          <h1>{isSignup ? "Create your Digital Heroes account" : "Sign in to Digital Heroes"}</h1>
          <p className="muted">Your subscription, scores, charity choice and winning proof all live behind this account.</p>
        </div>
        {isSignup && (
          <div className="signup-steps" aria-label="Signup steps">
            <span><CheckCircle2 size={16} /> Account</span>
            <span>Charity</span>
            <span>Subscribe</span>
            <span>Scores</span>
          </div>
        )}
        <form className="form" onSubmit={submit}>
          {isSignup && (
            <label><span>Name</span><div className="input-with-icon"><UserRound size={17} /><input required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div></label>
          )}
          <label><span>Email</span><div className="input-with-icon"><Mail size={17} /><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div></label>
          <label><span>Password</span><div className="input-with-icon"><LockKeyhole size={17} /><input required type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div></label>
          <button className="primary-button" disabled={busy}>{busy ? "Please wait..." : isSignup ? "Create account" : "Sign in"}</button>
        </form>
        <p className="muted">{isSignup ? "Already have an account?" : "New here?"} <Link to={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create one"}</Link></p>
      </section>
    </main>
  );
}
