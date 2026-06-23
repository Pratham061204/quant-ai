import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { Activity } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      navigate("/dashboard");
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
        <h1 className="font-display font-black text-2xl mb-2 tracking-tight">Create account</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">Free. Save analyses and build a watchlist.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">Name</label>
            <input
              data-testid="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-sm px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">Email</label>
            <input
              data-testid="register-email"
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
              data-testid="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-sm px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          {error && (
            <div className="text-xs font-mono text-[var(--bear)] border border-[var(--bear)]/40 bg-[var(--bear)]/5 px-3 py-2 rounded-sm" data-testid="register-error">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            data-testid="register-submit"
            className="w-full bg-[var(--accent)] hover:bg-blue-500 text-white py-2.5 text-sm font-mono uppercase tracking-wider rounded-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs font-mono text-[var(--text-muted)]">
          Already have an account?{" "}
          <Link to="/login" className="text-[var(--accent)] hover:underline" data-testid="login-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
