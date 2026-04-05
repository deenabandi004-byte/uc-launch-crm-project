import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeads, generateLeads, searchLeads, createLead, deleteLead } from "../services/api";
import { toast } from "sonner";
import {
  Target, Plus, Sparkles, Search, Trash2, ExternalLink,
  Loader2, Building2,
} from "lucide-react";

export default function LeadGeneration() {
  const queryClient = useQueryClient();
  const { data: leads = [], isLoading } = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newLead, setNewLead] = useState({ companyName: "", website: "", industry: "", location: "" });

  const generateMutation = useMutation({
    mutationFn: generateLeads,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`Generated ${data.length} leads!`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to generate leads"),
  });

  const searchMutation = useMutation({
    mutationFn: () => searchLeads(searchQuery),
    onSuccess: setSearchResults,
    onError: (err: any) => toast.error(err.message),
  });

  const addMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowAdd(false);
      setNewLead({ companyName: "", website: "", industry: "", location: "" });
      toast.success("Lead added!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead removed");
    },
  });

  const addFromSearch = (result: any) => {
    addMutation.mutate(result);
    setSearchResults(searchResults.filter((r) => r.website !== result.website));
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 48px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#0f2545", fontFamily: "'Libre Baskerville', Georgia, serif", margin: 0 }}>Lead Generation</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "4px 0 0" }}>Find and manage target companies</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              borderRadius: 3, border: "1px solid #E2E8F0", padding: "8px 16px",
              fontSize: 14, fontWeight: 500, background: "#fff", color: "#0f2545",
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
            }}
          >
            <Plus size={16} /> Add Manual
          </button>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              borderRadius: 3, border: "none", padding: "8px 16px",
              fontSize: 14, fontWeight: 500, background: "#0F172A", color: "#EDE9FE",
              cursor: "pointer", opacity: generateMutation.isPending ? 0.5 : 1,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {generateMutation.isPending ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Sparkles size={16} />
            )}
            AI Generate
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24, display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
          <input
            style={{
              width: "100%", borderRadius: 3, border: "1px solid #E2E8F0",
              padding: "10px 16px 10px 40px", fontSize: 14, outline: "none",
              fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
            }}
            placeholder="Search for companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchQuery && searchMutation.mutate()}
            onFocus={(e) => e.currentTarget.style.borderColor = "#7C3AED"}
            onBlur={(e) => e.currentTarget.style.borderColor = "#E2E8F0"}
          />
        </div>
        <button
          onClick={() => searchMutation.mutate()}
          disabled={!searchQuery || searchMutation.isPending}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            borderRadius: 3, border: "1px solid #E2E8F0", padding: "8px 16px",
            fontSize: 14, fontWeight: 500, background: "#F8FAFC", color: "#0f2545",
            cursor: "pointer", opacity: (!searchQuery || searchMutation.isPending) ? 0.5 : 1,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {searchMutation.isPending ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={16} />}
          Search
        </button>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div style={{ marginBottom: 24, borderRadius: 3, border: "1px solid #C4B5FD", background: "#F5F3FF", padding: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0f2545", margin: "0 0 12px" }}>Search Results</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {searchResults.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 3, background: "#fff", padding: 12, border: "1px solid #E2E8F0" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#0f2545" }}>{r.companyName}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{r.description?.slice(0, 100)}</div>
                </div>
                <button
                  onClick={() => addFromSearch(r)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    borderRadius: 3, border: "none", padding: "6px 12px",
                    fontSize: 12, fontWeight: 500, background: "#0F172A", color: "#EDE9FE",
                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add manual form */}
      {showAdd && (
        <div style={{ marginBottom: 24, borderRadius: 3, border: "1px solid #E2E8F0", background: "#fff", padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0f2545", margin: "0 0 12px" }}>Add Lead Manually</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(["companyName", "website", "industry", "location"] as const).map((field) => (
              <input
                key={field}
                style={{
                  borderRadius: 3, border: "1px solid #E2E8F0", padding: "8px 12px",
                  fontSize: 14, outline: "none", fontFamily: "'Inter', sans-serif",
                }}
                placeholder={field === "companyName" ? "Company Name" : field.charAt(0).toUpperCase() + field.slice(1)}
                value={newLead[field]}
                onChange={(e) => setNewLead({ ...newLead, [field]: e.target.value })}
                onFocus={(e) => e.currentTarget.style.borderColor = "#7C3AED"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#E2E8F0"}
              />
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => addMutation.mutate(newLead)}
              disabled={!newLead.companyName}
              style={{
                borderRadius: 3, border: "none", padding: "8px 16px",
                fontSize: 14, fontWeight: 500, background: "#0F172A", color: "#EDE9FE",
                cursor: "pointer", opacity: !newLead.companyName ? 0.5 : 1,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Add Lead
            </button>
            <button
              onClick={() => setShowAdd(false)}
              style={{
                borderRadius: 3, border: "none", padding: "8px 16px",
                fontSize: 14, background: "transparent", color: "#64748B",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Leads table */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 style={{ color: "#94A3B8", animation: "spin 1s linear infinite" }} />
        </div>
      ) : leads.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px dashed #E2E8F0", padding: "64px 0" }}>
          <Target style={{ color: "#D1D5DB", marginBottom: 12 }} size={40} />
          <h3 style={{ fontSize: 18, fontWeight: 500, color: "#0f2545", margin: "0 0 4px" }}>No leads yet</h3>
          <p style={{ fontSize: 14, color: "#94A3B8", margin: "0 0 16px" }}>
            Generate leads with AI or add companies manually
          </p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              borderRadius: 3, border: "none", padding: "8px 16px",
              fontSize: 14, fontWeight: 500, background: "#0F172A", color: "#EDE9FE",
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
            }}
          >
            <Sparkles size={16} /> Generate Leads
          </button>
        </div>
      ) : (
        <div style={{ borderRadius: 3, border: "1px solid #E2E8F0", background: "#fff", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em" }}>Company</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em" }}>Industry</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em" }}>Location</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em" }}>Size</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em" }}>Score</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead: any) => (
                <tr key={lead.id} style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Building2 size={14} style={{ color: "#94A3B8" }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#0f2545" }}>{lead.companyName}</div>
                        {lead.website && (
                          <a
                            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#7C3AED", textDecoration: "none" }}
                          >
                            {lead.domain || lead.website} <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 14, color: "#0f2545" }}>{lead.industry || "-"}</td>
                  <td style={{ padding: "10px 16px", fontSize: 14, color: "#0f2545" }}>{lead.location || "-"}</td>
                  <td style={{ padding: "10px 16px", fontSize: 14, color: "#0f2545" }}>{lead.employeeCount || "-"}</td>
                  <td style={{ padding: "10px 16px" }}>
                    {lead.relevanceScore ? (
                      <span style={{
                        borderRadius: 100, padding: "2px 8px", fontSize: 10, fontWeight: 600,
                        background: lead.relevanceScore >= 8 ? "#DCFCE7" : lead.relevanceScore >= 5 ? "#FEF9C3" : "#F1F5F9",
                        color: lead.relevanceScore >= 8 ? "#15803D" : lead.relevanceScore >= 5 ? "#A16207" : "#64748B",
                      }}>
                        {lead.relevanceScore}/10
                      </span>
                    ) : "-"}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => deleteMutation.mutate(lead.id)}
                      style={{ background: "none", border: "none", borderRadius: 3, padding: 4, color: "#94A3B8", cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
