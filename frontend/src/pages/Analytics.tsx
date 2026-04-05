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
  new_lead: "#7C3AED",
  contacted: "#7C3AED",
  interested: "#14B8A6",
  estimate_sent: "#F59E0B",
  approved: "#10B981",
  in_progress: "#8B5CF6",
  complete: "#06B6D4",
  paid: "#22C55E",
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

const font = "'Inter', sans-serif";
const serifFont = "'Libre Baskerville', Georgia, serif";

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
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "#7C3AED" }} />
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

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: 3,
    padding: 24,
  };

  const kpiIconBox = (bg: string, color: string): React.CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: 3,
    background: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: color,
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 48px", fontFamily: font }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: "#0f2545", fontFamily: serifFont, margin: 0 }}>Analytics & Reporting</h1>
        <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0" }}>
          Track your outreach performance, pipeline health, and revenue
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {/* Total Emails Sent */}
        <div style={cardStyle}>
          <div style={kpiIconBox("#F5F3FF", "#7C3AED")}>
            <Send size={18} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#0f2545" }}>{data.emailsSent.toLocaleString()}</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Emails Sent</div>
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: "#94A3B8" }}>
            {data.campaignsSent} campaign{data.campaignsSent !== 1 ? "s" : ""} sent
          </div>
        </div>

        {/* Reply Rate */}
        <div style={cardStyle}>
          <div style={kpiIconBox("#ECFDF5", "#10B981")}>
            <MessageSquare size={18} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#0f2545" }}>{data.replyRate}%</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Reply Rate</div>
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: "#94A3B8" }}>
            {repliedCount}/{data.emailsSent} emails
          </div>
        </div>

        {/* Conversion Rate */}
        <div style={cardStyle}>
          <div style={kpiIconBox("#F5F3FF", "#7C3AED")}>
            <TrendingUp size={18} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#0f2545" }}>{data.conversionRate}%</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Conversion Rate</div>
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: "#94A3B8" }}>
            contacts to paid
          </div>
        </div>

        {/* Revenue */}
        <div style={cardStyle}>
          <div style={kpiIconBox("#F0FDF4", "#22C55E")}>
            <DollarSign size={18} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#0f2545" }}>
              ${data.revenue.collected.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Revenue Collected</div>
          </div>
          {data.revenue.pending > 0 && (
            <div style={{ marginTop: 4, fontSize: 11, color: "#F59E0B" }}>
              ${data.revenue.pending.toLocaleString(undefined, { maximumFractionDigits: 0 })} pending
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Funnel + Recent Activity */}
      <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* Pipeline Funnel */}
        <div style={cardStyle}>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart3 size={18} style={{ color: "#7C3AED" }} />
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0f2545", margin: 0 }}>Pipeline Funnel</h2>
            </div>
            <span style={{ fontSize: 13, color: "#64748B" }}>
              {totalFunnelContacts} total contact{totalFunnelContacts !== 1 ? "s" : ""}
            </span>
          </div>
          {funnelLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
              <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: "#94A3B8" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pipelineFunnel.map((stage: any) => {
                const pct = maxFunnelCount > 0 ? (stage.count / maxFunnelCount) * 100 : 0;
                const totalPct = totalFunnelContacts > 0
                  ? ((stage.count / totalFunnelContacts) * 100).toFixed(1)
                  : "0.0";
                return (
                  <div key={stage.stage} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 112, fontSize: 13, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={stage.label}>
                      {stage.label}
                    </div>
                    <div style={{ flex: 1, height: 32, borderRadius: 3, background: "#F8FAFC", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 3,
                          transition: "all 0.5s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0 8px",
                          width: `${Math.max(pct, stage.count > 0 ? 10 : 0)}%`,
                          backgroundColor: STAGE_COLORS[stage.stage] || "#6B7280",
                        }}
                      >
                        {stage.count > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 500, color: "#fff" }}>{stage.count}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ width: 56, textAlign: "right", fontSize: 11, color: "#94A3B8" }}>
                      {totalPct}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!funnelLoading && totalFunnelContacts === 0 && (
            <p style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>
              No contacts in the pipeline yet.
            </p>
          )}
        </div>

        {/* Recent Activity */}
        <div style={cardStyle}>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={18} style={{ color: "#7C3AED" }} />
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0f2545", margin: 0 }}>Recent Activity</h2>
          </div>
          {data.recentActivity.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", textAlign: "center" }}>
              <Clock size={32} style={{ marginBottom: 8, color: "#94A3B8" }} />
              <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>No recent activity</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.recentActivity.map((item: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, borderRadius: 3, border: "1px solid #E2E8F0", padding: 12 }}>
                  <div style={{
                    marginTop: 2, borderRadius: 3, padding: 6, flexShrink: 0,
                    background: item.type === "reply" ? "#F5F3FF" : item.type === "campaign_sent" ? "#ECFDF5" : "#F0FDF4",
                    color: item.type === "reply" ? "#7C3AED" : item.type === "campaign_sent" ? "#10B981" : "#22C55E",
                  }}>
                    {item.type === "reply" ? (
                      <MessageSquare size={14} />
                    ) : item.type === "campaign_sent" ? (
                      <Mail size={14} />
                    ) : (
                      <FileText size={14} />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {item.contactName && (
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0f2545" }}>{item.contactName}</div>
                    )}
                    <div style={{ fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.description}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 10, color: "#94A3B8" }}>
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
      <div style={cardStyle}>
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Send size={18} style={{ color: "#7C3AED" }} />
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0f2545", margin: 0 }}>Campaign Performance</h2>
        </div>

        {campaigns.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", textAlign: "center" }}>
            <Send size={32} style={{ marginBottom: 8, color: "#94A3B8" }} />
            <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>No campaigns yet</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "10px 16px", textAlign: "left", borderBottom: "1px solid #E2E8F0" }}></th>
                  <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "10px 16px", textAlign: "left", borderBottom: "1px solid #E2E8F0" }}>Campaign</th>
                  <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "10px 16px", textAlign: "left", borderBottom: "1px solid #E2E8F0" }}>Date</th>
                  <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "10px 16px", textAlign: "right", borderBottom: "1px solid #E2E8F0" }}>Emails Sent</th>
                  <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "10px 16px", textAlign: "right", borderBottom: "1px solid #E2E8F0" }}>Replies</th>
                  <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "10px 16px", textAlign: "right", borderBottom: "1px solid #E2E8F0" }}>Reply Rate</th>
                  <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "10px 16px", textAlign: "left", borderBottom: "1px solid #E2E8F0" }}>Status</th>
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

  const tdStyle: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid #E2E8F0" };

  return (
    <>
      <tr
        onClick={onToggle}
        style={{ cursor: "pointer", transition: "background 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <td style={{ ...tdStyle, paddingRight: 8 }}>
          {expanded ? (
            <ChevronDown size={14} style={{ color: "#64748B" }} />
          ) : (
            <ChevronRight size={14} style={{ color: "#64748B" }} />
          )}
        </td>
        <td style={{ ...tdStyle, fontWeight: 500, color: "#0f2545" }}>{campaign.name}</td>
        <td style={{ ...tdStyle, color: "#64748B" }}>{dateStr}</td>
        <td style={{ ...tdStyle, textAlign: "right" }}>{sentCount}</td>
        <td style={{ ...tdStyle, textAlign: "right" }}>{expanded ? replyCount : "..."}</td>
        <td style={{ ...tdStyle, textAlign: "right" }}>{expanded ? `${replyRate}%` : "..."}</td>
        <td style={tdStyle}>
          <StatusBadge status={campaign.status} />
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: 0 }}>
            <div style={{ background: "#F8FAFC", padding: "16px 24px" }}>
              {isLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                  <Loader2 className="animate-spin" style={{ width: 20, height: 20, color: "#94A3B8" }} />
                </div>
              ) : analytics?.contacts?.length > 0 ? (
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "8px 16px", textAlign: "left", borderBottom: "1px solid #E2E8F0" }}>Name</th>
                      <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "8px 16px", textAlign: "left", borderBottom: "1px solid #E2E8F0" }}>Email</th>
                      <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "8px 16px", textAlign: "left", borderBottom: "1px solid #E2E8F0" }}>Status</th>
                      <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "8px 16px", textAlign: "left", borderBottom: "1px solid #E2E8F0" }}>Replied</th>
                      <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "8px 16px", textAlign: "left", borderBottom: "1px solid #E2E8F0" }}>Category</th>
                      <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "8px 16px", textAlign: "left", borderBottom: "1px solid #E2E8F0" }}>Pipeline Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.contacts.map((contact: any, i: number) => (
                      <tr key={i}>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #F1F5F9" }}>{contact.name}</td>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #F1F5F9", color: "#64748B" }}>{contact.email}</td>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #F1F5F9" }}>
                          <StatusBadge status={contact.status} />
                        </td>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #F1F5F9" }}>
                          {contact.replied ? (
                            <span style={{ color: "#10B981", fontWeight: 500 }}>Yes</span>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>No</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #F1F5F9" }}>
                          {contact.category ? (
                            <span style={{ borderRadius: 100, background: "#F5F3FF", padding: "2px 8px", fontSize: 10, fontWeight: 600, color: "#7C3AED" }}>
                              {contact.category}
                            </span>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>--</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #F1F5F9" }}>
                          {contact.pipelineStage ? (
                            <span
                              style={{
                                borderRadius: 100,
                                padding: "2px 8px",
                                fontSize: 10,
                                fontWeight: 600,
                                color: "#fff",
                                backgroundColor: STAGE_COLORS[contact.pipelineStage] || "#6B7280",
                              }}
                            >
                              {contact.pipelineStage.replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", padding: "8px 0", margin: 0 }}>
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
  const styles: Record<string, { bg: string; color: string }> = {
    draft: { bg: "#F1F5F9", color: "#64748B" },
    drafts_ready: { bg: "#FEF3C7", color: "#B45309" },
    sent: { bg: "#F5F3FF", color: "#7C3AED" },
    send_error: { bg: "#FEE2E2", color: "#DC2626" },
  };
  const s = styles[status] || styles.draft;
  return (
    <span style={{ borderRadius: 100, padding: "2px 8px", fontSize: 10, fontWeight: 600, background: s.bg, color: s.color }}>
      {status?.replace(/_/g, " ") || "unknown"}
    </span>
  );
}
