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
  { key: "new_lead", label: "New Lead", color: "#3B82F6" },
  { key: "contacted", label: "Contacted", color: "#6366F1" },
  { key: "interested", label: "Interested", color: "#14B8A6" },
  { key: "estimate_sent", label: "Estimate Sent", color: "#F59E0B" },
  { key: "approved", label: "Approved", color: "#10B981" },
  { key: "in_progress", label: "In Progress", color: "#8B5CF6" },
  { key: "complete", label: "Complete", color: "#06B6D4" },
  { key: "paid", label: "Paid", color: "#22C55E" },
];

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

  return (
    <div className="mx-auto max-w-7xl p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground">
          {user?.companyName ? `${user.companyName} Dashboard` : "Your outbound sales dashboard"}
        </p>
      </div>

      {/* Gmail connection banner */}
      {gmailStatus && !gmailStatus.connected && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <Mail className="text-amber-600" size={20} />
            <div>
              <p className="text-sm font-medium text-amber-900">Connect Gmail to send campaigns</p>
              <p className="text-xs text-amber-700">Required for sending personalized emails to your contacts</p>
            </div>
          </div>
          <button
            onClick={handleConnectGmail}
            disabled={connectingGmail}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <ExternalLink size={14} />
            Connect Gmail
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/quotes"
          className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-50 p-2 text-green-600">
              <DollarSign size={18} />
            </div>
            <ArrowRight size={16} className="text-muted-foreground" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="text-sm text-muted-foreground">Revenue Collected</div>
          </div>
          {pendingRevenue > 0 && (
            <div className="mt-1 text-xs text-amber-600">
              ${pendingRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} pending
            </div>
          )}
        </Link>

        <Link
          to="/pipeline"
          className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <TrendingUp size={18} />
            </div>
            <ArrowRight size={16} className="text-muted-foreground" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">{pipelineCount}</div>
            <div className="text-sm text-muted-foreground">Active Deals</div>
          </div>
          {interestedCount > 0 && (
            <div className="mt-1 text-xs text-emerald-600">
              {interestedCount} interested
            </div>
          )}
        </Link>

        <Link
          to="/tasks"
          className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className={`rounded-lg p-2 ${overdueTasks.length > 0 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
              <CheckSquare size={18} />
            </div>
            <ArrowRight size={16} className="text-muted-foreground" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">{openTasks.length}</div>
            <div className="text-sm text-muted-foreground">Tasks Due Today</div>
          </div>
          {overdueTasks.length > 0 && (
            <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
              <AlertCircle size={12} />
              {overdueTasks.length} overdue
            </div>
          )}
        </Link>

        <Link
          to="/contacts"
          className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Users size={18} />
            </div>
            <ArrowRight size={16} className="text-muted-foreground" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">{contacts.length}</div>
            <div className="text-sm text-muted-foreground">Total Contacts</div>
          </div>
          {leads.length > 0 && (
            <div className="mt-1 text-xs text-blue-600">
              {leads.length} target companies
            </div>
          )}
        </Link>
      </div>

      {/* Pipeline Funnel + Tasks Due Today */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline Funnel */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pipeline Overview</h2>
            <Link to="/pipeline" className="flex items-center gap-1 text-sm text-primary hover:underline">
              View Kanban <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {PIPELINE_STAGES.map((stage) => {
              const count = pipelineData[stage.key]?.length || 0;
              const pct = maxStageCount > 0 ? (count / maxStageCount) * 100 : 0;
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-muted-foreground truncate" title={stage.label}>
                    {stage.label}
                  </div>
                  <div className="flex-1 h-7 rounded-md bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                      style={{
                        width: `${Math.max(pct, count > 0 ? 8 : 0)}%`,
                        backgroundColor: stage.color,
                      }}
                    >
                      {count > 0 && (
                        <span className="text-xs font-medium text-white">{count}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {pipelineCount === 0 && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              No contacts in pipeline yet. <Link to="/contacts" className="text-primary hover:underline">Add contacts</Link> to get started.
            </p>
          )}
        </div>

        {/* Tasks Due Today */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today's Tasks</h2>
            <Link to="/tasks" className="flex items-center gap-1 text-sm text-primary hover:underline">
              All Tasks <ChevronRight size={14} />
            </Link>
          </div>
          {openTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckSquare size={32} className="mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No tasks due today</p>
              <Link to="/tasks" className="mt-2 text-sm text-primary hover:underline">
                Create a task
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {openTasks.slice(0, 6).map((task: any) => (
                <Link
                  key={task.id}
                  to="/tasks"
                  className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary"
                >
                  <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    task.status === "overdue" ? "bg-red-500" :
                    task.priority === "high" ? "bg-red-400" :
                    task.priority === "medium" ? "bg-amber-400" : "bg-blue-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{task.title}</div>
                    {task.contactName && (
                      <div className="text-xs text-muted-foreground truncate">{task.contactName}</div>
                    )}
                  </div>
                  {task.status === "overdue" && (
                    <span className="flex-shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                      Overdue
                    </span>
                  )}
                </Link>
              ))}
              {openTasks.length > 6 && (
                <Link to="/tasks" className="block text-center text-sm text-primary hover:underline">
                  +{openTasks.length - 6} more
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Recent Quotes/Invoices + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Quotes & Invoices */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Quotes & Invoices</h2>
            <Link to="/quotes" className="flex items-center gap-1 text-sm text-primary hover:underline">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          {quotes.length === 0 && invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText size={32} className="mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No quotes or invoices yet</p>
              <Link to="/quotes" className="mt-2 text-sm text-primary hover:underline">
                Create a quote
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
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
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-secondary"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`rounded p-1.5 ${item._type === "quote" ? "bg-purple-50 text-purple-600" : "bg-green-50 text-green-600"}`}>
                        <FileText size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item._type === "quote" ? item.quoteNumber : item.invoiceNumber}
                          {item.contactName && <span className="text-muted-foreground font-normal"> — {item.contactName}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item._type === "quote" ? "Quote" : "Invoice"} · {_formatDate(item.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={item.status} />
                      <span className="text-sm font-semibold">${(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to="/leads"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
            >
              <Target size={20} className="text-blue-600" />
              <div>
                <div className="text-sm font-medium">Generate Leads</div>
                <div className="text-xs text-muted-foreground">Find target companies with AI</div>
              </div>
            </Link>
            <Link
              to="/outreach"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
            >
              <Send size={20} className="text-emerald-600" />
              <div>
                <div className="text-sm font-medium">New Campaign</div>
                <div className="text-xs text-muted-foreground">Send personalized emails</div>
              </div>
            </Link>
            <Link
              to="/quotes"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
            >
              <FileText size={20} className="text-purple-600" />
              <div>
                <div className="text-sm font-medium">Create Quote</div>
                <div className="text-xs text-muted-foreground">Send estimates to clients</div>
              </div>
            </Link>
            <Link
              to="/pipeline"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
            >
              <GitBranch size={20} className="text-orange-600" />
              <div>
                <div className="text-sm font-medium">View Pipeline</div>
                <div className="text-xs text-muted-foreground">Track your outreach</div>
              </div>
            </Link>
          </div>

          {/* Campaign summary */}
          {campaigns.length > 0 && (
            <div className="mt-4 rounded-lg bg-secondary/50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail size={16} className="text-primary" />
                Campaign Activity
              </div>
              <div className="mt-2 flex gap-4">
                <div>
                  <div className="text-lg font-bold">{campaigns.length}</div>
                  <div className="text-xs text-muted-foreground">Campaigns</div>
                </div>
                <div>
                  <div className="text-lg font-bold">
                    {campaigns.filter((c: any) => c.status === "sent").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div>
                  <div className="text-lg font-bold">
                    {campaigns.filter((c: any) => c.status === "draft").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Drafts</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    paid: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[status] || styles.draft}`}>
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
