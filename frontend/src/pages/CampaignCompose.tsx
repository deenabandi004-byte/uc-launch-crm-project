import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getContacts, getEmailTemplates, getCampaigns,
  createCampaign, generateDrafts, sendCampaign,
} from "../services/api";
import { toast } from "sonner";
import { Send, Loader2, Mail, Check, AlertCircle, Sparkles } from "lucide-react";

export default function CampaignCompose() {
  const queryClient = useQueryClient();
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: getContacts });
  const { data: templates = [] } = useQuery({ queryKey: ["templates"], queryFn: getEmailTemplates });
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: getCampaigns });

  const [step, setStep] = useState<"select" | "generate" | "review" | "sent">("select");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [drafts, setDrafts] = useState<any[]>([]);
  const [campaignName, setCampaignName] = useState("");

  const contactsWithEmail = contacts.filter((c: any) => c.email);

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedContacts.length === contactsWithEmail.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contactsWithEmail.map((c: any) => c.id));
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const campaign = await createCampaign({
        name: campaignName || undefined,
        templateId: selectedTemplate,
        contactIds: selectedContacts,
      });
      setCampaignId(campaign.id);
      const generatedDrafts = await generateDrafts(campaign.id);
      setDrafts(generatedDrafts);
      return generatedDrafts;
    },
    onSuccess: () => {
      setStep("review");
      toast.success("Drafts generated! Review before sending.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to generate drafts"),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendCampaign(campaignId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      setStep("sent");
      toast.success(`${data.sentCount} emails sent!`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to send"),
  });

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6">
        <p className="text-muted-foreground">Create and send personalized email campaigns</p>
      </div>

      {/* Progress */}
      <div className="mb-8 flex gap-2">
        {["Select Contacts", "Generate Drafts", "Review & Send"].map((label, i) => {
          const stepIndex = i;
          const current = step === "select" ? 0 : step === "generate" ? 1 : step === "review" || step === "sent" ? 2 : 0;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                stepIndex <= current ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}>
                {stepIndex < current ? <Check size={14} /> : stepIndex + 1}
              </div>
              <span className={`text-sm ${stepIndex <= current ? "font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < 2 && <div className="h-px w-8 bg-border" />}
            </div>
          );
        })}
      </div>

      {step === "select" && (
        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium">Campaign Name (optional)</label>
            <input
              className="w-full max-w-md rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="e.g., Q2 SaaS Outreach"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Email Template</label>
            <select
              className="w-full max-w-md rounded-lg border border-border px-3 py-2 text-sm"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">Select a template...</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">
                Select Contacts ({selectedContacts.length} selected)
              </label>
              <button onClick={selectAll} className="text-xs text-primary hover:underline">
                {selectedContacts.length === contactsWithEmail.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            {contactsWithEmail.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts with email addresses. Find contacts first.</p>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {contactsWithEmail.map((c: any) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(c.id)}
                      onChange={() => toggleContact(c.id)}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{c.firstName} {c.lastName}</div>
                      <div className="text-xs text-muted-foreground">{c.jobTitle} at {c.company}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => createMutation.mutate()}
            disabled={selectedContacts.length === 0 || !selectedTemplate || createMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Generate Personalized Emails
          </button>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Review Drafts ({drafts.length})</h3>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {sendMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Send All ({drafts.filter((d) => d.status === "draft").length} emails)
            </button>
          </div>

          {drafts.map((draft, i) => (
            <div key={i} className={`rounded-xl border p-4 ${draft.status === "error" ? "border-red-200 bg-red-50" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {draft.status === "error" ? (
                    <AlertCircle size={16} className="text-red-600" />
                  ) : (
                    <Mail size={16} className="text-muted-foreground" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{draft.contactName}</div>
                    <div className="text-xs text-muted-foreground">{draft.contactEmail}</div>
                  </div>
                </div>
              </div>
              {draft.status === "error" ? (
                <p className="mt-2 text-sm text-red-600">{draft.error}</p>
              ) : (
                <div className="mt-3">
                  <div className="text-xs font-medium text-muted-foreground">Subject</div>
                  <div className="text-sm">{draft.subject}</div>
                  <div className="mt-2 text-xs font-medium text-muted-foreground">Body</div>
                  <div className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{draft.body}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {step === "sent" && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="text-green-600" size={32} />
          </div>
          <h3 className="text-xl font-bold">Campaign Sent!</h3>
          <p className="mb-6 text-muted-foreground">Your emails are on their way</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("select");
                setSelectedContacts([]);
                setSelectedTemplate("");
                setDrafts([]);
                setCampaignId("");
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              New Campaign
            </button>
            <a href="/pipeline" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
              View Pipeline
            </a>
          </div>
        </div>
      )}

      {/* Past campaigns */}
      {campaigns.length > 0 && step === "select" && (
        <div className="mt-8">
          <h3 className="mb-3 text-lg font-medium">Past Campaigns</h3>
          <div className="space-y-2">
            {campaigns.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.sentCount} sent · {c.status} · {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.status === "sent" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
