import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { Activity } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(loc.state?.from || "/dashboard");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center grid-bg px-4">
      <div className="w-full max-w-md surface p-8 rounded-sm">
        <Link to="/" className="flex items-center gap-2 font-display font-black text-lg mb-8" data-testid="logo-link">
          <Activity size={20} className="text-[var(--accent)]" />
          QUANT<span className="text-[var(--accent)]">.</span>AI
        </Link>
        <h1 className="font-display font-black text-2xl mb-2 tracking-tight">Sign in</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">Access your dashboard and watchlist.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">Email</label>
            <input
              data-testid="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-sm px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">Password</label>
            <input
              data-testid="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-sm px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          {error && (
            <div className="text-xs font-mono text-[var(--bear)] border border-[var(--bear)]/40 bg-[var(--bear)]/5 px-3 py-2 rounded-sm" data-testid="login-error">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full bg-[var(--accent)] hover:bg-blue-500 text-white py-2.5 text-sm font-mono uppercase tracking-wider rounded-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs font-mono text-[var(--text-muted)]">
          No account?{" "}
          <Link to="/register" className="text-[var(--accent)] hover:underline" data-testid="register-link">Create one</Link>
        </div>
      </div>
    </div>
  );
}
