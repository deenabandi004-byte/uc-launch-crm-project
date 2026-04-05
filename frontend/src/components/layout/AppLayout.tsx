import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useFirebaseAuth } from "../../contexts/FirebaseAuthContext";
import {
  LayoutDashboard, Target, Users, Send, GitBranch,
  CheckSquare, FileText, Sparkles, LogOut, ChevronLeft, ChevronRight, CalendarDays, BarChart3,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/leads", icon: Target, label: "Leads" },
  { to: "/contacts", icon: Users, label: "Contacts" },
  { to: "/outreach", icon: Send, label: "Outreach" },
  { to: "/pipeline", icon: GitBranch, label: "Pipeline" },
  { to: "/calendar", icon: CalendarDays, label: "Calendar" },
  { to: "/tasks", icon: CheckSquare, label: "Tasks" },
  { to: "/quotes", icon: FileText, label: "Quotes" },
  { to: "/replies", icon: Sparkles, label: "Replies" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
];

export function AppLayout() {
  const { user, signOut } = useFirebaseAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin");
  };

  return (
    <div className="ob-shell">
      <aside className={`ob-sidebar ${collapsed ? "ob-sidebar--collapsed" : ""}`}>
        <div className="ob-brand">
          {!collapsed && <span className="ob-brand-text">Outbound</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="ob-collapse-btn">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="ob-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `ob-nav-link ${isActive ? "ob-nav-link--active" : ""}`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="ob-footer">
          {!collapsed && user && (
            <div className="ob-user-email">{user.email}</div>
          )}
          <button onClick={handleSignOut} className="ob-nav-link">
            <LogOut size={16} strokeWidth={1.8} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="ob-main">
        <Outlet />
      </main>

      <style>{`
        .ob-shell {
          display: flex;
          height: 100vh;
          background: #faf9fb;
        }
        .ob-sidebar {
          display: flex;
          flex-direction: column;
          width: 220px;
          background: #1e1b4b;
          color: #e0def4;
          transition: width .2s ease;
          flex-shrink: 0;
        }
        .ob-sidebar--collapsed { width: 60px; }
        .ob-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 56px;
          padding: 0 16px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .ob-brand-text {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -.3px;
          color: #fff;
        }
        .ob-collapse-btn {
          margin-left: auto;
          background: none;
          border: none;
          color: rgba(255,255,255,.5);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ob-collapse-btn:hover { background: rgba(255,255,255,.1); }
        .ob-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 12px 8px;
          overflow-y: auto;
        }
        .ob-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          color: rgba(255,255,255,.6);
          text-decoration: none;
          transition: background .12s, color .12s;
          border: none;
          background: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
        }
        .ob-nav-link:hover {
          background: rgba(255,255,255,.08);
          color: rgba(255,255,255,.9);
        }
        .ob-nav-link--active {
          background: #7c3aed !important;
          color: #fff !important;
        }
        .ob-nav-link--active:hover {
          background: #6d28d9 !important;
        }
        .ob-footer {
          border-top: 1px solid rgba(255,255,255,.08);
          padding: 12px 8px;
        }
        .ob-user-email {
          font-size: 11px;
          color: rgba(255,255,255,.35);
          padding: 0 12px 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ob-main {
          flex: 1;
          overflow: auto;
          background: #faf9fb;
        }
      `}</style>
    </div>
  );
}
