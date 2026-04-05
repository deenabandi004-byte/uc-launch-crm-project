import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPipeline, movePipelineContact } from "../services/api";
import { toast } from "sonner";
import { Loader2, Mail, Phone, Linkedin, GripVertical, Users } from "lucide-react";

const STAGES = [
  { key: "none", label: "New Lead", color: "#7c3aed" },
  { key: "no_response", label: "Contacted", color: "#2563eb" },
  { key: "replied", label: "Replied", color: "#0d9488" },
  { key: "call_scheduled", label: "Call Scheduled", color: "#d97706" },
  { key: "proposal_sent", label: "Proposal Sent", color: "#4f46e5" },
  { key: "won", label: "Won", color: "#059669" },
  { key: "not_interested", label: "Not Interested", color: "#6b7280" },
  { key: "lost", label: "Lost", color: "#dc2626" },
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
      <div className="pp-loading">
        <Loader2 size={24} className="pp-spin" />
      </div>
    );
  }

  return (
    <div className="pp-root">
      <div className="pp-header">
        <div>
          <h1 className="pp-title">Pipeline</h1>
          <p className="pp-subtitle">{totalContacts} contacts across {STAGES.length} stages</p>
        </div>
      </div>

      {totalContacts === 0 ? (
        <div className="pp-empty">
          <Users size={40} strokeWidth={1.2} className="pp-empty-icon" />
          <h3 className="pp-empty-title">Pipeline is empty</h3>
          <p className="pp-empty-desc">Send a campaign to see contacts flow through your pipeline</p>
        </div>
      ) : (
        <div className="pp-board">
          {STAGES.map((stage) => {
            const contacts = (pipeline as any)[stage.key] || [];
            return (
              <div key={stage.key} className="pp-column">
                <div className="pp-column-header">
                  <span className="pp-dot" style={{ background: stage.color }} />
                  <span className="pp-column-label">{stage.label}</span>
                  <span className="pp-column-count">{contacts.length}</span>
                </div>

                <div className="pp-card-list">
                  {contacts.map((c: any) => (
                    <div key={c.id} className="pp-card" style={{ borderLeftColor: stage.color }}>
                      <div className="pp-card-top">
                        <div className="pp-card-avatar">{(c.firstName || "?")[0]}</div>
                        <div className="pp-card-info">
                          <span className="pp-card-name">{c.firstName} {c.lastName}</span>
                          {c.jobTitle && <span className="pp-card-role">{c.jobTitle}</span>}
                          {c.company && <span className="pp-card-role">{c.company}</span>}
                        </div>
                      </div>

                      {c.hasUnreadReply && (
                        <div className="pp-reply-badge">
                          <span className="pp-reply-dot" /> New reply
                        </div>
                      )}

                      <div className="pp-card-actions">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="pp-action-icon" title={c.email}>
                            <Mail size={13} />
                          </a>
                        )}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="pp-action-icon" title={c.phone}>
                            <Phone size={13} />
                          </a>
                        )}
                        {c.linkedinUrl && (
                          <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="pp-action-icon">
                            <Linkedin size={13} />
                          </a>
                        )}
                      </div>

                      <select
                        className="pp-move-select"
                        value={stage.key}
                        onChange={(e) => moveMutation.mutate({ contactId: c.id, stage: e.target.value })}
                      >
                        {STAGES.map((s) => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {contacts.length === 0 && (
                    <div className="pp-empty-col">No contacts</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .pp-root {
          --accent: #7c3aed;
          --bg: #faf9fb;
          --card: #ffffff;
          --border: #f0eef5;
          --text: #1e1b4b;
          --text2: #6b7280;
          --text3: #9ca3af;
          --radius: 14px;
          --shadow: 0 1px 3px rgba(124,58,237,.04), 0 4px 14px rgba(124,58,237,.06);

          background: var(--bg);
          padding: 40px 40px 40px 48px;
          height: 100%;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
          color: var(--text);
        }
        .pp-header { margin-bottom: 28px; }
        .pp-title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -.4px;
          margin: 0 0 4px;
        }
        .pp-subtitle { font-size: 14px; color: var(--text2); margin: 0; }

        .pp-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .pp-spin { animation: spin 1s linear infinite; color: var(--text3); }
        @keyframes spin { to { transform: rotate(360deg); } }

        .pp-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 16px;
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          text-align: center;
        }
        .pp-empty-icon { color: var(--text3); margin-bottom: 12px; }
        .pp-empty-title { font-size: 16px; font-weight: 600; margin: 0 0 6px; }
        .pp-empty-desc { font-size: 13px; color: var(--text3); margin: 0; }

        .pp-board {
          display: flex;
          gap: 14px;
          flex: 1;
          overflow-x: auto;
          padding-bottom: 16px;
        }
        .pp-column {
          flex-shrink: 0;
          width: 260px;
          display: flex;
          flex-direction: column;
        }
        .pp-column-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          background: var(--card);
          border: 1px solid var(--border);
          margin-bottom: 10px;
          box-shadow: var(--shadow);
        }
        .pp-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pp-column-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }
        .pp-column-count {
          margin-left: auto;
          font-size: 11px;
          font-weight: 600;
          color: var(--text3);
          background: #f3f2f8;
          padding: 2px 8px;
          border-radius: 100px;
        }

        .pp-card-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          max-height: calc(100vh - 220px);
        }

        .pp-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-left: 3px solid;
          border-radius: 10px;
          padding: 14px;
          box-shadow: var(--shadow);
          transition: box-shadow .15s, transform .15s;
        }
        .pp-card:hover {
          box-shadow: 0 2px 8px rgba(124,58,237,.1), 0 8px 20px rgba(124,58,237,.08);
          transform: translateY(-1px);
        }

        .pp-card-top {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .pp-card-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ede9fe;
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .pp-card-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .pp-card-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pp-card-role {
          font-size: 11px;
          color: var(--text3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pp-reply-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
          font-size: 11px;
          font-weight: 500;
          color: #059669;
        }
        .pp-reply-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #059669;
        }

        .pp-card-actions {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }
        .pp-action-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          color: var(--text3);
          transition: background .12s, color .12s;
        }
        .pp-action-icon:hover {
          background: #ede9fe;
          color: var(--accent);
        }

        .pp-move-select {
          width: 100%;
          margin-top: 10px;
          padding: 6px 8px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #faf9fb;
          font-size: 11px;
          color: var(--text2);
          cursor: pointer;
          outline: none;
          transition: border-color .15s;
        }
        .pp-move-select:focus { border-color: var(--accent); }

        .pp-empty-col {
          padding: 24px;
          text-align: center;
          font-size: 12px;
          color: var(--text3);
          border: 1px dashed var(--border);
          border-radius: 10px;
        }

        @media (max-width: 768px) {
          .pp-root { padding: 24px 16px; }
          .pp-column { width: 240px; }
        }
      `}</style>
    </div>
  );
}
