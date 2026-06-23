import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, LogOut, Star, History as HistoryIcon, LineChart, PieChart } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-mono uppercase tracking-wider transition-colors duration-150 ${
      isActive
        ? "text-white border-b-2 border-[var(--accent)]"
        : "text-[var(--text-muted)] hover:text-white border-b-2 border-transparent"
    }`;

  return (
    <nav
      className="sticky top-0 z-50 bg-[var(--bg)] border-b border-[var(--border)] backdrop-blur"
      data-testid="navbar"
    >
      <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between h-14">
        <Link
          to="/"
          className="flex items-center gap-2 font-display font-black text-lg tracking-tight"
          data-testid="logo-link"
        >
          <Activity size={20} className="text-[var(--accent)]" />
          <span>QUANT<span className="text-[var(--accent)]">.</span>AI</span>
        </Link>

        {user && (
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/dashboard" className={linkClass} data-testid="nav-dashboard">
              <LineChart size={14} className="inline mr-1.5 -mt-0.5" />Analyze
            </NavLink>
            <NavLink to="/watchlist" className={linkClass} data-testid="nav-watchlist">
              <Star size={14} className="inline mr-1.5 -mt-0.5" />Watchlist
            </NavLink>
            <NavLink to="/portfolio" className={linkClass} data-testid="nav-portfolio">
              <PieChart size={14} className="inline mr-1.5 -mt-0.5" />Portfolio
            </NavLink>
            <NavLink to="/history" className={linkClass} data-testid="nav-history">
              <HistoryIcon size={14} className="inline mr-1.5 -mt-0.5" />History
            </NavLink>
          </div>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs font-mono text-[var(--text-muted)] hidden sm:inline" data-testid="user-email">
                {user.email}
              </span>
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider font-mono border border-[var(--border)] hover:border-[var(--bear)] hover:text-[var(--bear)] transition-colors duration-150 rounded-sm"
                data-testid="logout-btn"
              >
                <LogOut size={12} /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs uppercase tracking-wider font-mono text-[var(--text-muted)] hover:text-white transition-colors"
                data-testid="login-link"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 text-xs uppercase tracking-wider font-mono bg-[var(--accent)] hover:bg-blue-500 text-white rounded-sm transition-colors"
                data-testid="register-link"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
