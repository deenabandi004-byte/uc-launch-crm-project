import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getContacts,
  getEmailTemplates,
  getSequences,
  createSequence,
  updateSequence,
  deleteSequence,
  startSequence,
  executeSequenceStep,
  getSequenceStatus,
} from "../services/api";
import { toast } from "sonner";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Loader2,
  ChevronRight,
  X,
  Zap,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  SkipForward,
} from "lucide-react";

interface Step {
  templateId: string;
  delayDays: number;
  subject: string;
}

const font = "'Inter', sans-serif";
const serifFont = "'Libre Baskerville', Georgia, serif";

export default function Sequences() {
  const queryClient = useQueryClient();
  const { data: sequences = [] } = useQuery({ queryKey: ["sequences"], queryFn: getSequences });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: getContacts });
  const { data: templates = [] } = useQuery({ queryKey: ["templates"], queryFn: getEmailTemplates });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [steps, setSteps] = useState<Step[]>([{ templateId: "", delayDays: 0, subject: "" }]);

  const contactsWithEmail = contacts.filter((c: any) => c.email);

  const resetForm = () => {
    setName("");
    setSelectedContacts([]);
    setSteps([{ templateId: "", delayDays: 0, subject: "" }]);
    setEditingId(null);
    setShowForm(false);
  };

  const openEditForm = (seq: any) => {
    setName(seq.name || "");
    setSelectedContacts(seq.contactIds || []);
    setSteps(
      seq.steps && seq.steps.length > 0
        ? seq.steps.map((s: any) => ({ templateId: s.templateId || "", delayDays: s.delayDays || 0, subject: s.subject || "" }))
        : [{ templateId: "", delayDays: 0, subject: "" }]
    );
    setEditingId(seq.id);
    setShowForm(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => (editingId ? updateSequence(editingId, data) : createSequence(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success(editingId ? "Sequence updated!" : "Sequence created!");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to save sequence"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSequence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sequence deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete"),
  });

  const startMutation = useMutation({
    mutationFn: startSequence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sequence started!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to start"),
  });

  const executeMutation = useMutation({
    mutationFn: executeSequenceStep,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`Sent: ${data.sent}, Skipped: ${data.skipped}, Steps remaining: ${data.remaining}`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to execute step"),
  });

  const pauseResumeMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateSequence(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sequence updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update"),
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a sequence name");
      return;
    }
    if (selectedContacts.length === 0) {
      toast.error("Please select at least one contact");
      return;
    }
    if (steps.some((s) => !s.templateId)) {
      toast.error("Please select a template for each step");
      return;
    }
    createMutation.mutate({ name, contactIds: selectedContacts, steps });
  };

  const addStep = () => {
    setSteps([...steps, { templateId: "", delayDays: steps.length > 0 ? 3 : 0, subject: "" }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof Step, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllContacts = () => {
    if (selectedContacts.length === contactsWithEmail.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contactsWithEmail.map((c: any) => c.id));
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      draft: { bg: "#F1F5F9", color: "#64748B" },
      active: { bg: "#F5F3FF", color: "#7C3AED" },
      paused: { bg: "#FEF3C7", color: "#B45309" },
      completed: { bg: "#F0FDF4", color: "#16A34A" },
    };
    const s = colors[status] || colors.draft;
    return (
      <span style={{ borderRadius: 100, padding: "2px 8px", fontSize: 10, fontWeight: 600, background: s.bg, color: s.color }}>
        {status}
      </span>
    );
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: 3,
    padding: 24,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 3,
    border: "1px solid #E2E8F0",
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: font,
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 500,
    color: "#0f2545",
    fontFamily: font,
  };

  const smallLabelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 4,
    fontSize: 11,
    color: "#64748B",
    fontFamily: font,
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 48px", fontFamily: font }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#0f2545", fontFamily: serifFont, margin: 0 }}>Sequences</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0" }}>Create multi-step follow-up campaigns</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{
            display: "flex", alignItems: "center", gap: 8, borderRadius: 3,
            background: "#0F172A", color: "#EDE9FE", padding: "10px 16px",
            fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: font,
          }}
        >
          <Plus size={16} />
          Create Sequence
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div style={{ ...cardStyle, marginBottom: 32 }}>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0f2545", margin: 0 }}>{editingId ? "Edit Sequence" : "New Sequence"}</h2>
            <button onClick={resetForm} style={{ borderRadius: 3, padding: 4, border: "none", background: "transparent", cursor: "pointer" }}>
              <X size={18} color="#64748B" />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>Sequence Name</label>
              <input
                style={{ ...inputStyle, maxWidth: 400 }}
                placeholder="e.g., 3-Day Follow-up"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Steps Builder */}
            <div>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Steps</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {steps.map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, borderRadius: 3, border: "1px solid #E2E8F0", padding: 12 }}>
                    <div style={{
                      width: 28, height: 28, flexShrink: 0, borderRadius: 3,
                      background: "#F5F3FF", color: "#7C3AED",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 600,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={smallLabelStyle}>Template</label>
                          <select
                            style={inputStyle}
                            value={step.templateId}
                            onChange={(e) => updateStep(i, "templateId", e.target.value)}
                          >
                            <option value="">Select template...</option>
                            {templates.map((t: any) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ width: 128 }}>
                          <label style={smallLabelStyle}>Delay (days)</label>
                          <input
                            type="number"
                            min={0}
                            style={inputStyle}
                            value={step.delayDays}
                            onChange={(e) => updateStep(i, "delayDays", parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={smallLabelStyle}>Subject override (optional)</label>
                        <input
                          style={inputStyle}
                          placeholder="Leave empty to use template subject"
                          value={step.subject}
                          onChange={(e) => updateStep(i, "subject", e.target.value)}
                        />
                      </div>
                    </div>
                    {steps.length > 1 && (
                      <button
                        onClick={() => removeStep(i)}
                        style={{ marginTop: 4, borderRadius: 3, padding: 4, color: "#94A3B8", border: "none", background: "transparent", cursor: "pointer" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addStep}
                style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#7C3AED", background: "transparent", border: "none", cursor: "pointer", fontFamily: font }}
              >
                <Plus size={14} />
                Add Step
              </button>
            </div>

            {/* Contact selector */}
            <div>
              <div style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#0f2545" }}>
                  Select Contacts ({selectedContacts.length} selected)
                </label>
                <button onClick={selectAllContacts} style={{ fontSize: 11, color: "#7C3AED", background: "transparent", border: "none", cursor: "pointer", fontFamily: font }}>
                  {selectedContacts.length === contactsWithEmail.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              {contactsWithEmail.length === 0 ? (
                <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>No contacts with email addresses found.</p>
              ) : (
                <div style={{ maxHeight: 192, overflowY: "auto", borderRadius: 3, border: "1px solid #E2E8F0", padding: 8 }}>
                  {contactsWithEmail.map((c: any) => (
                    <label
                      key={c.id}
                      style={{ display: "flex", cursor: "pointer", alignItems: "center", gap: 12, borderRadius: 3, padding: "6px 12px" }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(c.id)}
                        onChange={() => toggleContact(c.id)}
                        style={{ width: 16, height: 16, accentColor: "#7C3AED" }}
                      />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#0f2545" }}>{c.firstName} {c.lastName}</span>
                        <span style={{ marginLeft: 8, fontSize: 11, color: "#64748B" }}>{c.jobTitle} at {c.company}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "#94A3B8" }}>{c.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={createMutation.isPending}
              style={{
                display: "flex", alignItems: "center", gap: 8, borderRadius: 3,
                background: "#0F172A", color: "#EDE9FE", padding: "10px 24px",
                fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: font,
                opacity: createMutation.isPending ? 0.5 : 1, alignSelf: "flex-start",
              }}
            >
              {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              {editingId ? "Update Sequence" : "Create Sequence"}
            </button>
          </div>
        </div>
      )}

      {/* Status Detail View */}
      {viewingId && <SequenceStatusView sequenceId={viewingId} onClose={() => setViewingId(null)} />}

      {/* Sequences List */}
      {sequences.length === 0 && !showForm ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          borderRadius: 3, border: "1px dashed #E2E8F0", padding: "64px 0", fontFamily: font,
        }}>
          <Zap size={40} style={{ marginBottom: 12, color: "#94A3B8" }} />
          <h3 style={{ fontSize: 17, fontWeight: 500, color: "#0f2545", margin: "0 0 4px" }}>No sequences yet</h3>
          <p style={{ marginBottom: 16, fontSize: 13, color: "#64748B" }}>Create a multi-step follow-up sequence to automate outreach</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 8, borderRadius: 3,
              background: "#0F172A", color: "#EDE9FE", padding: "8px 16px",
              fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: font,
            }}
          >
            <Plus size={16} />
            Create Sequence
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sequences.map((seq: any) => (
            <div
              key={seq.id}
              style={{
                borderRadius: 3, border: "1px solid #E2E8F0", background: "#fff", padding: 16,
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{ flex: 1, cursor: "pointer" }}
                  onClick={() => setViewingId(viewingId === seq.id ? null : seq.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0f2545", margin: 0 }}>{seq.name}</h3>
                    {statusBadge(seq.status)}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: "#64748B" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <ChevronRight size={12} />
                      {seq.steps?.length || 0} steps
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Users size={12} />
                      {seq.contactIds?.length || 0} contacts
                    </span>
                    {seq.currentStep != null && seq.status === "active" && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        Step {seq.currentStep + 1} of {seq.steps?.length || 0}
                      </span>
                    )}
                    {seq.nextRunAt && seq.status === "active" && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} />
                        Next: {new Date(seq.nextRunAt).toLocaleDateString()}
                      </span>
                    )}
                    <span>{new Date(seq.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {seq.status === "draft" && (
                    <>
                      <button
                        onClick={() => startMutation.mutate(seq.id)}
                        disabled={startMutation.isPending}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, borderRadius: 3,
                          background: "#16A34A", color: "#fff", padding: "6px 12px",
                          fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: font,
                          opacity: startMutation.isPending ? 0.5 : 1,
                        }}
                      >
                        <Play size={12} />
                        Start
                      </button>
                      <button
                        onClick={() => openEditForm(seq)}
                        style={{
                          borderRadius: 3, border: "1px solid #E2E8F0", padding: "6px 12px",
                          fontSize: 11, background: "#fff", cursor: "pointer", fontFamily: font, color: "#0f2545",
                        }}
                      >
                        Edit
                      </button>
                    </>
                  )}

                  {seq.status === "active" && (
                    <>
                      <button
                        onClick={() => executeMutation.mutate(seq.id)}
                        disabled={executeMutation.isPending}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, borderRadius: 3,
                          background: "#0F172A", color: "#EDE9FE", padding: "6px 12px",
                          fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: font,
                          opacity: executeMutation.isPending ? 0.5 : 1,
                        }}
                      >
                        {executeMutation.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Zap size={12} />
                        )}
                        Execute Step
                      </button>
                      <button
                        onClick={() => pauseResumeMutation.mutate({ id: seq.id, status: "paused" })}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, borderRadius: 3,
                          border: "1px solid #E2E8F0", padding: "6px 12px",
                          fontSize: 11, background: "#fff", cursor: "pointer", fontFamily: font, color: "#0f2545",
                        }}
                      >
                        <Pause size={12} />
                        Pause
                      </button>
                    </>
                  )}

                  {seq.status === "paused" && (
                    <button
                      onClick={() => pauseResumeMutation.mutate({ id: seq.id, status: "active" })}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, borderRadius: 3,
                        background: "#7C3AED", color: "#fff", padding: "6px 12px",
                        fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: font,
                      }}
                    >
                      <Play size={12} />
                      Resume
                    </button>
                  )}

                  {seq.status === "completed" && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#16A34A" }}>
                      <CheckCircle2 size={14} />
                      Completed
                    </span>
                  )}

                  <button
                    onClick={() => {
                      if (confirm("Delete this sequence?")) deleteMutation.mutate(seq.id);
                    }}
                    style={{ borderRadius: 3, padding: 6, color: "#94A3B8", border: "none", background: "transparent", cursor: "pointer" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SequenceStatusView({ sequenceId, onClose }: { sequenceId: string; onClose: () => void }) {
  const { data: status, isLoading } = useQuery({
    queryKey: ["sequenceStatus", sequenceId],
    queryFn: () => getSequenceStatus(sequenceId),
  });

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: 3,
    padding: 24,
    marginBottom: 24,
  };

  if (isLoading) {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0" }}>
          <Loader2 className="animate-spin" size={24} style={{ color: "#94A3B8" }} />
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0f2545", margin: 0, fontFamily: font }}>{status.name} - Status</h2>
          <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>
            Step {Math.min(status.currentStep + 1, status.totalSteps)} of {status.totalSteps}
            {status.nextRunAt && ` · Next run: ${new Date(status.nextRunAt).toLocaleString()}`}
          </p>
        </div>
        <button onClick={onClose} style={{ borderRadius: 3, padding: 4, border: "none", background: "transparent", cursor: "pointer" }}>
          <X size={18} color="#64748B" />
        </button>
      </div>

      {/* Steps progress */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>
        {status.steps?.map((_: any, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 100, fontSize: 11, fontWeight: 500,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: i < status.currentStep ? "#F0FDF4" : i === status.currentStep && status.status === "active" ? "#0F172A" : "#F1F5F9",
                color: i < status.currentStep ? "#16A34A" : i === status.currentStep && status.status === "active" ? "#EDE9FE" : "#94A3B8",
              }}
            >
              {i < status.currentStep ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            {i < status.steps.length - 1 && (
              <div style={{ height: 2, width: 24, background: i < status.currentStep ? "#86EFAC" : "#E2E8F0" }} />
            )}
          </div>
        ))}
      </div>

      {/* Per-contact status */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 style={{ fontSize: 13, fontWeight: 500, color: "#64748B", margin: 0 }}>Contact Details</h3>
        {status.contacts?.map((contact: any) => (
          <div key={contact.contactId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 3, border: "1px solid #E2E8F0", padding: "10px 16px" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#0f2545" }}>{contact.name || "Unknown"}</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>{contact.email}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {status.steps?.map((_: any, i: number) => {
                  const completed = contact.stepsCompleted?.some((sc: any) => sc.stepIndex === i);
                  return (
                    <div
                      key={i}
                      style={{
                        height: 10, width: 10, borderRadius: 100,
                        background: completed ? "#22C55E" : contact.skipped ? "#FBBF24" : "#E2E8F0",
                      }}
                      title={
                        completed
                          ? `Step ${i + 1} sent`
                          : contact.skipped
                          ? `Skipped: ${contact.skipReason}`
                          : `Step ${i + 1} pending`
                      }
                    />
                  );
                })}
              </div>
              {contact.skipped ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#B45309" }}>
                  <SkipForward size={12} />
                  {contact.skipReason === "replied" ? "Replied" : contact.skipReason}
                </span>
              ) : contact.hasReplied ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#16A34A" }}>
                  <CheckCircle2 size={12} />
                  Replied
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "#94A3B8" }}>
                  {contact.stepsCompleted?.length || 0}/{status.totalSteps} sent
                </span>
              )}
            </div>
          </div>
        ))}
        {(!status.contacts || status.contacts.length === 0) && (
          <p style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: "#94A3B8", margin: 0 }}>No contacts in this sequence</p>
        )}
      </div>
    </div>
  );
}
