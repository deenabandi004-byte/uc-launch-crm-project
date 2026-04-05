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
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      active: "bg-purple-100 text-purple-700",
      paused: "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">Create multi-step follow-up campaigns</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus size={16} />
          Create Sequence
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editingId ? "Edit Sequence" : "New Sequence"}</h2>
            <button onClick={resetForm} className="rounded p-1 hover:bg-muted">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Sequence Name</label>
              <input
                className="w-full max-w-md rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="e.g., 3-Day Follow-up"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Steps Builder */}
            <div>
              <label className="mb-2 block text-sm font-medium">Steps</label>
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="mb-1 block text-xs text-muted-foreground">Template</label>
                          <select
                            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                            value={step.templateId}
                            onChange={(e) => updateStep(i, "templateId", e.target.value)}
                          >
                            <option value="">Select template...</option>
                            {templates.map((t: any) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32">
                          <label className="mb-1 block text-xs text-muted-foreground">Delay (days)</label>
                          <input
                            type="number"
                            min={0}
                            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                            value={step.delayDays}
                            onChange={(e) => updateStep(i, "delayDays", parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Subject override (optional)</label>
                        <input
                          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                          placeholder="Leave empty to use template subject"
                          value={step.subject}
                          onChange={(e) => updateStep(i, "subject", e.target.value)}
                        />
                      </div>
                    </div>
                    {steps.length > 1 && (
                      <button
                        onClick={() => removeStep(i)}
                        className="mt-1 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addStep}
                className="mt-2 flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus size={14} />
                Add Step
              </button>
            </div>

            {/* Contact selector */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">
                  Select Contacts ({selectedContacts.length} selected)
                </label>
                <button onClick={selectAllContacts} className="text-xs text-primary hover:underline">
                  {selectedContacts.length === contactsWithEmail.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              {contactsWithEmail.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts with email addresses found.</p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {contactsWithEmail.map((c: any) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(c.id)}
                        onChange={() => toggleContact(c.id)}
                        className="h-4 w-4 rounded border-border text-primary"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{c.firstName} {c.lastName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{c.jobTitle} at {c.company}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{c.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Zap className="mb-3 text-muted-foreground" size={40} />
          <h3 className="text-lg font-medium">No sequences yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">Create a multi-step follow-up sequence to automate outreach</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus size={16} />
            Create Sequence
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq: any) => (
            <div
              key={seq.id}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20"
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setViewingId(viewingId === seq.id ? null : seq.id)}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold">{seq.name}</h3>
                    {statusBadge(seq.status)}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ChevronRight size={12} />
                      {seq.steps?.length || 0} steps
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {seq.contactIds?.length || 0} contacts
                    </span>
                    {seq.currentStep != null && seq.status === "active" && (
                      <span className="flex items-center gap-1">
                        Step {seq.currentStep + 1} of {seq.steps?.length || 0}
                      </span>
                    )}
                    {seq.nextRunAt && seq.status === "active" && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        Next: {new Date(seq.nextRunAt).toLocaleDateString()}
                      </span>
                    )}
                    <span>{new Date(seq.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {seq.status === "draft" && (
                    <>
                      <button
                        onClick={() => startMutation.mutate(seq.id)}
                        disabled={startMutation.isPending}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <Play size={12} />
                        Start
                      </button>
                      <button
                        onClick={() => openEditForm(seq)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
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
                        className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
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
                        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
                      >
                        <Pause size={12} />
                        Pause
                      </button>
                    </>
                  )}

                  {seq.status === "paused" && (
                    <button
                      onClick={() => pauseResumeMutation.mutate({ id: seq.id, status: "active" })}
                      className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                    >
                      <Play size={12} />
                      Resume
                    </button>
                  )}

                  {seq.status === "completed" && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 size={14} />
                      Completed
                    </span>
                  )}

                  <button
                    onClick={() => {
                      if (confirm("Delete this sequence?")) deleteMutation.mutate(seq.id);
                    }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
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

  if (isLoading) {
    return (
      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{status.name} - Status</h2>
          <p className="text-sm text-muted-foreground">
            Step {Math.min(status.currentStep + 1, status.totalSteps)} of {status.totalSteps}
            {status.nextRunAt && ` · Next run: ${new Date(status.nextRunAt).toLocaleString()}`}
          </p>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted">
          <X size={18} />
        </button>
      </div>

      {/* Steps progress */}
      <div className="mb-5 flex items-center gap-1">
        {status.steps?.map((_: any, i: number) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                i < status.currentStep
                  ? "bg-green-100 text-green-700"
                  : i === status.currentStep && status.status === "active"
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < status.currentStep ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            {i < status.steps.length - 1 && (
              <div className={`h-0.5 w-6 ${i < status.currentStep ? "bg-green-300" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Per-contact status */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Contact Details</h3>
        {status.contacts?.map((contact: any) => (
          <div key={contact.contactId} className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5">
            <div>
              <div className="text-sm font-medium">{contact.name || "Unknown"}</div>
              <div className="text-xs text-muted-foreground">{contact.email}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {status.steps?.map((_: any, i: number) => {
                  const completed = contact.stepsCompleted?.some((sc: any) => sc.stepIndex === i);
                  return (
                    <div
                      key={i}
                      className={`h-2.5 w-2.5 rounded-full ${
                        completed
                          ? "bg-green-500"
                          : contact.skipped
                          ? "bg-yellow-400"
                          : "bg-gray-200"
                      }`}
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
                <span className="flex items-center gap-1 text-xs text-yellow-600">
                  <SkipForward size={12} />
                  {contact.skipReason === "replied" ? "Replied" : contact.skipReason}
                </span>
              ) : contact.hasReplied ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 size={12} />
                  Replied
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {contact.stepsCompleted?.length || 0}/{status.totalSteps} sent
                </span>
              )}
            </div>
          </div>
        ))}
        {(!status.contacts || status.contacts.length === 0) && (
          <p className="py-4 text-center text-sm text-muted-foreground">No contacts in this sequence</p>
        )}
      </div>
    </div>
  );
}
