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
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Generation</h1>
          <p className="text-muted-foreground">Find and manage target companies</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            <Plus size={16} /> Add Manual
          </button>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {generateMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            AI Generate
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-lg border border-border py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Search for companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchQuery && searchMutation.mutate()}
          />
        </div>
        <button
          onClick={() => searchMutation.mutate()}
          disabled={!searchQuery || searchMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
        >
          {searchMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Search
        </button>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-3 text-sm font-medium text-blue-900">Search Results</h3>
          <div className="space-y-2">
            {searchResults.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white p-3">
                <div>
                  <div className="text-sm font-medium">{r.companyName}</div>
                  <div className="text-xs text-muted-foreground">{r.description?.slice(0, 100)}</div>
                </div>
                <button
                  onClick={() => addFromSearch(r)}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
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
        <div className="mb-6 rounded-xl border border-border p-4">
          <h3 className="mb-3 text-sm font-medium">Add Lead Manually</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Company Name"
              value={newLead.companyName}
              onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
            />
            <input
              className="rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Website"
              value={newLead.website}
              onChange={(e) => setNewLead({ ...newLead, website: e.target.value })}
            />
            <input
              className="rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Industry"
              value={newLead.industry}
              onChange={(e) => setNewLead({ ...newLead, industry: e.target.value })}
            />
            <input
              className="rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Location"
              value={newLead.location}
              onChange={(e) => setNewLead({ ...newLead, location: e.target.value })}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => addMutation.mutate(newLead)}
              disabled={!newLead.companyName}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              Add Lead
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Leads table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Target className="mb-3 text-muted-foreground" size={40} />
          <h3 className="text-lg font-medium">No leads yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Generate leads with AI or add companies manually
          </p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Sparkles size={16} /> Generate Leads
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Industry</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Score</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead: any) => (
                <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{lead.companyName}</div>
                        {lead.website && (
                          <a
                            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            {lead.domain || lead.website} <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{lead.industry || "-"}</td>
                  <td className="px-4 py-3 text-sm">{lead.location || "-"}</td>
                  <td className="px-4 py-3 text-sm">{lead.employeeCount || "-"}</td>
                  <td className="px-4 py-3">
                    {lead.relevanceScore ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        lead.relevanceScore >= 8 ? "bg-green-100 text-green-700" :
                        lead.relevanceScore >= 5 ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {lead.relevanceScore}/10
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteMutation.mutate(lead.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
