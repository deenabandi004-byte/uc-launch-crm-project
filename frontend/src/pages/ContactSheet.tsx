import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContacts, getLeads, findContacts, deleteContact, updateContact } from "../services/api";
import { toast } from "sonner";
import {
  Users, Search, Trash2, Loader2, UserPlus, ExternalLink,
  Mail, Linkedin,
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
      `${c.firstName} ${c.lastName} ${c.company} ${c.jobTitle}`
        .toLowerCase()
        .includes(filter.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contact Sheet</h1>
          <p className="text-muted-foreground">{contacts.length} contacts</p>
        </div>
        <button
          onClick={() => setFindingContacts(!findingContacts)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <UserPlus size={16} /> Find Contacts
        </button>
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
          placeholder="Filter contacts..."
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
          <p className="text-sm text-muted-foreground">Find contacts at your target companies</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Stage</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm">{c.jobTitle || "-"}</td>
                  <td className="px-4 py-3 text-sm">{c.company || "-"}</td>
                  <td className="px-4 py-3 text-sm">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                        <Mail size={12} /> {c.email}
                      </a>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.pipelineStage === "replied" ? "bg-green-100 text-green-700" :
                      c.pipelineStage === "no_response" ? "bg-yellow-100 text-yellow-700" :
                      c.pipelineStage === "won" ? "bg-emerald-100 text-emerald-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {c.pipelineStage === "none" ? "Not contacted" : c.pipelineStage?.replace(/_/g, " ") || "Not contacted"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {c.linkedinUrl && (
                        <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-muted-foreground hover:text-blue-600">
                          <Linkedin size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(c.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
