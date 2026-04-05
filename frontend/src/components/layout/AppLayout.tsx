import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useFirebaseAuth } from "../../contexts/FirebaseAuthContext";
import {
  LayoutDashboard, Users, Send, GitBranch,
  LogOut, ChevronLeft, ChevronRight, Settings, CheckSquare, FileText,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/pipeline", icon: GitBranch, label: "Pipeline" },
  { to: "/contacts", icon: Users, label: "Contacts" },
  { to: "/campaigns", icon: Send, label: "Campaigns" },
  { to: "/tasks", icon: CheckSquare, label: "Tasks" },
  { to: "/quotes", icon: FileText, label: "Quotes" },
  { to: "/settings", icon: Settings, label: "Settings" },
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
    <div className="app-shell">
      <aside className={`app-sidebar ${collapsed ? "app-sidebar--collapsed" : ""}`}>
        <div className="app-sidebar-brand">
          {!collapsed && <span className="app-brand-text">Outbound</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="app-collapse-btn">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="app-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `app-nav-link ${isActive ? "app-nav-link--active" : ""}`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          {!collapsed && user && (
            <div className="app-user-email">{user.email}</div>
          )}
          <button onClick={handleSignOut} className="app-nav-link">
            <LogOut size={16} strokeWidth={1.8} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      <style>{`
        .app-shell {
          display: flex;
          height: 100vh;
          background: #faf9fb;
        }

        /* ---- Sidebar ---- */
        .app-sidebar {
          display: flex;
          flex-direction: column;
          width: 220px;
          background: #1e1b4b;
          color: #e0def4;
          transition: width .2s ease;
          flex-shrink: 0;
        }
        .app-sidebar--collapsed { width: 60px; }

        .app-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 56px;
          padding: 0 16px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .app-brand-text {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -.3px;
          color: #fff;
        }
        .app-collapse-btn {
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
        .app-collapse-btn:hover { background: rgba(255,255,255,.1); }

        .app-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 12px 8px;
        }

        .app-nav-link {
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
        .app-nav-link:hover {
          background: rgba(255,255,255,.08);
          color: rgba(255,255,255,.9);
        }
        .app-nav-link--active {
          background: #7c3aed;
          color: #fff;
        }
        .app-nav-link--active:hover {
          background: #6d28d9;
          color: #fff;
        }

        .app-sidebar-footer {
          border-top: 1px solid rgba(255,255,255,.08);
          padding: 12px 8px;
        }
        .app-user-email {
          font-size: 11px;
          color: rgba(255,255,255,.35);
          padding: 0 12px 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ---- Main ---- */
        .app-main {
          flex: 1;
          overflow: auto;
          background: #faf9fb;
        }
      `}</style>
    </div>
  );
}
