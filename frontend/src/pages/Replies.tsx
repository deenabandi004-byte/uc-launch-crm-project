import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReplies, checkReplies, updateReply } from "../services/api";
import { toast } from "sonner";
import {
  Inbox, RefreshCw, Loader2, CheckCircle, XCircle, HelpCircle,
  Clock, MessageSquare, ArrowRight, Eye, EyeOff, Sparkles,
} from "lucide-react";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; textColor: string; borderColor: string; icon: any; description: string }> = {
  interested: {
    label: "Interested",
    color: "bg-green-100 text-green-700 border-green-200",
    bg: "#DCFCE7",
    textColor: "#15803D",
    borderColor: "#BBF7D0",
    icon: CheckCircle,
    description: "Wants to learn more or schedule a call",
  },
  not_interested: {
    label: "Not Interested",
    color: "bg-red-100 text-red-700 border-red-200",
    bg: "#FEE2E2",
    textColor: "#B91C1C",
    borderColor: "#FECACA",
    icon: XCircle,
    description: "Declined or asked to stop emailing",
  },
  needs_info: {
    label: "Needs Info",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    bg: "#DBEAFE",
    textColor: "#1D4ED8",
    borderColor: "#BFDBFE",
    icon: HelpCircle,
    description: "Asking questions before deciding",
  },
  auto_reply: {
    label: "Auto Reply",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    bg: "#F1F5F9",
    textColor: "#64748B",
    borderColor: "#E2E8F0",
    icon: Clock,
    description: "Out of office or automated response",
  },
  neutral: {
    label: "Neutral",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    bg: "#FEF3C7",
    textColor: "#B45309",
    borderColor: "#FDE68A",
    icon: MessageSquare,
    description: "Acknowledgement or unclear intent",
  },
};

type FilterType = "all" | "interested" | "not_interested" | "needs_info" | "auto_reply" | "neutral";

export default function Replies() {
  const queryClient = useQueryClient();
  const { data: replies = [], isLoading } = useQuery({ queryKey: ["replies"], queryFn: getReplies });
  const [filter, setFilter] = useState<FilterType>("all");
  const [showDismissed, setShowDismissed] = useState(false);

  const checkMutation = useMutation({
    mutationFn: checkReplies,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["replies"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      if (data.newReplies > 0) {
        toast.success(`Found ${data.newReplies} new replies! (checked ${data.checked} threads)`);
      } else {
        toast.info(`Checked ${data.checked} threads — no new replies`);
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to check replies"),
  });

  const dismissMutation = useMutation({
    mutationFn: ({ id, dismissed }: { id: string; dismissed: boolean }) =>
      updateReply(id, { dismissed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replies"] });
    },
  });

  const recategorizeMutation = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      updateReply(id, { category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replies"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Category updated — pipeline stage adjusted");
    },
  });

  const filtered = replies
    .filter((r: any) => showDismissed || !r.dismissed)
    .filter((r: any) => filter === "all" || r.category === filter);

  // Count by category (excluding dismissed)
  const counts = replies.reduce((acc: Record<string, number>, r: any) => {
    if (!r.dismissed) acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const totalActive = replies.filter((r: any) => !r.dismissed).length;

  return (
    <div style={{ maxWidth: 1152, margin: "0 auto", padding: "40px 48px", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{
            fontSize: 26, fontWeight: 600, color: "#0f2545",
            fontFamily: "'Libre Baskerville', Georgia, serif",
            margin: 0, display: "flex", alignItems: "center", gap: 8,
          }}>
            <Sparkles size={24} style={{ color: "#7C3AED" }} />
            AI Reply Classification
          </h1>
          <p style={{ color: "#64748B", fontSize: 14, margin: "4px 0 0" }}>
            {totalActive} {totalActive === 1 ? "reply" : "replies"} detected
          </p>
        </div>
        <button
          onClick={() => checkMutation.mutate()}
          disabled={checkMutation.isPending}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#0F172A", color: "#EDE9FE",
            borderRadius: 3, padding: "8px 16px",
            fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer",
            opacity: checkMutation.isPending ? 0.5 : 1,
          }}
        >
          {checkMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Check for Replies
        </button>
      </div>

      {/* Category summary cards */}
      <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = counts[key] || 0;
          return (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? "all" : key as FilterType)}
              style={{
                borderRadius: 3,
                border: filter === key ? `2px solid #7C3AED` : `1px solid ${cfg.borderColor}`,
                padding: 12,
                textAlign: "left",
                background: cfg.bg,
                color: cfg.textColor,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Icon size={16} />
                <span style={{ fontSize: 18, fontWeight: 700 }}>{count}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600 }}>{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              style={{
                borderRadius: 3, border: "1px solid #E2E8F0",
                padding: "6px 12px", fontSize: 12, fontWeight: 500,
                background: "transparent", color: "#64748B", cursor: "pointer",
              }}
            >
              Show All
            </button>
          )}
        </div>
        <button
          onClick={() => setShowDismissed(!showDismissed)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 14, color: "#64748B",
            background: "none", border: "none", cursor: "pointer",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#0f2545"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
        >
          {showDismissed ? <EyeOff size={14} /> : <Eye size={14} />}
          {showDismissed ? "Hide dismissed" : "Show dismissed"}
        </button>
      </div>

      {/* Replies list */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 className="animate-spin" style={{ color: "#94A3B8" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          border: "2px dashed #E2E8F0", borderRadius: 3,
          padding: "64px 0",
        }}>
          <Inbox style={{ marginBottom: 12, color: "#94A3B8" }} size={40} />
          <h3 style={{ fontSize: 18, fontWeight: 500, color: "#0f2545", margin: 0 }}>
            {replies.length === 0 ? "No replies yet" : "No matching replies"}
          </h3>
          <p style={{ marginTop: 4, fontSize: 14, color: "#64748B", margin: "4px 0 0" }}>
            {replies.length === 0
              ? "Click \"Check for Replies\" to scan your Gmail for responses"
              : "Try changing the filter"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((reply: any) => {
            const cfg = CATEGORY_CONFIG[reply.category] || CATEGORY_CONFIG.neutral;
            const Icon = cfg.icon;
            return (
              <div
                key={reply.id}
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 3,
                  padding: 16,
                  transition: "border-color 0.15s, box-shadow 0.15s, opacity 0.15s",
                  opacity: reply.dismissed ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!reply.dismissed) {
                    e.currentTarget.style.borderColor = "#C4B5FD";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(124,58,237,0.10)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#E2E8F0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {/* Contact + Category */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "#0f2545" }}>{reply.contactName || "Unknown"}</span>
                      {reply.company && (
                        <span style={{ fontSize: 13, color: "#64748B" }}>at {reply.company}</span>
                      )}
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        borderRadius: 100, border: `1px solid ${cfg.borderColor}`,
                        padding: "2px 8px", fontSize: 11, fontWeight: 600,
                        background: cfg.bg, color: cfg.textColor,
                      }}>
                        <Icon size={12} />
                        {cfg.label}
                      </span>
                      {reply.confidence === "low" && (
                        <span style={{
                          borderRadius: 3, background: "#FEF3C7",
                          padding: "2px 6px", fontSize: 10, color: "#D97706",
                        }}>
                          Low confidence
                        </span>
                      )}
                      {reply.stageUpdated && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          borderRadius: 3, background: "#EDE9FE",
                          padding: "2px 6px", fontSize: 10, color: "#7C3AED",
                        }}>
                          <ArrowRight size={10} /> Stage updated
                        </span>
                      )}
                    </div>

                    {/* Subject */}
                    <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500, color: "#0f2545" }}>
                      {reply.subject || "(no subject)"}
                    </div>

                    {/* Snippet */}
                    <div style={{
                      marginTop: 4, fontSize: 13, color: "#64748B",
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    }}>
                      {reply.snippet}
                    </div>

                    {/* Meta */}
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#64748B" }}>
                      <span>{_formatDate(reply.receivedAt)}</span>
                      <span>from {reply.sender}</span>
                      <span style={{ color: "#94A3B8" }}>via {reply.provider}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => dismissMutation.mutate({ id: reply.id, dismissed: !reply.dismissed })}
                      style={{
                        borderRadius: 3, border: "1px solid #E2E8F0",
                        padding: "6px 12px", fontSize: 12, fontWeight: 500,
                        background: "transparent", color: "#64748B", cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#F8FAFC"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {reply.dismissed ? "Restore" : "Dismiss"}
                    </button>
                    {/* Re-categorize dropdown */}
                    <select
                      value={reply.category}
                      onChange={(e) => recategorizeMutation.mutate({ id: reply.id, category: e.target.value })}
                      style={{
                        borderRadius: 3, border: "1px solid #E2E8F0",
                        padding: "6px 8px", fontSize: 12,
                        background: "#fff", color: "#64748B",
                        cursor: "pointer",
                      }}
                    >
                      {Object.entries(CATEGORY_CONFIG).map(([key, c]) => (
                        <option key={key} value={key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function _formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr.slice(0, 10);
  }
}
