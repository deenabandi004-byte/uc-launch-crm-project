import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useFirebaseAuth } from "../../contexts/FirebaseAuthContext";
import {
  LayoutDashboard, Users, Send, GitBranch,
  LogOut, ChevronDown, ChevronUp, Zap, ExternalLink,
  PanelLeft, CheckSquare, FileText, Sparkles, CalendarDays, BarChart3, Target,
} from "lucide-react";
import { useState } from "react";
import logoImg from "../../assets/logo-circle.png";

const NAV_FONT_SIZE = "13.5px";
const NAV_PY = "10px";
const NAV_GAP = "11px";
const NAV_RADIUS = "6px";

const ACTIVE_BG = "rgba(124,58,237,.18)";
const ACTIVE_COLOR = "#C4B5FD";
const INACTIVE_ICON = "rgba(140,170,210,.55)";
const INACTIVE_LABEL = "rgba(255,255,255,.40)";
const HOVER_BG = "rgba(255,255,255,.06)";
const HOVER_LABEL = "rgba(255,255,255,.70)";

const DROPDOWN_ITEM_COLOR = "rgba(255,255,255,.55)";
const DROPDOWN_ITEM_HOVER_BG = "rgba(255,255,255,.06)";
const DROPDOWN_ITEM_HOVER_COLOR = "rgba(255,255,255,.85)";

const mainNavItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/leads", icon: Target, label: "Generate Leads" },
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
  const creditPercentage = Math.min((credits / maxCredits) * 100, 100);

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin");
  };

  const renderNavItem = (item: typeof mainNavItems[0]) => {
    const Icon = item.icon;

    if (collapsed) {
      return (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/dashboard"}
          className="flex items-center justify-center transition-all"
          style={({ isActive: active }) => ({
            padding: NAV_PY,
            background: active ? ACTIVE_BG : "transparent",
            borderRadius: NAV_RADIUS,
          })}
        >
          {({ isActive: active }) => (
            <Icon size={16} style={{ color: active ? ACTIVE_COLOR : INACTIVE_ICON }} />
          )}
        </NavLink>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === "/dashboard"}
        className="flex items-center transition-all"
        style={({ isActive: active }) => ({
          gap: NAV_GAP,
          paddingTop: NAV_PY,
          paddingBottom: NAV_PY,
          paddingLeft: "10px",
          paddingRight: "10px",
          borderRadius: NAV_RADIUS,
          fontSize: NAV_FONT_SIZE,
          fontWeight: active ? 500 : 400,
          fontFamily: "'Inter', sans-serif",
          background: active ? ACTIVE_BG : "transparent",
          color: active ? ACTIVE_COLOR : INACTIVE_LABEL,
        })}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          if (!el.getAttribute("aria-current")) {
            el.style.background = HOVER_BG;
            el.style.color = HOVER_LABEL;
          }
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          if (!el.getAttribute("aria-current")) {
            el.style.background = "transparent";
            el.style.color = INACTIVE_LABEL;
          }
        }}
      >
        {({ isActive: active }) => (
          <>
            <Icon size={16} style={{ color: active ? ACTIVE_COLOR : INACTIVE_ICON, flexShrink: 0 }} />
            <span>{item.label}</span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className="flex flex-col h-full overflow-hidden transition-all duration-200"
        style={{
          width: collapsed ? 64 : 256,
          background: "#1E1B2E",
          borderRight: "0.5px solid rgba(255,255,255,.06)",
        }}
      >
        {/* Logo + Brand */}
        <div style={{ padding: collapsed ? "16px 0" : "16px 12px", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
          {collapsed ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => setCollapsed(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, borderRadius: 6 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <img src={logoImg} alt="Outbound" style={{ width: 28, height: 28, objectFit: "contain" }} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 4 }}>
                <img src={logoImg} alt="Outbound" style={{ width: 28, height: 28, objectFit: "contain" }} />
                <span style={{
                  fontFamily: "'Libre Baskerville', Georgia, serif",
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#fff",
                  letterSpacing: "-0.01em",
                }}>
                  Outbound
                </span>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                style={{
                  color: "rgba(255,255,255,.45)", background: "transparent",
                  border: "none", cursor: "pointer", padding: 6, borderRadius: 6,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.06)"; e.currentTarget.style.color = "rgba(255,255,255,.75)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,.45)"; }}
              >
                <PanelLeft size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 12px 12px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {mainNavItems.map((item) => renderNavItem(item))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Back to website */}
          {!collapsed && (
            <div style={{ paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.06)" }}>
              <Link
                to="/"
                style={{
                  display: "flex", alignItems: "center", gap: NAV_GAP,
                  padding: `${NAV_PY} 10px`, borderRadius: NAV_RADIUS,
                  fontSize: NAV_FONT_SIZE, fontFamily: "'Inter', sans-serif",
                  color: INACTIVE_LABEL, textDecoration: "none",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = HOVER_BG; e.currentTarget.style.color = HOVER_LABEL; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = INACTIVE_LABEL; }}
              >
                <ExternalLink size={16} style={{ color: INACTIVE_ICON, flexShrink: 0 }} />
                <span>Back to Website</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Footer — Credits + Upgrade + User */}
        <div style={{ flexShrink: 0, padding: collapsed ? "12px 8px" : "12px 12px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
          {!collapsed ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Credits */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,.45)", textTransform: "uppercase" }}>
                    Credits
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.7)" }}>
                    {credits} / {maxCredits}
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 100, overflow: "hidden", background: "rgba(124,58,237,0.12)" }}>
                  <div style={{ height: "100%", borderRadius: 100, width: `${creditPercentage}%`, background: "#7C3AED", transition: "width 0.3s" }} />
                </div>
              </div>

              {/* Upgrade button */}
              <button
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "9px 16px", fontSize: 14, fontWeight: 500,
                  background: "#7C3AED", color: "#FFFFFF", borderRadius: 3,
                  border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#5B21B6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#7C3AED"; }}
              >
                <Zap size={16} style={{ color: "#FACC15", fill: "#FACC15" }} />
                <span>Upgrade Plan</span>
              </button>

              {/* User profile */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "8px", borderRadius: NAV_RADIUS,
                    background: userDropdownOpen ? "rgba(255,255,255,.06)" : "transparent",
                    border: "none", cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}
                  onMouseLeave={(e) => { if (!userDropdownOpen) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 500,
                    background: "rgba(124,58,237,0.12)", color: "#7C3AED",
                    boxShadow: "0 0 0 2px rgba(124,58,237,0.20)",
                  }}>
                    {userInitials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <p style={{
                      color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 13,
                      fontWeight: 500, lineHeight: 1.3, margin: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {user?.name || "User"}
                    </p>
                    <p style={{
                      color: "rgba(255,255,255,.35)", fontSize: 11, lineHeight: 1.3,
                      margin: "1px 0 0",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {user?.email || ""}
                    </p>
                  </div>
                  {userDropdownOpen
                    ? <ChevronUp size={14} style={{ color: "rgba(255,255,255,.45)", flexShrink: 0 }} />
                    : <ChevronDown size={14} style={{ color: "rgba(255,255,255,.45)", flexShrink: 0 }} />
                  }
                </button>

                {/* Dropdown — dark theme matching sidebar */}
                {userDropdownOpen && (
                  <div style={{
                    position: "absolute", bottom: "100%", left: 0, right: 0,
                    marginBottom: 4, padding: "4px 0", borderRadius: NAV_RADIUS,
                    background: "#2A2740", border: "1px solid rgba(255,255,255,.08)",
                    boxShadow: "0 8px 24px rgba(0,0,0,.4)",
                  }}>
                    <Link
                      to="/"
                      onClick={() => setUserDropdownOpen(false)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", fontSize: NAV_FONT_SIZE,
                        fontFamily: "'Inter', sans-serif",
                        color: DROPDOWN_ITEM_COLOR, textDecoration: "none",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = DROPDOWN_ITEM_HOVER_BG; e.currentTarget.style.color = DROPDOWN_ITEM_HOVER_COLOR; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = DROPDOWN_ITEM_COLOR; }}
                    >
                      <ExternalLink size={14} />
                      <span>Back to Website</span>
                    </Link>
                    <div style={{ margin: "4px 8px", borderTop: "1px solid rgba(255,255,255,.08)" }} />
                    <button
                      onClick={handleSignOut}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", fontSize: NAV_FONT_SIZE,
                        fontFamily: "'Inter', sans-serif",
                        color: DROPDOWN_ITEM_COLOR, background: "none", border: "none",
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = DROPDOWN_ITEM_HOVER_BG; e.currentTarget.style.color = DROPDOWN_ITEM_HOVER_COLOR; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = DROPDOWN_ITEM_COLOR; }}
                    >
                      <LogOut size={14} />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <button
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 8, background: "#7C3AED", color: "#FFFFFF", borderRadius: 3,
                  border: "none", cursor: "pointer",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#5B21B6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#7C3AED"; }}
              >
                <Zap size={20} style={{ color: "#FACC15", fill: "#FACC15" }} />
              </button>
              {/* Collapsed user avatar */}
              <button
                onClick={() => { setCollapsed(false); setUserDropdownOpen(true); }}
                style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 500,
                  background: "rgba(124,58,237,0.12)", color: "#7C3AED",
                  boxShadow: "0 0 0 2px rgba(124,58,237,0.20)",
                  border: "none", cursor: "pointer",
                }}
              >
                {userInitials}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: "#FFFFFF" }}>
        <Outlet />
      </main>
    </div>
  );
}
