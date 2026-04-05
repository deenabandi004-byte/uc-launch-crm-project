import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getContacts, getEmailTemplates, getCampaigns,
  createCampaign, generateDrafts, sendCampaign,
} from "../services/api";
import { toast } from "sonner";
import { Send, Loader2, Mail, Check, AlertCircle, Sparkles, ArrowRight } from "lucide-react";

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

  const stepLabels = ["Select Contacts", "Generate Drafts", "Review & Send"];
  const currentStep = step === "select" ? 0 : step === "generate" ? 1 : 2;

  return (
    <div className="cc-root">
      {/* Header */}
      <div className="cc-header">
        <div>
          <h1 className="cc-title">Campaigns</h1>
          <p className="cc-subtitle">Create and send personalized email campaigns</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="cc-stepper">
        {stepLabels.map((label, i) => (
          <div key={label} className="cc-step">
            <div className={`cc-step-dot ${i <= currentStep ? "cc-step-dot--active" : ""}`}>
              {i < currentStep ? <Check size={14} /> : i + 1}
            </div>
            <span className={`cc-step-label ${i <= currentStep ? "cc-step-label--active" : ""}`}>
              {label}
            </span>
            {i < 2 && <div className={`cc-step-line ${i < currentStep ? "cc-step-line--done" : ""}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select */}
      {step === "select" && (
        <div className="cc-form">
          <div className="cc-field">
            <label className="cc-label">Campaign Name (optional)</label>
            <input
              className="cc-input"
              placeholder="e.g., Q2 SaaS Outreach"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          <div className="cc-field">
            <label className="cc-label">Email Template</label>
            <select
              className="cc-input cc-select-input"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">Select a template...</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="cc-hint">
                No templates yet. <a href="/templates" className="cc-hint-link">Create one first</a>
              </p>
            )}
          </div>

          <div className="cc-field">
            <div className="cc-field-header">
              <label className="cc-label">
                Select Contacts ({selectedContacts.length} selected)
              </label>
              <button onClick={selectAll} className="cc-text-btn">
                {selectedContacts.length === contactsWithEmail.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            {contactsWithEmail.length === 0 ? (
              <p className="cc-hint">No contacts with email addresses. Find contacts first.</p>
            ) : (
              <div className="cc-contact-list">
                {contactsWithEmail.map((c: any) => (
                  <label key={c.id} className="cc-contact-row">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(c.id)}
                      onChange={() => toggleContact(c.id)}
                      className="cc-checkbox"
                    />
                    <div className="cc-contact-avatar">{(c.firstName || "?")[0]}</div>
                    <div className="cc-contact-info">
                      <span className="cc-contact-name">{c.firstName} {c.lastName}</span>
                      <span className="cc-contact-meta">{c.jobTitle} at {c.company}</span>
                    </div>
                    <span className="cc-contact-email">{c.email}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => createMutation.mutate()}
            disabled={selectedContacts.length === 0 || !selectedTemplate || createMutation.isPending}
            className="cc-primary-btn"
          >
            {createMutation.isPending ? <Loader2 size={16} className="cc-spin" /> : <Sparkles size={16} />}
            Generate Personalized Emails
          </button>
        </div>
      )}

      {/* Step 2: Review */}
      {step === "review" && (
        <div className="cc-review">
          <div className="cc-review-header">
            <h3 className="cc-review-title">Review Drafts ({drafts.length})</h3>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="cc-primary-btn"
            >
              {sendMutation.isPending ? <Loader2 size={16} className="cc-spin" /> : <Send size={16} />}
              Send All ({drafts.filter((d) => d.status === "draft").length})
            </button>
          </div>

          <div className="cc-draft-list">
            {drafts.map((draft, i) => (
              <div key={i} className={`cc-draft-card ${draft.status === "error" ? "cc-draft-card--error" : ""}`}>
                <div className="cc-draft-to">
                  {draft.status === "error" ? (
                    <AlertCircle size={16} className="cc-icon-error" />
                  ) : (
                    <Mail size={16} className="cc-icon-muted" />
                  )}
                  <div>
                    <div className="cc-draft-name">{draft.contactName}</div>
                    <div className="cc-draft-email">{draft.contactEmail}</div>
                  </div>
                </div>
                {draft.status === "error" ? (
                  <p className="cc-draft-error">{draft.error}</p>
                ) : (
                  <div className="cc-draft-body">
                    <div className="cc-draft-field-label">Subject</div>
                    <div className="cc-draft-field-value">{draft.subject}</div>
                    <div className="cc-draft-field-label" style={{ marginTop: 10 }}>Body</div>
                    <div className="cc-draft-preview">{draft.body}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Sent */}
      {step === "sent" && (
        <div className="cc-sent">
          <div className="cc-sent-icon-wrap">
            <Check size={32} />
          </div>
          <h3 className="cc-sent-title">Campaign Sent!</h3>
          <p className="cc-sent-desc">Your emails are on their way</p>
          <div className="cc-sent-actions">
            <button
              onClick={() => {
                setStep("select");
                setSelectedContacts([]);
                setSelectedTemplate("");
                setDrafts([]);
                setCampaignId("");
              }}
              className="cc-outline-btn"
            >
              New Campaign
            </button>
            <a href="/pipeline" className="cc-primary-btn cc-primary-link">
              View Pipeline <ArrowRight size={14} />
            </a>
          </div>
        </div>
      )}

      {/* Past campaigns */}
      {campaigns.length > 0 && step === "select" && (
        <div className="cc-past">
          <h3 className="cc-past-title">Past Campaigns</h3>
          <div className="cc-past-list">
            {campaigns.map((c: any) => (
              <div key={c.id} className="cc-past-row">
                <div>
                  <div className="cc-past-name">{c.name}</div>
                  <div className="cc-past-meta">
                    {c.sentCount} sent &middot; {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={`cc-past-badge ${c.status === "sent" ? "cc-past-badge--sent" : ""}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .cc-root {
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
          max-width: 960px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
          color: var(--text);
        }

        .cc-header { margin-bottom: 28px; }
        .cc-title { font-size: 24px; font-weight: 700; letter-spacing: -.4px; margin: 0 0 4px; }
        .cc-subtitle { font-size: 14px; color: var(--text2); margin: 0; }

        /* Stepper */
        .cc-stepper {
          display: flex;
          align-items: center;
          gap: 0;
          margin-bottom: 32px;
        }
        .cc-step {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cc-step-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          background: #f3f2f8;
          color: var(--text3);
          flex-shrink: 0;
        }
        .cc-step-dot--active { background: var(--accent); color: #fff; }
        .cc-step-label { font-size: 13px; color: var(--text3); font-weight: 500; white-space: nowrap; }
        .cc-step-label--active { color: var(--text); }
        .cc-step-line {
          width: 40px;
          height: 2px;
          background: #f3f2f8;
          margin: 0 8px;
          border-radius: 2px;
        }
        .cc-step-line--done { background: var(--accent); }

        /* Form */
        .cc-form { display: flex; flex-direction: column; gap: 24px; }
        .cc-field { display: flex; flex-direction: column; gap: 8px; }
        .cc-field-header { display: flex; justify-content: space-between; align-items: center; }
        .cc-label { font-size: 13px; font-weight: 600; color: var(--text); }
        .cc-input {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--border);
          font-size: 13px;
          color: var(--text);
          background: var(--card);
          outline: none;
          max-width: 480px;
          box-shadow: var(--shadow);
          transition: border-color .15s;
        }
        .cc-input:focus { border-color: var(--accent); }
        .cc-select-input { cursor: pointer; }
        .cc-hint { font-size: 12px; color: var(--text3); margin: 0; }
        .cc-hint-link { color: var(--accent); text-decoration: none; }
        .cc-hint-link:hover { text-decoration: underline; }

        .cc-text-btn {
          background: none;
          border: none;
          font-size: 12px;
          font-weight: 500;
          color: var(--accent);
          cursor: pointer;
          padding: 0;
        }
        .cc-text-btn:hover { text-decoration: underline; }

        .cc-contact-list {
          max-height: 320px;
          overflow-y: auto;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }
        .cc-contact-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          cursor: pointer;
          transition: background .12s;
          border-bottom: 1px solid var(--border);
        }
        .cc-contact-row:last-child { border-bottom: none; }
        .cc-contact-row:hover { background: #faf8fe; }
        .cc-checkbox {
          width: 16px;
          height: 16px;
          accent-color: var(--accent);
          flex-shrink: 0;
        }
        .cc-contact-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--accent-light);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .cc-contact-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .cc-contact-name { font-size: 13px; font-weight: 500; }
        .cc-contact-meta { font-size: 11px; color: var(--text3); }
        .cc-contact-email { font-size: 12px; color: var(--text3); white-space: nowrap; }

        .cc-primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 11px 24px;
          border-radius: 100px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background .15s;
          white-space: nowrap;
          text-decoration: none;
        }
        .cc-primary-btn:hover { background: #6d28d9; }
        .cc-primary-btn:disabled { opacity: .5; cursor: default; }
        .cc-primary-link { text-decoration: none; }

        .cc-outline-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          border-radius: 100px;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--text);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color .15s;
        }
        .cc-outline-btn:hover { border-color: var(--accent); }

        .cc-spin { animation: cc-spin 1s linear infinite; }
        @keyframes cc-spin { to { transform: rotate(360deg); } }

        /* Review */
        .cc-review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .cc-review-title { font-size: 18px; font-weight: 600; margin: 0; }
        .cc-draft-list { display: flex; flex-direction: column; gap: 14px; }
        .cc-draft-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
          box-shadow: var(--shadow);
        }
        .cc-draft-card--error { border-color: #fecaca; background: #fef2f2; }
        .cc-draft-to { display: flex; align-items: center; gap: 10px; }
        .cc-icon-error { color: #dc2626; }
        .cc-icon-muted { color: var(--text3); }
        .cc-draft-name { font-size: 13px; font-weight: 600; }
        .cc-draft-email { font-size: 12px; color: var(--text3); }
        .cc-draft-error { font-size: 13px; color: #dc2626; margin: 10px 0 0; }
        .cc-draft-body { margin-top: 14px; }
        .cc-draft-field-label { font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: .5px; }
        .cc-draft-field-value { font-size: 14px; margin-top: 2px; }
        .cc-draft-preview {
          margin-top: 4px;
          padding: 14px;
          background: #f8f7fc;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
          color: var(--text2);
        }

        /* Sent */
        .cc-sent {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 64px 16px;
          text-align: center;
        }
        .cc-sent-icon-wrap {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #dcfce7;
          color: #059669;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .cc-sent-title { font-size: 22px; font-weight: 700; margin: 0 0 6px; }
        .cc-sent-desc { font-size: 14px; color: var(--text2); margin: 0 0 24px; }
        .cc-sent-actions { display: flex; gap: 12px; }

        /* Past campaigns */
        .cc-past { margin-top: 40px; }
        .cc-past-title { font-size: 16px; font-weight: 600; margin: 0 0 14px; }
        .cc-past-list { display: flex; flex-direction: column; gap: 8px; }
        .cc-past-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px 18px;
          box-shadow: var(--shadow);
        }
        .cc-past-name { font-size: 13px; font-weight: 600; }
        .cc-past-meta { font-size: 12px; color: var(--text3); margin-top: 2px; }
        .cc-past-badge {
          font-size: 11px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 100px;
          background: #f3f2f8;
          color: var(--text2);
          text-transform: capitalize;
        }
        .cc-past-badge--sent { background: #dcfce7; color: #059669; }

        @media (max-width: 768px) {
          .cc-root { padding: 24px 16px; }
          .cc-stepper { flex-wrap: wrap; gap: 8px; }
          .cc-step-line { display: none; }
          .cc-input { max-width: 100%; }
          .cc-primary-btn { width: 100%; justify-content: center; }
          .cc-sent-actions { flex-direction: column; width: 100%; }
          .cc-outline-btn, .cc-primary-link { width: 100%; justify-content: center; text-align: center; }
        }
      `}</style>
    </div>
  );
}
