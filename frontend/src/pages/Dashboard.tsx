import { useFirebaseAuth } from "../contexts/FirebaseAuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  getLeads, getContacts, getPipeline, getGmailStatus, startGmailOAuth,
  getTasksDueToday, getQuotes, getInvoices, getCampaigns,
} from "../services/api";
import {
  Target, Users, Send, GitBranch, Mail, ExternalLink, ArrowRight,
  DollarSign, CheckSquare, Clock, TrendingUp, AlertCircle, FileText,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";

const PIPELINE_STAGES = [
  { key: "new_lead", label: "New Lead", color: "#7C3AED" },
  { key: "contacted", label: "Contacted", color: "#7C3AED" },
  { key: "interested", label: "Interested", color: "#14B8A6" },
  { key: "estimate_sent", label: "Estimate Sent", color: "#F59E0B" },
  { key: "approved", label: "Approved", color: "#10B981" },
  { key: "in_progress", label: "In Progress", color: "#8B5CF6" },
  { key: "complete", label: "Complete", color: "#06B6D4" },
  { key: "paid", label: "Paid", color: "#22C55E" },
];

const S = {
  page: { maxWidth: 1200, margin: "0 auto", padding: "40px 48px", fontFamily: "'Inter', sans-serif" } as const,
  serif: "'Libre Baskerville', Georgia, serif",
  // Cards
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 3, padding: 24, transition: "box-shadow 0.15s ease, border-color 0.15s ease" } as const,
  cardHover: { borderColor: "#C4B5FD", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" },
  // Stat card
  stat: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 3, padding: "20px 24px", cursor: "pointer", textDecoration: "none", display: "block", transition: "all 0.15s ease" } as const,
  // Section header
  sectionTitle: { fontSize: 15, fontWeight: 600, color: "#0f2545", margin: 0 } as const,
  sectionLink: { fontSize: 13, fontWeight: 500, color: "#7C3AED", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 } as const,
  // Hero
  hero: { background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)", borderRadius: 3, padding: "36px 40px", color: "#fff", marginBottom: 32 } as const,
  // Muted text
  muted: { fontSize: 14, color: "#64748B", margin: 0 } as const,
  mutedSm: { fontSize: 12, color: "#94A3B8" } as const,
};

export default function Dashboard() {
  const { user } = useFirebaseAuth();
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: getContacts });
  const { data: pipeline = {} } = useQuery({ queryKey: ["pipeline"], queryFn: getPipeline });
  const { data: gmailStatus } = useQuery({ queryKey: ["gmail-status"], queryFn: getGmailStatus });
  const { data: tasksDueToday = [] } = useQuery({ queryKey: ["tasks-due-today"], queryFn: getTasksDueToday });
  const { data: quotes = [] } = useQuery({ queryKey: ["quotes"], queryFn: getQuotes });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: getInvoices });
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: getCampaigns });
  const [connectingGmail, setConnectingGmail] = useState(false);

  const pipelineData = pipeline as Record<string, any[]>;
  const pipelineCount = Object.values(pipelineData).flat().length;
  const interestedCount = pipelineData.interested?.length || 0;

  // Revenue calculations
  const totalQuoteValue = quotes.reduce((sum: number, q: any) => sum + (q.total || 0), 0);
  const paidInvoices = invoices.filter((inv: any) => inv.status === "paid");
  const totalRevenue = paidInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
  const pendingInvoices = invoices.filter((inv: any) => inv.status !== "paid");
  const pendingRevenue = pendingInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

  // Tasks
  const openTasks = tasksDueToday.filter((t: any) => t.status !== "completed");
  const overdueTasks = tasksDueToday.filter((t: any) => t.status === "overdue");

  // Pipeline funnel data
  const maxStageCount = Math.max(1, ...PIPELINE_STAGES.map(s => (pipelineData[s.key]?.length || 0)));

  const handleConnectGmail = async () => {
    setConnectingGmail(true);
    try {
      const { authUrl } = await startGmailOAuth();
      window.location.href = authUrl;
    } catch (err: any) {
      toast.error(err.message || "Failed to start Gmail connection");
      setConnectingGmail(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div style={S.page}>

      {/* ── HERO CARD ── */}
      <div style={S.hero}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, opacity: 0.7, marginBottom: 12 }}>
          Dashboard
        </div>
        <h1 style={{ fontFamily: S.serif, fontSize: 28, fontWeight: 400, margin: "0 0 8px", color: "#fff" }}>
          Welcome back, {firstName}
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", margin: "0 0 24px", maxWidth: 500 }}>
          {user?.companyName ? `Here's what's happening at ${user.companyName}.` : "Track your clients, follow up on time, and close more deals."}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          <Link to="/outreach" style={{ background: "#fff", color: "#7C3AED", fontWeight: 600, fontSize: 13, padding: "10px 24px", borderRadius: 3, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}>
            New Campaign <ArrowRight size={14} />
          </Link>
          <Link to="/contacts" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 500, fontSize: 13, padding: "10px 24px", borderRadius: 3, textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            Find Contacts
          </Link>
        </div>
      </div>

      {/* ── GMAIL BANNER ── */}
      {gmailStatus && !gmailStatus.connected && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 3, padding: "14px 20px", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Mail size={18} style={{ color: "#D97706" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>Connect Gmail to send campaigns</div>
              <div style={{ fontSize: 12, color: "#B45309" }}>Required for personalized emails</div>
            </div>
          </div>
          <button
            onClick={handleConnectGmail}
            disabled={connectingGmail}
            style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 3, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: connectingGmail ? 0.5 : 1 }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><ExternalLink size={13} /> Connect</span>
          </button>
        </div>
      )}

      {/* ── KPI STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Revenue", value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, sub: pendingRevenue > 0 ? `$${pendingRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} pending` : "", icon: DollarSign, iconBg: "#ECFDF5", iconColor: "#059669", to: "/quotes" },
          { label: "Active Deals", value: pipelineCount, sub: interestedCount > 0 ? `${interestedCount} interested` : "", icon: TrendingUp, iconBg: "#F5F3FF", iconColor: "#7C3AED", to: "/pipeline" },
          { label: "Tasks Today", value: openTasks.length, sub: overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "", icon: CheckSquare, iconBg: overdueTasks.length > 0 ? "#FEF2F2" : "#F5F3FF", iconColor: overdueTasks.length > 0 ? "#DC2626" : "#7C3AED", to: "/tasks" },
          { label: "Contacts", value: contacts.length, sub: leads.length > 0 ? `${leads.length} companies` : "", icon: Users, iconBg: "#ECFDF5", iconColor: "#059669", to: "/contacts" },
        ].map((kpi) => (
          <Link
            key={kpi.label}
            to={kpi.to}
            style={S.stat}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C4B5FD"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 3, background: kpi.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <kpi.icon size={18} style={{ color: kpi.iconColor }} />
              </div>
              <ArrowRight size={14} style={{ color: "#94A3B8" }} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#0f2545", lineHeight: 1, marginBottom: 4 }}>{kpi.value}</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>{kpi.label}</div>
            {kpi.sub && <div style={{ fontSize: 12, color: kpi.iconColor, marginTop: 4 }}>{kpi.sub}</div>}
          </Link>
        ))}
      </div>

      {/* ── PIPELINE + TASKS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 28 }}>

        {/* Pipeline Overview */}
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={S.sectionTitle}>Pipeline Overview</h2>
            <Link to="/pipeline" style={S.sectionLink}>View Kanban <ChevronRight size={14} /></Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PIPELINE_STAGES.map((stage) => {
              const count = pipelineData[stage.key]?.length || 0;
              const pct = maxStageCount > 0 ? (count / maxStageCount) * 100 : 0;
              return (
                <div key={stage.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 100, fontSize: 13, color: "#64748B", flexShrink: 0 }}>{stage.label}</div>
                  <div style={{ flex: 1, height: 24, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3, background: stage.color,
                      width: `${Math.max(pct, count > 0 ? 8 : 0)}%`,
                      display: "flex", alignItems: "center", paddingLeft: 8, transition: "width 0.5s ease",
                    }}>
                      {count > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{count}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {pipelineCount === 0 && (
            <p style={{ textAlign: "center", fontSize: 13, color: "#94A3B8", marginTop: 16 }}>
              No contacts in pipeline yet. <Link to="/contacts" style={{ color: "#7C3AED", textDecoration: "none" }}>Add contacts</Link> to get started.
            </p>
          )}
        </div>

        {/* Tasks */}
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={S.sectionTitle}>Today's Tasks</h2>
            <Link to="/tasks" style={S.sectionLink}>All Tasks <ChevronRight size={14} /></Link>
          </div>
          {openTasks.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", textAlign: "center" }}>
              <CheckSquare size={28} style={{ color: "#D1D5DB", marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 8px" }}>No tasks due today</p>
              <Link to="/tasks" style={{ fontSize: 13, color: "#7C3AED", textDecoration: "none" }}>Create a task</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {openTasks.slice(0, 6).map((task: any) => (
                <Link
                  key={task.id}
                  to="/tasks"
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", border: "1px solid #F1F5F9", borderRadius: 3, textDecoration: "none", transition: "background 0.12s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFBFF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                    background: task.status === "overdue" ? "#DC2626" : task.priority === "high" ? "#EF4444" : task.priority === "medium" ? "#F59E0B" : "#7C3AED",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0f2545", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
                    {task.contactName && <div style={{ fontSize: 12, color: "#94A3B8" }}>{task.contactName}</div>}
                  </div>
                  {task.status === "overdue" && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#DC2626", background: "#FEF2F2", padding: "2px 8px", borderRadius: 100, flexShrink: 0 }}>Overdue</span>
                  )}
                </Link>
              ))}
              {openTasks.length > 6 && (
                <Link to="/tasks" style={{ textAlign: "center", fontSize: 13, color: "#7C3AED", textDecoration: "none", padding: "6px 0" }}>
                  +{openTasks.length - 6} more
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM ROW: QUOTES + QUICK ACTIONS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Quotes & Invoices */}
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={S.sectionTitle}>Recent Quotes & Invoices</h2>
            <Link to="/quotes" style={S.sectionLink}>View All <ChevronRight size={14} /></Link>
          </div>
          {quotes.length === 0 && invoices.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0", textAlign: "center" }}>
              <FileText size={28} style={{ color: "#D1D5DB", marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 8px" }}>No quotes or invoices yet</p>
              <Link to="/quotes" style={{ fontSize: 13, color: "#7C3AED", textDecoration: "none" }}>Create a quote</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ...quotes.slice(0, 3).map((q: any) => ({ ...q, _type: "quote" })),
                ...invoices.slice(0, 3).map((inv: any) => ({ ...inv, _type: "invoice" })),
              ]
                .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
                .slice(0, 5)
                .map((item: any) => (
                  <Link
                    key={item.id}
                    to="/quotes"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: "1px solid #F1F5F9", borderRadius: 3, textDecoration: "none", transition: "background 0.12s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFBFF"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 3, background: item._type === "quote" ? "#F5F3FF" : "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <FileText size={14} style={{ color: item._type === "quote" ? "#7C3AED" : "#059669" }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#0f2545" }}>
                          {item._type === "quote" ? item.quoteNumber : item.invoiceNumber}
                          {item.contactName && <span style={{ color: "#94A3B8", fontWeight: 400 }}> — {item.contactName}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#94A3B8" }}>{item._type === "quote" ? "Quote" : "Invoice"} · {_formatDate(item.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <StatusBadge status={item.status} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0f2545" }}>${(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={S.card}>
          <h2 style={{ ...S.sectionTitle, marginBottom: 16 }}>Quick Actions</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Generate Leads", desc: "Find target companies", icon: Target, color: "#7C3AED", to: "/leads" },
              { label: "New Campaign", desc: "Send personalized emails", icon: Send, color: "#059669", to: "/outreach" },
              { label: "Create Quote", desc: "Send estimates to clients", icon: FileText, color: "#7C3AED", to: "/quotes" },
              { label: "View Pipeline", desc: "Track your outreach", icon: GitBranch, color: "#EA580C", to: "/pipeline" },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.to}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px solid #E2E8F0", borderRadius: 3, textDecoration: "none", transition: "all 0.12s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C4B5FD"; e.currentTarget.style.background = "#FAFBFF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "transparent"; }}
              >
                <action.icon size={18} style={{ color: action.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#0f2545" }}>{action.label}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>{action.desc}</div>
                </div>
              </Link>
            ))}
          </div>

          {campaigns.length > 0 && (
            <div style={{ marginTop: 16, background: "#F8FAFC", borderRadius: 3, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#0f2545", marginBottom: 12 }}>
                <Mail size={15} style={{ color: "#7C3AED" }} />
                Campaign Activity
              </div>
              <div style={{ display: "flex", gap: 24 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#0f2545" }}>{campaigns.length}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>Campaigns</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#0f2545" }}>{campaigns.filter((c: any) => c.status === "sent").length}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>Sent</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#0f2545" }}>{campaigns.filter((c: any) => c.status === "draft").length}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>Drafts</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          div[style*="gridTemplateColumns: repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
          div[style*="gridTemplateColumns: 2fr 1fr"] { grid-template-columns: 1fr !important; }
          div[style*="gridTemplateColumns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          div[style*="gridTemplateColumns: repeat(4"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    draft: { bg: "#F1F5F9", color: "#64748B" },
    sent: { bg: "#F5F3FF", color: "#7C3AED" },
    approved: { bg: "#ECFDF5", color: "#059669" },
    paid: { bg: "#ECFDF5", color: "#047857" },
    overdue: { bg: "#FEF2F2", color: "#DC2626" },
  };
  const s = styles[status] || styles.draft;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 100 }}>
      {status}
    </span>
  );
}

function _formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr.slice(0, 10);
  }
}
