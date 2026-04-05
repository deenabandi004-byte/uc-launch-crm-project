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

  const primaryBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 3,
    background: "#0F172A",
    color: "#EDE9FE",
    padding: "10px 24px",
    fontSize: 13,
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 400,
    borderRadius: 3,
    border: "1px solid #E2E8F0",
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    fontFamily: "'Inter', sans-serif",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#0f2545",
    marginBottom: 8,
  };

  const stepLabels = ["Select Contacts", "Generate Drafts", "Review & Send"];
  const currentStepIndex = step === "select" ? 0 : step === "generate" ? 1 : step === "review" || step === "sent" ? 2 : 0;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 48px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: "#0f2545", fontFamily: "'Libre Baskerville', Georgia, serif", margin: 0 }}>
          Campaign Compose
        </h1>
        <p style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>Create and send personalized email campaigns</p>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
        {stepLabels.map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: "50%", fontSize: 12, fontWeight: 600,
              background: i <= currentStepIndex ? "#7C3AED" : "#F1F5F9",
              color: i <= currentStepIndex ? "#fff" : "#94A3B8",
            }}>
              {i < currentStepIndex ? <Check size={14} /> : i + 1}
            </div>
            <span style={{
              fontSize: 13,
              fontWeight: i <= currentStepIndex ? 600 : 400,
              color: i <= currentStepIndex ? "#0f2545" : "#94A3B8",
            }}>
              {label}
            </span>
            {i < 2 && <div style={{ width: 32, height: 1, background: "#E2E8F0" }} />}
          </div>
        ))}
      </div>

      {step === "select" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Campaign Name */}
          <div>
            <label style={labelStyle}>Campaign Name (optional)</label>
            <input
              style={inputStyle}
              placeholder="e.g., Q2 SaaS Outreach"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          {/* Template Select */}
          <div>
            <label style={labelStyle}>Email Template</label>
            <select
              style={{ ...inputStyle, appearance: "auto" }}
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">Select a template...</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Contact Selection */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Select Contacts ({selectedContacts.length} selected)
              </label>
              <button
                onClick={selectAll}
                style={{ background: "none", border: "none", fontSize: 12, color: "#7C3AED", cursor: "pointer", fontWeight: 500 }}
              >
                {selectedContacts.length === contactsWithEmail.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            {contactsWithEmail.length === 0 ? (
              <p style={{ fontSize: 13, color: "#64748B" }}>No contacts with email addresses. Find contacts first.</p>
            ) : (
              <div style={{
                maxHeight: 288, overflowY: "auto",
                border: "1px solid #E2E8F0", borderRadius: 3, padding: 8,
                background: "#fff",
              }}>
                {contactsWithEmail.map((c: any) => (
                  <label
                    key={c.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "8px 12px", borderRadius: 3, cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FAFBFF"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(c.id)}
                      onChange={() => toggleContact(c.id)}
                      style={{ width: 16, height: 16, accentColor: "#7C3AED" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#0f2545" }}>{c.firstName} {c.lastName}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>{c.jobTitle} at {c.company}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{c.email}</div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={selectedContacts.length === 0 || !selectedTemplate || createMutation.isPending}
              style={{
                ...primaryBtnStyle,
                opacity: (selectedContacts.length === 0 || !selectedTemplate || createMutation.isPending) ? 0.5 : 1,
              }}
            >
              {createMutation.isPending ? (
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Sparkles size={16} />
              )}
              Generate Personalized Emails
            </button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0f2545", margin: 0 }}>Review Drafts ({drafts.length})</h3>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              style={{ ...primaryBtnStyle, opacity: sendMutation.isPending ? 0.5 : 1 }}
            >
              {sendMutation.isPending ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={16} />}
              Send All ({drafts.filter((d) => d.status === "draft").length} emails)
            </button>
          </div>

          {drafts.map((draft, i) => (
            <div
              key={i}
              style={{
                background: draft.status === "error" ? "#FEF2F2" : "#fff",
                border: draft.status === "error" ? "1px solid #FECACA" : "1px solid #E2E8F0",
                borderRadius: 3, padding: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {draft.status === "error" ? (
                    <AlertCircle size={16} style={{ color: "#DC2626" }} />
                  ) : (
                    <Mail size={16} style={{ color: "#94A3B8" }} />
                  )}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0f2545" }}>{draft.contactName}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{draft.contactEmail}</div>
                  </div>
                </div>
              </div>
              {draft.status === "error" ? (
                <p style={{ marginTop: 8, fontSize: 13, color: "#DC2626" }}>{draft.error}</p>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Subject</div>
                  <div style={{ fontSize: 13, color: "#0f2545", marginTop: 2 }}>{draft.subject}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 12 }}>Body</div>
                  <div style={{
                    marginTop: 4, whiteSpace: "pre-wrap", background: "#F8FAFC",
                    borderRadius: 3, padding: 12, fontSize: 13, color: "#334155", lineHeight: 1.6,
                  }}>
                    {draft.body}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {step === "sent" && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: "#DCFCE7",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
          }}>
            <Check size={32} style={{ color: "#15803D" }} />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0f2545", margin: 0 }}>Campaign Sent!</h3>
          <p style={{ color: "#64748B", fontSize: 13, marginTop: 4, marginBottom: 24 }}>Your emails are on their way</p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => {
                setStep("select");
                setSelectedContacts([]);
                setSelectedTemplate("");
                setDrafts([]);
                setCampaignId("");
              }}
              style={{
                borderRadius: 3, border: "1px solid #E2E8F0", padding: "8px 16px",
                fontSize: 13, background: "#fff", cursor: "pointer", color: "#0f2545",
              }}
            >
              New Campaign
            </button>
            <a
              href="/pipeline"
              style={{
                borderRadius: 3, background: "#0F172A", color: "#EDE9FE",
                padding: "8px 16px", fontSize: 13, fontWeight: 500, textDecoration: "none",
                display: "inline-flex", alignItems: "center",
              }}
            >
              View Pipeline
            </a>
          </div>
        </div>
      )}

      {/* Past campaigns */}
      {campaigns.length > 0 && step === "select" && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0f2545", marginBottom: 12, marginTop: 0 }}>Past Campaigns</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {campaigns.map((c: any) => (
              <div
                key={c.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "#fff", border: "1px solid #E2E8F0", borderRadius: 3, padding: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#0f2545" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                    {c.sentCount} sent &middot; {c.status} &middot; {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span style={{
                  borderRadius: 100, padding: "3px 10px", fontSize: 10, fontWeight: 600,
                  background: c.status === "sent" ? "#DCFCE7" : "#F1F5F9",
                  color: c.status === "sent" ? "#15803D" : "#64748B",
                }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
