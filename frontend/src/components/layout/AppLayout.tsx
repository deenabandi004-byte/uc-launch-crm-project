import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useFirebaseAuth } from "../../contexts/FirebaseAuthContext";
import {
  LayoutDashboard, Target, Users, Mail, Send, GitBranch,
  LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/leads", icon: Target, label: "Leads" },
  { to: "/contacts", icon: Users, label: "Contacts" },
  { to: "/templates", icon: Mail, label: "Templates" },
  { to: "/campaigns", icon: Send, label: "Campaigns" },
  { to: "/pipeline", icon: GitBranch, label: "Pipeline" },
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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight">OutboundCRM</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto rounded p-1 hover:bg-white/10"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground"
                }`
              }
            >
              <Icon size={18} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          {!collapsed && user && (
            <div className="mb-2 truncate text-xs text-sidebar-foreground/60">
              {user.email}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground"
          >
            <LogOut size={16} />
            {!collapsed && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
