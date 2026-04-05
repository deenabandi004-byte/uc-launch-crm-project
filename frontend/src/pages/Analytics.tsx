import { useQuery } from "@tanstack/react-query";
import {
  getAnalyticsOverview,
  getCampaignAnalytics,
  getPipelineHistory,
  getCampaigns,
} from "../services/api";
import {
  Send, TrendingUp, DollarSign, BarChart3, ChevronDown, ChevronRight,
  MessageSquare, Mail, FileText, Clock, Loader2,
} from "lucide-react";
import { useState } from "react";

const STAGE_COLORS: Record<string, string> = {
  new_lead: "#7c3aed",
  contacted: "#6d28d9",
  interested: "#0d9488",
  estimate_sent: "#4f46e5",
  approved: "#d97706",
  in_progress: "#ea580c",
  complete: "#059669",
  paid: "#047857",
};

function relativeTime(timestamp: string): string {
  if (!timestamp) return "";
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Analytics() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: getAnalyticsOverview,
  });

  const { data: pipelineFunnel = [], isLoading: funnelLoading } = useQuery({
    queryKey: ["analytics-pipeline"],
    queryFn: getPipelineHistory,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: getCampaigns,
  });

  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  if (overviewLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const data = overview || {
    totalContacts: 0,
    totalLeads: 0,
    campaignsSent: 0,
    emailsSent: 0,
    pipelineBreakdown: {},
    replyRate: 0,
    conversionRate: 0,
    revenue: { total: 0, pending: 0, collected: 0 },
    recentActivity: [],
  };

  // Compute reply count for subtitle
  const repliedCount = Math.round((data.replyRate / 100) * data.emailsSent);

  // Pipeline funnel max
  const maxFunnelCount = Math.max(1, ...pipelineFunnel.map((s: any) => s.count));
  const totalFunnelContacts = pipelineFunnel.reduce((sum: number, s: any) => sum + s.count, 0);

  return (
    <div className="mx-auto max-w-7xl p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics & Reporting</h1>
        <p className="text-muted-foreground">
          Track your outreach performance, pipeline health, and revenue
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Emails Sent */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Send size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">{data.emailsSent.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Emails Sent</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {data.campaignsSent} campaign{data.campaignsSent !== 1 ? "s" : ""} sent
          </div>
        </div>

        {/* Reply Rate */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">{data.replyRate}%</div>
            <div className="text-sm text-muted-foreground">Reply Rate</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {repliedCount}/{data.emailsSent} emails
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">{data.conversionRate}%</div>
            <div className="text-sm text-muted-foreground">Conversion Rate</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            contacts to paid
          </div>
        </div>

        {/* Revenue */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-50 p-2 text-green-600">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">
              ${data.revenue.collected.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-muted-foreground">Revenue Collected</div>
          </div>
          {data.revenue.pending > 0 && (
            <div className="mt-1 text-xs text-amber-600">
              ${data.revenue.pending.toLocaleString(undefined, { maximumFractionDigits: 0 })} pending
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Funnel + Recent Activity */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline Funnel */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              <h2 className="text-lg font-semibold">Pipeline Funnel</h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {totalFunnelContacts} total contact{totalFunnelContacts !== 1 ? "s" : ""}
            </span>
          </div>
          {funnelLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {pipelineFunnel.map((stage: any) => {
                const pct = maxFunnelCount > 0 ? (stage.count / maxFunnelCount) * 100 : 0;
                const totalPct = totalFunnelContacts > 0
                  ? ((stage.count / totalFunnelContacts) * 100).toFixed(1)
                  : "0.0";
                return (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <div className="w-28 text-sm text-muted-foreground truncate" title={stage.label}>
                      {stage.label}
                    </div>
                    <div className="flex-1 h-8 rounded-md bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all duration-500 flex items-center justify-between px-2"
                        style={{
                          width: `${Math.max(pct, stage.count > 0 ? 10 : 0)}%`,
                          backgroundColor: STAGE_COLORS[stage.stage] || "#6B7280",
                        }}
                      >
                        {stage.count > 0 && (
                          <span className="text-xs font-medium text-white">{stage.count}</span>
                        )}
                      </div>
                    </div>
                    <div className="w-14 text-right text-xs text-muted-foreground">
                      {totalPct}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!funnelLoading && totalFunnelContacts === 0 && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              No contacts in the pipeline yet.
            </p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Clock size={18} className="text-primary" />
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          {data.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock size={32} className="mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((item: any, i: number) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className={`mt-0.5 rounded-md p-1.5 flex-shrink-0 ${
                    item.type === "reply"
                      ? "bg-blue-50 text-blue-600"
                      : item.type === "campaign_sent"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-green-50 text-green-600"
                  }`}>
                    {item.type === "reply" ? (
                      <MessageSquare size={14} />
                    ) : item.type === "campaign_sent" ? (
                      <Mail size={14} />
                    ) : (
                      <FileText size={14} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.contactName && (
                      <div className="text-sm font-medium truncate">{item.contactName}</div>
                    )}
                    <div className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground/60">
                      {relativeTime(item.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Send size={18} className="text-primary" />
          <h2 className="text-lg font-semibold">Campaign Performance</h2>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Send size={32} className="mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No campaigns yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground"></th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Campaign</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Date</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">Emails Sent</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">Replies</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">Reply Rate</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns
                  .sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""))
                  .map((campaign: any) => (
                    <CampaignRow
                      key={campaign.id}
                      campaign={campaign}
                      expanded={expandedCampaign === campaign.id}
                      onToggle={() =>
                        setExpandedCampaign(
                          expandedCampaign === campaign.id ? null : campaign.id
                        )
                      }
                    />
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignRow({
  campaign,
  expanded,
  onToggle,
}: {
  campaign: any;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["campaign-analytics", campaign.id],
    queryFn: () => getCampaignAnalytics(campaign.id),
    enabled: expanded,
  });

  const sentCount = campaign.sentCount || 0;
  const drafts = campaign.drafts || [];
  // Estimate reply count from drafts that resulted in replies
  const repliedDrafts = drafts.filter((d: any) => d.status === "sent").length;
  const replyCount = analytics?.contacts?.filter((c: any) => c.replied).length ?? 0;
  const replyRate = sentCount > 0 ? ((replyCount / sentCount) * 100).toFixed(1) : "0.0";

  const dateStr = campaign.createdAt
    ? new Date(campaign.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <>
      <tr
        className="border-b border-border cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={onToggle}
      >
        <td className="py-3 pr-2">
          {expanded ? (
            <ChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={14} className="text-muted-foreground" />
          )}
        </td>
        <td className="py-3 pr-4 font-medium">{campaign.name}</td>
        <td className="py-3 pr-4 text-muted-foreground">{dateStr}</td>
        <td className="py-3 pr-4 text-right">{sentCount}</td>
        <td className="py-3 pr-4 text-right">{expanded ? replyCount : "..."}</td>
        <td className="py-3 text-right">{expanded ? `${replyRate}%` : "..."}</td>
        <td className="py-3">
          <StatusBadge status={campaign.status} />
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="bg-secondary/30 px-6 py-4">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : analytics?.contacts?.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Name</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Email</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Replied</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Category</th>
                      <th className="pb-2 font-medium text-muted-foreground">Pipeline Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.contacts.map((contact: any, i: number) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 pr-4">{contact.name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{contact.email}</td>
                        <td className="py-2 pr-4">
                          <StatusBadge status={contact.status} />
                        </td>
                        <td className="py-2 pr-4">
                          {contact.replied ? (
                            <span className="text-emerald-600 font-medium">Yes</span>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {contact.category ? (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                              {contact.category}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="py-2">
                          {contact.pipelineStage ? (
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                              style={{
                                backgroundColor: STAGE_COLORS[contact.pipelineStage] || "#6B7280",
                              }}
                            >
                              {contact.pipelineStage.replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No contact details available for this campaign.
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    drafts_ready: "bg-amber-100 text-amber-700",
    sent: "bg-blue-100 text-blue-700",
    send_error: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[status] || styles.draft}`}>
      {status?.replace(/_/g, " ") || "unknown"}
    </span>
  );
}
