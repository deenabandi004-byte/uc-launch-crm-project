import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from "../services/api";
import { toast } from "sonner";
import { Mail, Plus, Trash2, Loader2, Edit2, Save, X, FileText } from "lucide-react";

const VARIABLES = ["{{firstName}}", "{{lastName}}", "{{companyName}}", "{{myCompany}}", "{{myName}}", "{{industry}}", "{{painPoint}}", "{{valueProposition}}"];

export default function EmailTemplates() {
  const queryClient = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({ queryKey: ["templates"], queryFn: getEmailTemplates });
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });

  const createMutation = useMutation({
    mutationFn: createEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setCreating(false);
      setForm({ name: "", subject: "", body: "" });
      toast.success("Template created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateEmailTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setEditing(null);
      toast.success("Template updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted");
    },
  });

  const startEdit = (t: any) => {
    setEditing(t.id);
    setForm({ name: t.name, subject: t.subject, body: t.body });
  };

  const insertVariable = (variable: string) => {
    setForm((f) => ({ ...f, body: f.body + variable }));
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">Manage your outreach templates</p>
        </div>
        <button
          onClick={() => { setCreating(true); setForm({ name: "", subject: "", body: "" }); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Create / Edit form */}
      {(creating || editing) && (
        <div className="mb-6 rounded-xl border border-border p-5">
          <h3 className="mb-4 text-sm font-medium">{creating ? "New Template" : "Edit Template"}</h3>
          <div className="space-y-3">
            <input
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Template name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Email subject line"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            <div>
              <div className="mb-1 flex flex-wrap gap-1">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    onClick={() => insertVariable(v)}
                    className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/80"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <textarea
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                rows={8}
                placeholder="Email body..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {creating ? (
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || createMutation.isPending}
                className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <Save size={14} /> Save
              </button>
            ) : (
              <button
                onClick={() => updateMutation.mutate({ id: editing!, data: form })}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <Save size={14} /> Update
              </button>
            )}
            <button
              onClick={() => { setCreating(false); setEditing(null); }}
              className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Mail className="mb-3 text-muted-foreground" size={40} />
          <h3 className="text-lg font-medium">No templates yet</h3>
          <p className="text-sm text-muted-foreground">Templates will be created automatically on first load</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t: any) => (
            <div key={t.id} className="rounded-xl border border-border p-4 hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <FileText size={18} className="mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t.name}</span>
                      {t.isPreset && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                          PRESET
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Subject: {t.subject}</div>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.body}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(t)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                    <Edit2 size={14} />
                  </button>
                  {!t.isPreset && (
                    <button
                      onClick={() => deleteMutation.mutate(t.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
