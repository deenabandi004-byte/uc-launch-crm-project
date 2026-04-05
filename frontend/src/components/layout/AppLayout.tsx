import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useFirebaseAuth } from "../../contexts/FirebaseAuthContext";
import {
  LayoutDashboard, Users, Send, GitBranch,
  LogOut, ChevronDown, ChevronUp, Zap, ExternalLink,
  PanelLeft, CheckSquare, FileText, Sparkles, CalendarDays, BarChart3,
} from "lucide-react";
import { useState } from "react";
import logoImg from "../../assets/logo-circle.png";

const SERIF = "'Libre Baskerville', Georgia, serif";

const ACTIVE_BG = "rgba(124,58,237,.18)";
const ACTIVE_COLOR = "#C4B5FD";
const INACTIVE_ICON = "rgba(140,170,210,.55)";
const INACTIVE_LABEL = "rgba(255,255,255,.40)";
const HOVER_BG = "rgba(255,255,255,.06)";
const HOVER_LABEL = "rgba(255,255,255,.70)";
const SIDEBAR_BG = "#1E1B2E";
const BORDER = "1px solid rgba(255,255,255,.06)";

const mainNavItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const credits = 847;
  const maxCredits = 1000;
  const creditPct = Math.min((credits / maxCredits) * 100, 100);

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin");
  };

  const navLink = (item: typeof mainNavItems[0]) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === "/dashboard"}
        style={({ isActive }) => ({
          display: "flex",
          alignItems: "center",
          gap: collapsed ? 0 : 11,
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? "10px" : "10px 10px",
          borderRadius: 6,
          fontSize: 13.5,
          fontWeight: isActive ? 500 : 400,
          fontFamily: "'Inter', sans-serif",
          background: isActive ? ACTIVE_BG : "transparent",
          color: isActive ? ACTIVE_COLOR : INACTIVE_LABEL,
          textDecoration: "none",
          transition: "all .12s",
        })}
        onMouseEnter={(e) => {
          if (!e.currentTarget.getAttribute("aria-current")) {
            e.currentTarget.style.background = HOVER_BG;
            e.currentTarget.style.color = HOVER_LABEL;
          }
        }}
        onMouseLeave={(e) => {
          if (!e.currentTarget.getAttribute("aria-current")) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = INACTIVE_LABEL;
          }
        }}
      >
        {({ isActive }) => (
          <>
            <Icon size={16} style={{ color: isActive ? ACTIVE_COLOR : INACTIVE_ICON, flexShrink: 0 }} />
            {!collapsed && <span>{item.label}</span>}
          </>
        )}
      </NavLink>
    );
  };

  // Dropdown item style (matches sidebar look)
  const dropdownItem = (style?: React.CSSProperties): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 400,
    fontFamily: "'Inter', sans-serif",
    color: "rgba(255,255,255,.55)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    width: "100%",
    textAlign: "left" as const,
    textDecoration: "none",
    transition: "all .12s",
    ...style,
  });

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        display: "flex",
        flexDirection: "column",
        width: collapsed ? 64 : 240,
        background: SIDEBAR_BG,
        borderRight: "0.5px solid rgba(255,255,255,.06)",
        transition: "width .2s ease",
        flexShrink: 0,
        overflow: "hidden",
      }}>

        {/* ── TOP: Logo + Brand ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "16px 0" : "16px 16px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: BORDER,
          flexShrink: 0,
        }}>
          <img src={logoImg} alt="Outbound" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
          {!collapsed && (
            <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 16, color: "#fff", letterSpacing: "-0.02em" }}>
              Outbound
            </span>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", transition: "all .12s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = HOVER_BG; e.currentTarget.style.color = "rgba(255,255,255,.7)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,.4)"; }}
            >
              <PanelLeft size={15} />
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              style={{ position: "absolute", background: "none", border: "none", cursor: "pointer", opacity: 0 }}
            />
          )}
        </div>

        {/* Collapsed: click logo to expand */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{ position: "absolute", top: 0, left: 0, width: 64, height: 56, background: "transparent", border: "none", cursor: "pointer" }}
          />
        )}

        {/* ── NAVIGATION ── */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 8px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {mainNavItems.map((item) => navLink(item))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Utility nav */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 8, borderTop: BORDER }}>
            <NavLink
              to="/"
              style={{
                display: "flex", alignItems: "center", gap: collapsed ? 0 : 11,
                justifyContent: collapsed ? "center" : "flex-start",
                padding: "10px", borderRadius: 6, fontSize: 13.5, fontWeight: 400,
                fontFamily: "'Inter', sans-serif", color: INACTIVE_LABEL,
                textDecoration: "none", transition: "all .12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = HOVER_BG; e.currentTarget.style.color = HOVER_LABEL; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = INACTIVE_LABEL; }}
            >
              <ExternalLink size={16} style={{ color: INACTIVE_ICON, flexShrink: 0 }} />
              {!collapsed && <span>Back to Website</span>}
            </NavLink>
          </div>
        </nav>

        {/* ── BOTTOM: Credits + User Profile ── */}
        <div style={{ flexShrink: 0, borderTop: BORDER }}>

          {/* Credits */}
          <div style={{ padding: collapsed ? "12px 8px" : "14px 14px 10px" }}>
            {!collapsed ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>Credits</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.6)" }}>{credits}/{maxCredits}</span>
                </div>
                <div style={{ height: 3, borderRadius: 100, background: "rgba(124,58,237,0.12)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 100, width: `${creditPct}%`, background: "#7C3AED", transition: "width .3s" }} />
                </div>
                <button
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", marginTop: 10, background: "#7C3AED", color: "#fff", borderRadius: 3, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "'Inter', sans-serif", transition: "background .12s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#5B21B6"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#7C3AED"; }}
                >
                  <Zap size={14} style={{ color: "#FACC15", fill: "#FACC15" }} /> Upgrade
                </button>
              </>
            ) : (
              <button
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, background: "#7C3AED", color: "#fff", borderRadius: 3, border: "none", cursor: "pointer", transition: "background .12s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#5B21B6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#7C3AED"; }}
              >
                <Zap size={16} style={{ color: "#FACC15", fill: "#FACC15" }} />
              </button>
            )}
          </div>

          {/* User Profile */}
          <div style={{ padding: collapsed ? "8px" : "8px 10px 14px", borderTop: BORDER, position: "relative" }}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: collapsed ? "8px 0" : "8px 6px", borderRadius: 6,
                background: userDropdownOpen ? "rgba(255,255,255,.06)" : "transparent",
                border: "none", cursor: "pointer", justifyContent: collapsed ? "center" : "flex-start",
                transition: "background .12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}
              onMouseLeave={(e) => { if (!userDropdownOpen) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: "rgba(124,58,237,0.15)", color: "#C4B5FD",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 600,
              }}>
                {userInitials}
              </div>
              {!collapsed && (
                <>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>
                      {user?.name || "User"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>
                      {user?.email || ""}
                    </div>
                  </div>
                  {userDropdownOpen
                    ? <ChevronUp size={13} style={{ color: "rgba(255,255,255,.35)", flexShrink: 0 }} />
                    : <ChevronDown size={13} style={{ color: "rgba(255,255,255,.35)", flexShrink: 0 }} />
                  }
                </>
              )}
            </button>

            {/* Dropdown — dark, matches sidebar */}
            {userDropdownOpen && !collapsed && (
              <div style={{
                position: "absolute", bottom: "100%", left: 8, right: 8, marginBottom: 4,
                background: "#262340", border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 6, padding: "6px 4px",
                boxShadow: "0 -4px 20px rgba(0,0,0,.3)",
              }}>
                <Link
                  to="/"
                  onClick={() => setUserDropdownOpen(false)}
                  style={dropdownItem()}
                  onMouseEnter={(e) => { e.currentTarget.style.background = HOVER_BG; e.currentTarget.style.color = HOVER_LABEL; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,.55)"; }}
                >
                  <ExternalLink size={14} /> Back to Website
                </Link>
                <div style={{ margin: "4px 6px", borderTop: "1px solid rgba(255,255,255,.06)" }} />
                <button
                  onClick={() => { setUserDropdownOpen(false); handleSignOut(); }}
                  style={dropdownItem({ color: "rgba(239,68,68,.7)" })}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,.08)"; e.currentTarget.style.color = "#EF4444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(239,68,68,.7)"; }}
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, overflow: "auto", background: "#FFFFFF" }}>
        <Outlet />
      </main>
    </div>
  );
}
