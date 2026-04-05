import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContacts, getLeads, findContacts, deleteContact } from "../services/api";
import { toast } from "sonner";
import {
  Users, Search, Trash2, Loader2, UserPlus,
  Mail, Linkedin, ChevronDown,
} from "lucide-react";

export default function ContactSheet() {
  const queryClient = useQueryClient();
  const { data: contacts = [], isLoading } = useQuery({ queryKey: ["contacts"], queryFn: getContacts });
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const [filter, setFilter] = useState("");
  const [selectedLead, setSelectedLead] = useState("");
  const [findingContacts, setFindingContacts] = useState(false);

  const findMutation = useMutation({
    mutationFn: (data: any) => findContacts(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`Found ${data.length} contacts!`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to find contacts"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact removed");
    },
  });

  const handleFindContacts = () => {
    if (!selectedLead) return;
    const lead = leads.find((l: any) => l.id === selectedLead);
    if (!lead) return;
    findMutation.mutate({
      company: lead.companyName,
      domain: lead.domain || "",
      leadId: lead.id,
    });
    setFindingContacts(false);
  };

  const filtered = contacts.filter(
    (c: any) =>
      !filter ||
      `${c.firstName} ${c.lastName} ${c.company} ${c.jobTitle} ${c.email}`
        .toLowerCase()
        .includes(filter.toLowerCase())
  );

  const stageLabel = (stage: string) => {
    if (!stage || stage === "none") return "New";
    return stage.replace(/_/g, " ");
  };

  return (
    <div className="cs-root">
      {/* Header */}
      <div className="cs-header">
        <div>
          <h1 className="cs-title">Contacts</h1>
          <p className="cs-subtitle">{contacts.length} total contacts</p>
        </div>
        <button onClick={() => setFindingContacts(!findingContacts)} className="cs-primary-btn">
          <UserPlus size={16} />
          Find Contacts
        </button>
      </div>

      {/* Find contacts panel */}
      {findingContacts && (
        <div className="cs-find-panel">
          <h3 className="cs-find-title">Find contacts at a company</h3>
          <div className="cs-find-row">
            <div className="cs-select-wrap">
              <select
                className="cs-select"
                value={selectedLead}
                onChange={(e) => setSelectedLead(e.target.value)}
              >
                <option value="">Select a lead company...</option>
                {leads.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.companyName}</option>
                ))}
              </select>
              <ChevronDown size={14} className="cs-select-icon" />
            </div>
            <button
              onClick={handleFindContacts}
              disabled={!selectedLead || findMutation.isPending}
              className="cs-primary-btn"
            >
              {findMutation.isPending ? <Loader2 size={16} className="cs-spin" /> : <Search size={16} />}
              Find
            </button>
          </div>
          {leads.length === 0 && (
            <p className="cs-hint">No leads yet. Generate leads first from the Dashboard.</p>
          )}
        </div>
      )}

      {/* Search */}
      <div className="cs-search-wrap">
        <Search size={16} className="cs-search-icon" />
        <input
          className="cs-search"
          placeholder="Search contacts..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="cs-center"><Loader2 size={24} className="cs-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="cs-empty">
          <Users size={40} strokeWidth={1.2} className="cs-empty-icon" />
          <h3 className="cs-empty-title">No contacts yet</h3>
          <p className="cs-empty-desc">Find contacts at your target companies to get started</p>
        </div>
      ) : (
        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Company</th>
                <th>Email</th>
                <th>Stage</th>
                <th className="cs-th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id}>
                  <td>
                    <div className="cs-name-cell">
                      <div className="cs-avatar">{(c.firstName || "?")[0]}</div>
                      <span className="cs-name">{c.firstName} {c.lastName}</span>
                    </div>
                  </td>
                  <td className="cs-cell-muted">{c.jobTitle || "—"}</td>
                  <td className="cs-cell-muted">{c.company || "—"}</td>
                  <td>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="cs-email-link">
                        <Mail size={12} /> {c.email}
                      </a>
                    ) : "—"}
                  </td>
                  <td>
                    <span className="cs-stage-badge">{stageLabel(c.pipelineStage)}</span>
                  </td>
                  <td className="cs-td-actions">
                    {c.linkedinUrl && (
                      <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="cs-action-btn">
                        <Linkedin size={14} />
                      </a>
                    )}
                    <button onClick={() => deleteMutation.mutate(c.id)} className="cs-action-btn cs-action-delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .cs-root {
          --accent: #7c3aed;
          --accent-light: #ede9fe;
          --bg: #faf9fb;
          --card: #ffffff;
          --border: #f0eef5;
          --text: #1e1b4b;
          --text2: #6b7280;
          --text3: #9ca3af;
          --radius: 14px;
          --shadow: 0 1px 3px rgba(124,58,237,.04), 0 4px 14px rgba(124,58,237,.06);

          background: var(--bg);
          padding: 40px 48px;
          max-width: 1120px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
          color: var(--text);
        }

        .cs-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .cs-title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -.4px;
          margin: 0 0 4px;
        }
        .cs-subtitle { font-size: 14px; color: var(--text2); margin: 0; }

        .cs-primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background .15s;
          white-space: nowrap;
        }
        .cs-primary-btn:hover { background: #6d28d9; }
        .cs-primary-btn:disabled { opacity: .5; cursor: default; }

        .cs-find-panel {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: var(--shadow);
        }
        .cs-find-title { font-size: 14px; font-weight: 600; margin: 0 0 12px; }
        .cs-find-row { display: flex; gap: 10px; }
        .cs-select-wrap { position: relative; flex: 1; }
        .cs-select {
          width: 100%;
          padding: 10px 32px 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--border);
          font-size: 13px;
          color: var(--text);
          background: var(--bg);
          appearance: none;
          cursor: pointer;
          outline: none;
        }
        .cs-select:focus { border-color: var(--accent); }
        .cs-select-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text3);
          pointer-events: none;
        }
        .cs-hint { font-size: 12px; color: var(--text3); margin: 10px 0 0; }

        .cs-search-wrap {
          position: relative;
          margin-bottom: 20px;
        }
        .cs-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text3);
        }
        .cs-search {
          width: 100%;
          padding: 11px 14px 11px 40px;
          border-radius: 10px;
          border: 1px solid var(--border);
          font-size: 13px;
          color: var(--text);
          background: var(--card);
          box-shadow: var(--shadow);
          outline: none;
          transition: border-color .15s;
        }
        .cs-search:focus { border-color: var(--accent); }

        .cs-center {
          display: flex;
          justify-content: center;
          padding: 48px;
        }
        .cs-spin { animation: cs-spin 1s linear infinite; color: var(--text3); }
        @keyframes cs-spin { to { transform: rotate(360deg); } }

        .cs-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 64px 16px;
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          text-align: center;
        }
        .cs-empty-icon { color: var(--text3); margin-bottom: 12px; }
        .cs-empty-title { font-size: 16px; font-weight: 600; margin: 0 0 6px; }
        .cs-empty-desc { font-size: 13px; color: var(--text3); margin: 0; }

        .cs-table-wrap {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .cs-table { width: 100%; border-collapse: collapse; }
        .cs-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .5px;
          color: var(--text3);
          background: #f8f7fc;
          border-bottom: 1px solid var(--border);
        }
        .cs-th-right { text-align: right; }
        .cs-table td {
          padding: 14px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .cs-table tr:last-child td { border-bottom: none; }
        .cs-table tr:hover td { background: #faf8fe; }

        .cs-name-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cs-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--accent-light);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .cs-name { font-weight: 500; color: var(--text); }
        .cs-cell-muted { color: var(--text2); }

        .cs-email-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--accent);
          text-decoration: none;
          font-size: 13px;
        }
        .cs-email-link:hover { text-decoration: underline; }

        .cs-stage-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 500;
          color: var(--accent);
          background: var(--accent-light);
          padding: 3px 10px;
          border-radius: 100px;
          text-transform: capitalize;
        }

        .cs-td-actions {
          text-align: right;
        }
        .cs-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: none;
          color: var(--text3);
          cursor: pointer;
          transition: background .12s, color .12s;
        }
        .cs-action-btn:hover {
          background: var(--accent-light);
          color: var(--accent);
        }
        .cs-action-delete:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        @media (max-width: 768px) {
          .cs-root { padding: 24px 16px; }
          .cs-header { flex-direction: column; gap: 12px; }
          .cs-primary-btn { width: 100%; justify-content: center; }
          .cs-find-row { flex-direction: column; }
          .cs-table-wrap { overflow-x: auto; }
        }
      `}</style>
    </div>
  );
}
