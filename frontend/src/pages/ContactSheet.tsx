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

const STAGE_COLORS: Record<string, string> = {
  interested: "bg-teal-100 text-teal-700",
  contacted: "bg-blue-100 text-blue-700",
  approved: "bg-amber-100 text-amber-700",
  complete: "bg-green-100 text-green-700",
  paid: "bg-emerald-100 text-emerald-700",
  estimate_sent: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-orange-100 text-orange-700",
  not_interested: "bg-red-100 text-red-700",
};

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
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contact Sheet</h1>
          <p className="text-muted-foreground">{contacts.length} contacts</p>
        </div>
        <div className="flex gap-2">
          {/* CSV Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary"
          >
            <Download size={16} /> Export
          </button>
          {/* CSV Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          {/* Enrich phones */}
          {contacts.some((c: any) => !c.phone) && (
            <button
              onClick={() => enrichMutation.mutate()}
              disabled={enrichMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {enrichMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
              Add Phones
            </button>
          )}
          <button
            onClick={() => setFindingContacts(!findingContacts)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <UserPlus size={16} /> Find Contacts
          </button>
        </div>
      </div>

      {/* Find contacts panel */}
      {findingContacts && (
        <div className="mb-6 rounded-xl border border-border p-4">
          <h3 className="mb-3 text-sm font-medium">Find contacts at a company</h3>
          <div className="flex gap-2">
            <select
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
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
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {findMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Find
            </button>
          </div>
          {leads.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No leads yet. Generate leads first from the Leads page.
            </p>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full rounded-lg border border-border py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
          placeholder="Search contacts by name, company, title, email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Users className="mb-3 text-muted-foreground" size={40} />
          <h3 className="text-lg font-medium">No contacts yet</h3>
          <p className="text-sm text-muted-foreground">Find contacts at your target companies or import a CSV</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <SortableHeader label="Name" col="name" onSort={handleSort} icon={<SortIcon col="name" />} />
                <SortableHeader label="Title" col="jobTitle" onSort={handleSort} icon={<SortIcon col="jobTitle" />} />
                <SortableHeader label="Company" col="company" onSort={handleSort} icon={<SortIcon col="company" />} />
                <SortableHeader label="Email" col="email" onSort={handleSort} icon={<SortIcon col="email" />} />
                <SortableHeader label="Phone" col="phone" onSort={handleSort} icon={<SortIcon col="phone" />} />
                <SortableHeader label="Stage" col="pipelineStage" onSort={handleSort} icon={<SortIcon col="pipelineStage" />} />
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  {editingId === c.id ? (
                    <>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <input
                            className="w-20 rounded border border-border px-1.5 py-1 text-sm"
                            value={editData.firstName}
                            onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                            placeholder="First"
                          />
                          <input
                            className="w-20 rounded border border-border px-1.5 py-1 text-sm"
                            value={editData.lastName}
                            onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                            placeholder="Last"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          className="w-full rounded border border-border px-1.5 py-1 text-sm"
                          value={editData.jobTitle}
                          onChange={(e) => setEditData({ ...editData, jobTitle: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          className="w-full rounded border border-border px-1.5 py-1 text-sm"
                          value={editData.company}
                          onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          className="w-full rounded border border-border px-1.5 py-1 text-sm"
                          value={editData.email}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          className="w-full rounded border border-border px-1.5 py-1 text-sm"
                          value={editData.phone}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-2">—</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={saveEdit} disabled={updateMutation.isPending} className="rounded p-1 text-green-600 hover:bg-green-50">
                            {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button onClick={cancelEdit} className="rounded p-1 text-muted-foreground hover:bg-muted">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-medium">
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm">{c.jobTitle || "—"}</td>
                      <td className="px-4 py-3 text-sm">{c.company || "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        {c.email ? (
                          <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-purple-600 hover:underline">
                            <Mail size={12} /> {c.email}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {c.phone ? (
                          <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-purple-600 hover:underline">
                            <Phone size={12} /> {c.phone}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          STAGE_COLORS[c.pipelineStage] || "bg-gray-100 text-gray-600"
                        }`}>
                          {!c.pipelineStage || c.pipelineStage === "none" ? "New Lead" : c.pipelineStage?.replace(/_/g, " ") || "New Lead"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(c)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          {c.linkedinUrl && (
                            <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-muted-foreground hover:text-purple-600">
                              <Linkedin size={14} />
                            </a>
                          )}
                          <button
                            onClick={() => deleteMutation.mutate(c.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Delete"
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
          <div className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            Showing {filtered.length} of {contacts.length} contacts
          </div>
        </div>
      )}
    </div>
  );
}

function SortableHeader({ label, col, onSort, icon }: { label: string; col: SortKey; onSort: (k: SortKey) => void; icon: React.ReactNode }) {
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground hover:text-foreground"
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
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
