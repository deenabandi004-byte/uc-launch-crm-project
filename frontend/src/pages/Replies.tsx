import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReplies, checkReplies, updateReply } from "../services/api";
import { toast } from "sonner";
import {
  Inbox, RefreshCw, Loader2, CheckCircle, XCircle, HelpCircle,
  Clock, MessageSquare, ArrowRight, Eye, EyeOff, Sparkles,
} from "lucide-react";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: any; description: string }> = {
  interested: {
    label: "Interested",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle,
    description: "Wants to learn more or schedule a call",
  },
  not_interested: {
    label: "Not Interested",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    description: "Declined or asked to stop emailing",
  },
  needs_info: {
    label: "Needs Info",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: HelpCircle,
    description: "Asking questions before deciding",
  },
  auto_reply: {
    label: "Auto Reply",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: Clock,
    description: "Out of office or automated response",
  },
  neutral: {
    label: "Neutral",
    color: "bg-amber-100 text-amber-700 border-amber-200",
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
    <div className="mx-auto max-w-6xl p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles size={24} className="text-primary" />
            AI Reply Classification
          </h1>
          <p className="text-muted-foreground">
            {totalActive} {totalActive === 1 ? "reply" : "replies"} detected
          </p>
        </div>
        <button
          onClick={() => checkMutation.mutate()}
          disabled={checkMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
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
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = counts[key] || 0;
          return (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? "all" : key as FilterType)}
              className={`rounded-xl border p-3 text-left transition-all ${
                filter === key ? "ring-2 ring-primary" : ""
              } ${cfg.color}`}
            >
              <div className="flex items-center justify-between">
                <Icon size={16} />
                <span className="text-lg font-bold">{count}</span>
              </div>
              <div className="mt-1 text-xs font-medium">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              Show All
            </button>
          )}
        </div>
        <button
          onClick={() => setShowDismissed(!showDismissed)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          {showDismissed ? <EyeOff size={14} /> : <Eye size={14} />}
          {showDismissed ? "Hide dismissed" : "Show dismissed"}
        </button>
      </div>

      {/* Replies list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Inbox className="mb-3 text-muted-foreground" size={40} />
          <h3 className="text-lg font-medium">
            {replies.length === 0 ? "No replies yet" : "No matching replies"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {replies.length === 0
              ? "Click \"Check for Replies\" to scan your Gmail for responses"
              : "Try changing the filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((reply: any) => {
            const cfg = CATEGORY_CONFIG[reply.category] || CATEGORY_CONFIG.neutral;
            const Icon = cfg.icon;
            return (
              <div
                key={reply.id}
                className={`rounded-xl border bg-card p-4 transition-all ${
                  reply.dismissed ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Contact + Category */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{reply.contactName || "Unknown"}</span>
                      {reply.company && (
                        <span className="text-sm text-muted-foreground">at {reply.company}</span>
                      )}
                      <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                        <Icon size={12} />
                        {cfg.label}
                      </span>
                      {reply.confidence === "low" && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600">
                          Low confidence
                        </span>
                      )}
                      {reply.stageUpdated && (
                        <span className="flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-600">
                          <ArrowRight size={10} /> Stage updated
                        </span>
                      )}
                    </div>

                    {/* Subject */}
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {reply.subject || "(no subject)"}
                    </div>

                    {/* Snippet */}
                    <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {reply.snippet}
                    </div>

                    {/* Meta */}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{_formatDate(reply.receivedAt)}</span>
                      <span>from {reply.sender}</span>
                      <span className="text-muted-foreground/50">via {reply.provider}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => dismissMutation.mutate({ id: reply.id, dismissed: !reply.dismissed })}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      {reply.dismissed ? "Restore" : "Dismiss"}
                    </button>
                    {/* Re-categorize dropdown */}
                    <select
                      value={reply.category}
                      onChange={(e) => recategorizeMutation.mutate({ id: reply.id, category: e.target.value })}
                      className="rounded-lg border border-border px-2 py-1.5 text-xs"
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
