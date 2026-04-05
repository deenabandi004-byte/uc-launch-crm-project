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

const STAGE_COLORS: Record<string, { background: string; color: string }> = {
  interested: { background: "#EDE9FE", color: "#6D28D9" },
  contacted: { background: "#E0E7FF", color: "#4338CA" },
  approved: { background: "#F3E8FF", color: "#7C3AED" },
  complete: { background: "#DCFCE7", color: "#15803D" },
  paid: { background: "#D1FAE5", color: "#047857" },
  estimate_sent: { background: "#DDD6FE", color: "#5B21B6" },
  in_progress: { background: "#FDE68A", color: "#92400E" },
  not_interested: { background: "#FEE2E2", color: "#B91C1C" },
};

const DEFAULT_STAGE_STYLE = { background: "#F1F5F9", color: "#64748B" };

const CSV_FIELDS = ["firstName", "lastName", "email", "phone", "jobTitle", "company", "linkedinUrl", "location"];

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

  // Sort
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

  // Inline editing
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

  // CSV Export (with auth token)
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

  // CSV Import
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
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{ color: "#94A3B8" }} />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const secondaryBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 3,
    border: "1px solid #E2E8F0",
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 500,
    background: "#fff",
    color: "#0f2545",
    cursor: "pointer",
  };

  const primaryBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 3,
    background: "#0F172A",
    color: "#EDE9FE",
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
  };

  const editInputStyle: React.CSSProperties = {
    borderRadius: 3,
    border: "1px solid #E2E8F0",
    padding: "4px 6px",
    fontSize: 13,
    width: "100%",
    outline: "none",
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 48px", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#0f2545", fontFamily: "'Libre Baskerville', Georgia, serif", margin: 0 }}>
            Contact Sheet
          </h1>
          <p style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>{contacts.length} contacts</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* CSV Export */}
          <button onClick={handleExport} style={secondaryBtnStyle}>
            <Download size={16} /> Export
          </button>
          {/* CSV Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{ ...secondaryBtnStyle, opacity: importing ? 0.5 : 1 }}
          >
            {importing ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={16} />}
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
          {/* Enrich phones */}
          {contacts.some((c: any) => !c.phone) && (
            <button
              onClick={() => enrichMutation.mutate()}
              disabled={enrichMutation.isPending}
              style={{ ...secondaryBtnStyle, opacity: enrichMutation.isPending ? 0.5 : 1 }}
            >
              {enrichMutation.isPending ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Phone size={16} />}
              Add Phones
            </button>
          )}
          <button
            onClick={() => setFindingContacts(!findingContacts)}
            style={primaryBtnStyle}
          >
            <UserPlus size={16} /> Find Contacts
          </button>
        </div>
      </div>

      {/* Find contacts panel */}
      {findingContacts && (
        <div style={{ marginBottom: 24, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 3, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0f2545", marginBottom: 12, marginTop: 0 }}>Find contacts at a company</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              style={{ flex: 1, borderRadius: 3, border: "1px solid #E2E8F0", padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "'Inter', sans-serif" }}
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
              style={{ ...primaryBtnStyle, opacity: (!selectedLead || findMutation.isPending) ? 0.5 : 1 }}
            >
              {findMutation.isPending ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={16} />}
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

      {/* Filter / Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
        <input
          style={{
            width: "100%",
            borderRadius: 3,
            border: "1px solid #E2E8F0",
            padding: "10px 16px 10px 36px",
            fontSize: 13,
            outline: "none",
            fontFamily: "'Inter', sans-serif",
            boxSizing: "border-box",
          }}
          placeholder="Search contacts by name, company, title, email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 size={24} style={{ color: "#94A3B8", animation: "spin 1s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          border: "1px dashed #E2E8F0", borderRadius: 3, padding: "64px 0",
        }}>
          <Users size={40} style={{ color: "#94A3B8", marginBottom: 12 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#0f2545", margin: 0 }}>No contacts yet</h3>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>Find contacts at your target companies or import a CSV</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 3, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <SortableHeader label="Name" col="name" onSort={handleSort} icon={<SortIcon col="name" />} />
                <SortableHeader label="Title" col="jobTitle" onSort={handleSort} icon={<SortIcon col="jobTitle" />} />
                <SortableHeader label="Company" col="company" onSort={handleSort} icon={<SortIcon col="company" />} />
                <SortableHeader label="Email" col="email" onSort={handleSort} icon={<SortIcon col="email" />} />
                <SortableHeader label="Phone" col="phone" onSort={handleSort} icon={<SortIcon col="phone" />} />
                <SortableHeader label="Stage" col="pipelineStage" onSort={handleSort} icon={<SortIcon col="pipelineStage" />} />
                <th style={{
                  padding: "10px 16px", textAlign: "right", fontSize: 11, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.05em", color: "#94A3B8",
                  background: "#F8FAFC", borderBottom: "1px solid #E2E8F0",
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => {
                const stageStyle = STAGE_COLORS[c.pipelineStage] || DEFAULT_STAGE_STYLE;
                return (
                  <tr
                    key={c.id}
                    style={{ borderBottom: "1px solid #E2E8F0" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FAFBFF"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {editingId === c.id ? (
                      <>
                        <td style={{ padding: "8px 16px" }}>
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
                        <td style={{ padding: "8px 16px" }}>
                          <input
                            style={editInputStyle}
                            value={editData.jobTitle}
                            onChange={(e) => setEditData({ ...editData, jobTitle: e.target.value })}
                          />
                        </td>
                        <td style={{ padding: "8px 16px" }}>
                          <input
                            style={editInputStyle}
                            value={editData.company}
                            onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                          />
                        </td>
                        <td style={{ padding: "8px 16px" }}>
                          <input
                            style={editInputStyle}
                            value={editData.email}
                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          />
                        </td>
                        <td style={{ padding: "8px 16px" }}>
                          <input
                            style={editInputStyle}
                            value={editData.phone}
                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          />
                        </td>
                        <td style={{ padding: "12px 16px", color: "#94A3B8" }}>&mdash;</td>
                        <td style={{ padding: "8px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                            <button
                              onClick={saveEdit}
                              disabled={updateMutation.isPending}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 3, color: "#15803D" }}
                            >
                              {updateMutation.isPending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                            </button>
                            <button onClick={cancelEdit} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 3, color: "#94A3B8" }}>
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "#0f2545" }}>
                          {c.firstName} {c.lastName}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748B" }}>{c.jobTitle || "\u2014"}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748B" }}>{c.company || "\u2014"}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>
                          {c.email ? (
                            <a href={`mailto:${c.email}`} style={{ display: "flex", alignItems: "center", gap: 4, color: "#7C3AED", textDecoration: "none" }}>
                              <Mail size={12} /> {c.email}
                            </a>
                          ) : "\u2014"}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>
                          {c.phone ? (
                            <a href={`tel:${c.phone}`} style={{ display: "flex", alignItems: "center", gap: 4, color: "#7C3AED", textDecoration: "none" }}>
                              <Phone size={12} /> {c.phone}
                            </a>
                          ) : "\u2014"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            borderRadius: 100, padding: "3px 10px", fontSize: 10, fontWeight: 600,
                            textTransform: "capitalize",
                            background: stageStyle.background,
                            color: stageStyle.color,
                            display: "inline-block",
                          }}>
                            {!c.pipelineStage || c.pipelineStage === "none" ? "New Lead" : c.pipelineStage?.replace(/_/g, " ") || "New Lead"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                            <button
                              onClick={() => startEdit(c)}
                              title="Edit"
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 3, color: "#94A3B8" }}
                            >
                              <Pencil size={14} />
                            </button>
                            {c.linkedinUrl && (
                              <a
                                href={c.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ padding: 4, borderRadius: 3, color: "#94A3B8", display: "flex" }}
                              >
                                <Linkedin size={14} />
                              </a>
                            )}
                            <button
                              onClick={() => deleteMutation.mutate(c.id)}
                              title="Delete"
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 3, color: "#94A3B8" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{
            borderTop: "1px solid #E2E8F0", background: "#F8FAFC",
            padding: "8px 16px", fontSize: 12, color: "#94A3B8",
          }}>
            Showing {filtered.length} of {contacts.length} contacts
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SortableHeader({ label, col, onSort, icon }: { label: string; col: SortKey; onSort: (k: SortKey) => void; icon: React.ReactNode }) {
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.05em", color: "#94A3B8",
        background: "#F8FAFC", cursor: "pointer", userSelect: "none",
        borderBottom: "1px solid #E2E8F0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {icon}
      </div>
    </th>
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
