import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPipeline, movePipelineContact } from "../services/api";
import { toast } from "sonner";
import {
  Loader2, Mail, Clock, MessageSquare, Calendar,
  FileText, Trophy, ThumbsDown, XCircle,
} from "lucide-react";

const STAGES = [
  { key: "no_response", label: "No Response", icon: Clock, color: "border-yellow-300 bg-yellow-50" },
  { key: "replied", label: "Replied", icon: MessageSquare, color: "border-green-300 bg-green-50" },
  { key: "call_scheduled", label: "Call Scheduled", icon: Calendar, color: "border-blue-300 bg-blue-50" },
  { key: "proposal_sent", label: "Proposal Sent", icon: FileText, color: "border-purple-300 bg-purple-50" },
  { key: "won", label: "Won", icon: Trophy, color: "border-emerald-300 bg-emerald-50" },
  { key: "not_interested", label: "Not Interested", icon: ThumbsDown, color: "border-gray-300 bg-gray-50" },
  { key: "lost", label: "Lost", icon: XCircle, color: "border-red-300 bg-red-50" },
];

export default function Pipeline() {
  const queryClient = useQueryClient();
  const { data: pipeline = {}, isLoading } = useQuery({ queryKey: ["pipeline"], queryFn: getPipeline });

  const moveMutation = useMutation({
    mutationFn: ({ contactId, stage }: { contactId: string; stage: string }) =>
      movePipelineContact(contactId, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const totalContacts = Object.values(pipeline).flat().length;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-muted-foreground">{totalContacts} contacts in pipeline</p>
      </div>

      {totalContacts === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Mail className="mb-3 text-muted-foreground" size={40} />
          <h3 className="text-lg font-medium">Pipeline is empty</h3>
          <p className="text-sm text-muted-foreground">Send a campaign to see contacts here</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const contacts = (pipeline as any)[stage.key] || [];
            return (
              <div key={stage.key} className="flex-shrink-0" style={{ width: 280 }}>
                <div className={`mb-3 flex items-center gap-2 rounded-lg border-l-4 px-3 py-2 ${stage.color}`}>
                  <stage.icon size={16} />
                  <span className="text-sm font-medium">{stage.label}</span>
                  <span className="ml-auto rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-medium">
                    {contacts.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {contacts.map((c: any) => (
                    <div key={c.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                      <div className="mb-1 text-sm font-medium">{c.firstName} {c.lastName}</div>
                      <div className="text-xs text-muted-foreground">{c.jobTitle}</div>
                      <div className="text-xs text-muted-foreground">{c.company}</div>
                      {c.lastMessageSnippet && (
                        <div className="mt-2 rounded bg-muted/50 p-2 text-xs text-muted-foreground line-clamp-2">
                          {c.lastMessageSnippet}
                        </div>
                      )}
                      {c.hasUnreadReply && (
                        <div className="mt-1 flex items-center gap-1 text-xs font-medium text-green-600">
                          <MessageSquare size={10} /> New reply
                        </div>
                      )}

                      {/* Move dropdown */}
                      <div className="mt-2">
                        <select
                          className="w-full rounded border border-border bg-white px-2 py-1 text-xs"
                          value={stage.key}
                          onChange={(e) =>
                            moveMutation.mutate({ contactId: c.id, stage: e.target.value })
                          }
                        >
                          {STAGES.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
