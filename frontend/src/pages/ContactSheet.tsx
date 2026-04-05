import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getContacts, getLeads, findContacts, deleteContact, updateContact,
  enrichContactPhones, importContacts,
} from "../services/api";
import { auth } from "../lib/firebase";
import { toast } from "sonner";
import {
  Users, Search, Trash2, Loader2, UserPlus, Mail, Linkedin, Phone,
  ArrowUpDown, ArrowUp, ArrowDown, Download, Upload, Check, X, Pencil,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5001"
    : window.location.origin);

type SortKey = "name" | "jobTitle" | "company" | "email" | "phone" | "pipelineStage";
type SortDir = "asc" | "desc";

const STAGE_STYLES: Record<string, { bg: string; color: string }> = {
  new_lead: { bg: "#F5F3FF", color: "#7C3AED" },
  contacted: { bg: "#F5F3FF", color: "#6D28D9" },
  interested: { bg: "#F0FDFA", color: "#0D9488" },
  estimate_sent: { bg: "#FEF3C7", color: "#B45309" },
  approved: { bg: "#F0FDF4", color: "#16A34A" },
  in_progress: { bg: "#FFF7ED", color: "#EA580C" },
  complete: { bg: "#ECFDF5", color: "#059669" },
  paid: { bg: "#ECFDF5", color: "#047857" },
  not_interested: { bg: "#FEE2E2", color: "#B91C1C" },
};

const CSV_FIELDS = ["firstName", "lastName", "email", "phone", "jobTitle", "company", "linkedinUrl", "location"];

const font = "'Inter', sans-serif";
const serifFont = "'Libre Baskerville', Georgia, serif";

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 3,
  border: "1px solid #E2E8F0",
  padding: "8px 12px",
  fontSize: 13,
  fontFamily: font,
  outline: "none",
  boxSizing: "border-box",
};

const btnSecondary: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 3,
  border: "1px solid #E2E8F0",
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 500,
  background: "#fff",
  color: "#0f2545",
  cursor: "pointer",
  fontFamily: font,
  transition: "all 0.12s",
};

const btnPrimary: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 3,
  border: "none",
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 500,
  background: "#0F172A",
  color: "#EDE9FE",
  cursor: "pointer",
  fontFamily: font,
  transition: "all 0.12s",
};

const iconBtn: React.CSSProperties = {
  borderRadius: 3,
  padding: 4,
  color: "#94A3B8",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  transition: "color 0.15s",
};

export default function ContactSheet() {
  const queryClient = useQueryClient();
  const { data: contacts = [], isLoading } = useQuery({ queryKey: ["contacts"], queryFn: getContacts });
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const [filter, setFilter] = useState("");
  const [selectedLead, setSelectedLead] = useState("");
  const [findingContacts, setFindingContacts] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const findMutation = useMutation({
    mutationFn: (data: any) => findContacts(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`Found ${data.length} contacts!`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to find contacts"),
  });

  const enrichMutation = useMutation({
    mutationFn: enrichContactPhones,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`Updated ${data.updated} contacts with phone numbers`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to enrich contacts"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact removed");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact updated");
      setEditingId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update"),
  });

  const importMutation = useMutation({
    mutationFn: importContacts,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`Imported ${data.imported} contacts`);
      setImporting(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Import failed");
      setImporting(false);
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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const getSortValue = (c: any, key: SortKey): string => {
    switch (key) {
      case "name": return `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
      case "jobTitle": return (c.jobTitle || "").toLowerCase();
      case "company": return (c.company || "").toLowerCase();
      case "email": return (c.email || "").toLowerCase();
      case "phone": return (c.phone || "").toLowerCase();
      case "pipelineStage": return (c.pipelineStage || "new_lead").toLowerCase();
      default: return "";
    }
  };

  const filtered = contacts
    .filter((c: any) =>
      !filter ||
      `${c.firstName} ${c.lastName} ${c.company} ${c.jobTitle} ${c.email}`
        .toLowerCase()
        .includes(filter.toLowerCase())
    )
    .sort((a: any, b: any) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      const cmp = va.localeCompare(vb);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setEditData({
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email || "",
      phone: c.phone || "",
      jobTitle: c.jobTitle || "",
      company: c.company || "",
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, data: editData });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleExport = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/contacts/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contacts.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Contacts exported");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
          toast.error("CSV must have a header row and at least one data row");
          setImporting(false);
          return;
        }
        const headers = parseCSVLine(lines[0]);
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCSVLine(lines[i]);
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            const key = mapHeader(h.trim());
            if (key && vals[idx]) row[key] = vals[idx].trim();
          });
          if (Object.keys(row).length > 0) rows.push(row);
        }
        if (rows.length === 0) {
          toast.error("No valid rows found in CSV");
          setImporting(false);
          return;
        }
        importMutation.mutate(rows);
      } catch {
        toast.error("Failed to parse CSV file");
        setImporting(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={11} style={{ color: "#CBD5E1" }} />;
    return sortDir === "asc"
      ? <ArrowUp size={11} style={{ color: "#7C3AED" }} />
      : <ArrowDown size={11} style={{ color: "#7C3AED" }} />;
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 16px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#94A3B8",
    background: "#F8FAFC",
    borderBottom: "1px solid #E2E8F0",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 13,
    color: "#0F172A",
    verticalAlign: "middle",
  };

  const editInputStyle: React.CSSProperties = {
    borderRadius: 3,
    border: "1px solid #E2E8F0",
    padding: "6px 8px",
    fontSize: 13,
    fontFamily: font,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 48px", fontFamily: font }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#0f2545", fontFamily: serifFont, margin: 0 }}>
            Contacts
          </h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0" }}>
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleExport}
            style={btnSecondary}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C4B5FD"; e.currentTarget.style.background = "#FAFBFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "#fff"; }}
          >
            <Download size={15} /> Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{ ...btnSecondary, opacity: importing ? 0.5 : 1 }}
            onMouseEnter={(e) => { if (!importing) { e.currentTarget.style.borderColor = "#C4B5FD"; e.currentTarget.style.background = "#FAFBFF"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "#fff"; }}
          >
            {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
          {contacts.some((c: any) => !c.phone) && (
            <button
              onClick={() => enrichMutation.mutate()}
              disabled={enrichMutation.isPending}
              style={{ ...btnSecondary, opacity: enrichMutation.isPending ? 0.5 : 1 }}
              onMouseEnter={(e) => { if (!enrichMutation.isPending) { e.currentTarget.style.borderColor = "#C4B5FD"; e.currentTarget.style.background = "#FAFBFF"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "#fff"; }}
            >
              {enrichMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Phone size={15} />}
              Add Phones
            </button>
          )}
          <button
            onClick={() => setFindingContacts(!findingContacts)}
            style={btnPrimary}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1E293B"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#0F172A"; }}
          >
            <UserPlus size={15} /> Find Contacts
          </button>
        </div>
      </div>

      {/* Find contacts panel */}
      {findingContacts && (
        <div style={{ marginBottom: 24, borderRadius: 3, border: "1px solid #E2E8F0", background: "#fff", padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0f2545", margin: "0 0 12px" }}>Find contacts at a company</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              style={{ ...inputStyle, flex: 1 }}
              value={selectedLead}
              onChange={(e) => setSelectedLead(e.target.value)}
            >
              <option value="">Select a lead company...</option>
              {leads.map((l: any) => (
                <option key={l.id} value={l.id}>{l.companyName}</option>
              ))}
            </select>
            <button
              onClick={handleFindContacts}
              disabled={!selectedLead || findMutation.isPending}
              style={{ ...btnPrimary, opacity: (!selectedLead || findMutation.isPending) ? 0.5 : 1 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1E293B"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#0F172A"; }}
            >
              {findMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              Find
            </button>
          </div>
          {leads.length === 0 && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#94A3B8" }}>
              No leads yet. Generate leads first from the Leads page.
            </p>
          )}
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
        <input
          style={{ ...inputStyle, paddingLeft: 36, paddingRight: 16, padding: "10px 16px 10px 36px" }}
          placeholder="Search contacts by name, company, title, email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(124,58,237,0.08)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 className="animate-spin" style={{ color: "#94A3B8" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          borderRadius: 3, border: "2px dashed #E2E8F0", padding: "64px 0",
        }}>
          <Users style={{ marginBottom: 12, color: "#94A3B8" }} size={40} />
          <h3 style={{ fontSize: 18, fontWeight: 500, color: "#0f2545", margin: 0 }}>No contacts yet</h3>
          <p style={{ fontSize: 13, color: "#94A3B8", margin: "4px 0 0" }}>Find contacts at your target companies or import a CSV</p>
        </div>
      ) : (
        <div style={{ borderRadius: 3, border: "1px solid #E2E8F0", background: "#fff", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => handleSort("name")}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Name <SortIcon col="name" /></span>
                  </th>
                  <th style={thStyle} onClick={() => handleSort("jobTitle")}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Title <SortIcon col="jobTitle" /></span>
                  </th>
                  <th style={thStyle} onClick={() => handleSort("company")}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Company <SortIcon col="company" /></span>
                  </th>
                  <th style={thStyle} onClick={() => handleSort("email")}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Email <SortIcon col="email" /></span>
                  </th>
                  <th style={thStyle} onClick={() => handleSort("phone")}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Phone <SortIcon col="phone" /></span>
                  </th>
                  <th style={thStyle} onClick={() => handleSort("pipelineStage")}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Stage <SortIcon col="pipelineStage" /></span>
                  </th>
                  <th style={{ ...thStyle, textAlign: "right", cursor: "default" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr
                    key={c.id}
                    style={{ transition: "background 0.12s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFBFF"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {editingId === c.id ? (
                      <>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <input
                              style={{ ...editInputStyle, width: 80 }}
                              value={editData.firstName}
                              onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                              placeholder="First"
                            />
                            <input
                              style={{ ...editInputStyle, width: 80 }}
                              value={editData.lastName}
                              onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                              placeholder="Last"
                            />
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <input
                            style={editInputStyle}
                            value={editData.jobTitle}
                            onChange={(e) => setEditData({ ...editData, jobTitle: e.target.value })}
                          />
                        </td>
                        <td style={tdStyle}>
                          <input
                            style={editInputStyle}
                            value={editData.company}
                            onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                          />
                        </td>
                        <td style={tdStyle}>
                          <input
                            style={editInputStyle}
                            value={editData.email}
                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          />
                        </td>
                        <td style={tdStyle}>
                          <input
                            style={editInputStyle}
                            value={editData.phone}
                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          />
                        </td>
                        <td style={tdStyle}>
                          <span style={{ color: "#94A3B8", fontSize: 12 }}>--</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                            <button
                              onClick={saveEdit}
                              disabled={updateMutation.isPending}
                              style={{ ...iconBtn, color: "#16A34A" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#F0FDF4"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={iconBtn}
                              onMouseEnter={(e) => { e.currentTarget.style.color = "#0F172A"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>
                          {c.firstName} {c.lastName}
                        </td>
                        <td style={{ ...tdStyle, color: "#64748B" }}>{c.jobTitle || "--"}</td>
                        <td style={{ ...tdStyle, color: "#64748B" }}>{c.company || "--"}</td>
                        <td style={tdStyle}>
                          {c.email ? (
                            <a
                              href={`mailto:${c.email}`}
                              style={{ display: "flex", alignItems: "center", gap: 4, color: "#7C3AED", textDecoration: "none", fontSize: 13 }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
                            >
                              <Mail size={12} /> {c.email}
                            </a>
                          ) : <span style={{ color: "#94A3B8" }}>--</span>}
                        </td>
                        <td style={tdStyle}>
                          {c.phone ? (
                            <a
                              href={`tel:${c.phone}`}
                              style={{ display: "flex", alignItems: "center", gap: 4, color: "#7C3AED", textDecoration: "none", fontSize: 13 }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
                            >
                              <Phone size={12} /> {c.phone}
                            </a>
                          ) : <span style={{ color: "#94A3B8" }}>--</span>}
                        </td>
                        <td style={tdStyle}>
                          {(() => {
                            const stage = c.pipelineStage || "new_lead";
                            const label = (!c.pipelineStage || c.pipelineStage === "none") ? "New Lead" : stage.replace(/_/g, " ");
                            const s = STAGE_STYLES[stage] || STAGE_STYLES.new_lead;
                            return (
                              <span style={{
                                borderRadius: 100,
                                padding: "2px 8px",
                                fontSize: 10,
                                fontWeight: 600,
                                background: s.bg,
                                color: s.color,
                                textTransform: "capitalize",
                              }}>
                                {label}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
                            <button
                              onClick={() => startEdit(c)}
                              title="Edit"
                              style={iconBtn}
                              onMouseEnter={(e) => { e.currentTarget.style.color = "#7C3AED"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}
                            >
                              <Pencil size={14} />
                            </button>
                            {c.linkedinUrl && (
                              <a
                                href={c.linkedinUrl.startsWith("http") ? c.linkedinUrl : `https://${c.linkedinUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={iconBtn}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#7C3AED"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#94A3B8"; }}
                              >
                                <Linkedin size={14} />
                              </a>
                            )}
                            <button
                              onClick={() => deleteMutation.mutate(c.id)}
                              title="Delete"
                              style={iconBtn}
                              onMouseEnter={(e) => { e.currentTarget.style.color = "#DC2626"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{
            borderTop: "1px solid #E2E8F0",
            background: "#F8FAFC",
            padding: "8px 16px",
            fontSize: 12,
            color: "#94A3B8",
          }}>
            Showing {filtered.length} of {contacts.length} contacts
          </div>
        </div>
      )}
    </div>
  );
}

/** Parse a single CSV line, handling quoted fields with commas. */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

/** Map common CSV header names to our field names. */
function mapHeader(header: string): string | null {
  const h = header.toLowerCase().replace(/[^a-z]/g, "");
  const map: Record<string, string> = {
    firstname: "firstName", first: "firstName", givenname: "firstName",
    lastname: "lastName", last: "lastName", surname: "lastName", familyname: "lastName",
    email: "email", emailaddress: "email", mail: "email",
    phone: "phone", phonenumber: "phone", mobile: "phone", telephone: "phone", tel: "phone",
    title: "jobTitle", jobtitle: "jobTitle", position: "jobTitle", role: "jobTitle",
    company: "company", companyname: "company", organization: "company", org: "company",
    linkedin: "linkedinUrl", linkedinurl: "linkedinUrl",
    location: "location", city: "location", address: "location",
  };
  return map[h] || null;
}
