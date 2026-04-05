import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard, Search, Wrench, Send,
  LogOut, ChevronDown, ChevronUp, Zap, ExternalLink,
  PanelLeft, Settings, Tag,
} from "lucide-react";
import { useState } from "react";
import logoImg from "../../assets/logo-circle.png";

const NAV_FONT_SIZE = "13.5px";
const NAV_PY = "11px";
const NAV_GAP = "10px";
const NAV_RADIUS = "8px";

const ACTIVE_BG = "rgba(124,58,237,.18)";
const ACTIVE_COLOR = "#C4B5FD";
const INACTIVE_ICON = "rgba(140,170,210,.55)";
const INACTIVE_LABEL = "rgba(255,255,255,.40)";
const HOVER_BG = "rgba(255,255,255,.06)";
const HOVER_LABEL = "rgba(255,255,255,.70)";

const mainNavItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/find-clients", icon: Search, label: "Find Clients" },
  { to: "/job-tracker", icon: Wrench, label: "Job Tracker" },
  { to: "/outreach", icon: Send, label: "Outreach" },
  { to: "/field-ai", icon: Zap, label: "Field AI" },
];

const utilityNavItems = [
  { to: "/", icon: ExternalLink, label: "Back to Website" },
];

export function AppLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const credits = 847;
  const maxCredits = 1000;
  const creditPercentage = Math.min((credits / maxCredits) * 100, 100);

  const handleSignOut = () => {
    navigate("/");
  };

  const renderNavItem = (item: typeof mainNavItems[0], isActive: boolean) => {
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
          if (!el.classList.contains("active")) {
            el.style.background = HOVER_BG;
            el.style.color = HOVER_LABEL;
          }
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          // Check if NavLink is active by looking at aria-current
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
        {/* User profile / toggle */}
        <div className="px-3 pt-3 pb-1 flex-shrink-0">
          {collapsed ? (
            <div className="flex justify-center">
              <button
                onClick={() => setCollapsed(false)}
                className="p-1 rounded-lg transition-colors"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <img src={logoImg} alt="Outbound" style={{ width: 28, height: 28, objectFit: "contain" }} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex-1 flex items-center gap-3 px-2 py-2 rounded-lg transition-all"
                  style={{
                    background: userDropdownOpen ? "rgba(255,255,255,.06)" : "transparent",
                    border: "none", cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}
                  onMouseLeave={(e) => { if (!userDropdownOpen) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Avatar */}
                  <div
                    className="h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{ background: "rgba(124,58,237,0.12)", color: "#7C3AED", boxShadow: "0 0 0 2px rgba(124,58,237,0.20)" }}
                  >
                    MT
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate" style={{ color: "#fff", fontFamily: "'Inter', sans-serif" }}>
                      Mike Torres
                    </p>
                  </div>
                  {userDropdownOpen
                    ? <ChevronUp size={14} style={{ color: "rgba(255,255,255,.45)", flexShrink: 0 }} />
                    : <ChevronDown size={14} style={{ color: "rgba(255,255,255,.45)", flexShrink: 0 }} />
                  }
                </button>

                <button
                  onClick={() => setCollapsed(true)}
                  className="p-2 rounded-lg transition-colors flex-shrink-0"
                  style={{ color: "rgba(255,255,255,.45)", background: "transparent", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.06)"; e.currentTarget.style.color = "rgba(255,255,255,.75)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,.45)"; }}
                >
                  <PanelLeft size={16} />
                </button>
              </div>

              {/* Dropdown */}
              {userDropdownOpen && (
                <div className="mt-1 py-1 rounded-lg shadow-lg" style={{ background: "#fff" }}>
                  <Link
                    to="/"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm transition-colors"
                    style={{ color: "#475569", textDecoration: "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F3FF"; e.currentTarget.style.color = "#0F172A"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; }}
                  >
                    <ExternalLink size={14} />
                    <span>Back to Website</span>
                  </Link>
                  <div style={{ margin: "4px 0", borderTop: "1px solid #E2E8F0" }} />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors"
                    style={{ color: "#475569", background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F3FF"; e.currentTarget.style.color = "#0F172A"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; }}
                  >
                    <LogOut size={14} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-3 flex flex-col">
          <div className="space-y-0.5">
            {mainNavItems.map((item) => renderNavItem(item, false))}
          </div>

          <div className="flex-1" />

          <div className="space-y-0.5">
            {utilityNavItems.map((item) => renderNavItem(item, false))}
          </div>
        </nav>

        {/* Footer — Credits + Upgrade */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: "0.5px solid rgba(255,255,255,.07)" }}>
          {!collapsed ? (
            <div className="space-y-3">
              {/* Credits */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,.45)", textTransform: "uppercase" }}>
                    Credits
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.7)" }}>
                    {credits} / {maxCredits}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(124,58,237,0.12)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${creditPercentage}%`, background: "#7C3AED" }}
                  />
                </div>
              </div>

              {/* Upgrade button */}
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all"
                style={{
                  background: "#7C3AED", color: "#0F172A", borderRadius: 3,
                  border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#5B21B6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#7C3AED"; }}
              >
                <Zap size={16} style={{ color: "#FACC15", fill: "#FACC15" }} />
                <span>Upgrade Plan</span>
              </button>
            </div>
          ) : (
            <button
              className="w-full flex items-center justify-center p-2 transition-all"
              style={{
                background: "#7C3AED", color: "#0F172A", borderRadius: 3,
                border: "none", cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#5B21B6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#7C3AED"; }}
            >
              <Zap size={20} style={{ color: "#FACC15", fill: "#FACC15" }} />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
