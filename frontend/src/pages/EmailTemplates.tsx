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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 48px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>Manage your outreach templates</p>
        </div>
        <button
          onClick={() => { setCreating(true); setForm({ name: "", subject: "", body: "" }); }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            borderRadius: 3, border: "none", padding: "8px 16px",
            fontSize: 14, fontWeight: 500, background: "#0F172A", color: "#EDE9FE",
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
          }}
        >
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Create / Edit form */}
      {(creating || editing) && (
        <div style={{ marginBottom: 24, borderRadius: 3, border: "1px solid #E2E8F0", background: "#fff", padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0f2545", margin: "0 0 16px" }}>{creating ? "New Template" : "Edit Template"}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              style={{
                width: "100%", borderRadius: 3, border: "1px solid #E2E8F0",
                padding: "8px 12px", fontSize: 14, outline: "none",
                fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
              }}
              placeholder="Template name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onFocus={(e) => e.currentTarget.style.borderColor = "#7C3AED"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#E2E8F0"}
            />
            <input
              style={{
                width: "100%", borderRadius: 3, border: "1px solid #E2E8F0",
                padding: "8px 12px", fontSize: 14, outline: "none",
                fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
              }}
              placeholder="Email subject line"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              onFocus={(e) => e.currentTarget.style.borderColor = "#7C3AED"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#E2E8F0"}
            />
            <div>
              <div style={{ marginBottom: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    onClick={() => insertVariable(v)}
                    style={{
                      borderRadius: 3, border: "none", background: "#F1F5F9",
                      padding: "2px 8px", fontSize: 12, color: "#64748B",
                      cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <textarea
                style={{
                  width: "100%", borderRadius: 3, border: "1px solid #E2E8F0",
                  padding: "8px 12px", fontSize: 14, outline: "none", resize: "vertical",
                  fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
                }}
                rows={8}
                placeholder="Email body..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                onFocus={(e) => e.currentTarget.style.borderColor = "#7C3AED"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#E2E8F0"}
              />
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            {creating ? (
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || createMutation.isPending}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  borderRadius: 3, border: "none", padding: "8px 16px",
                  fontSize: 14, fontWeight: 500, background: "#0F172A", color: "#EDE9FE",
                  cursor: "pointer", opacity: (!form.name || createMutation.isPending) ? 0.5 : 1,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Save size={14} /> Save
              </button>
            ) : (
              <button
                onClick={() => updateMutation.mutate({ id: editing!, data: form })}
                disabled={updateMutation.isPending}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  borderRadius: 3, border: "none", padding: "8px 16px",
                  fontSize: 14, fontWeight: 500, background: "#0F172A", color: "#EDE9FE",
                  cursor: "pointer", opacity: updateMutation.isPending ? 0.5 : 1,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Save size={14} /> Update
              </button>
            )}
            <button
              onClick={() => { setCreating(false); setEditing(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                borderRadius: 3, border: "none", padding: "8px 16px",
                fontSize: 14, background: "transparent", color: "#64748B",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 style={{ color: "#94A3B8", animation: "spin 1s linear infinite" }} />
        </div>
      ) : templates.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px dashed #E2E8F0", padding: "64px 0" }}>
          <Mail style={{ color: "#D1D5DB", marginBottom: 12 }} size={40} />
          <h3 style={{ fontSize: 18, fontWeight: 500, color: "#0f2545", margin: "0 0 4px" }}>No templates yet</h3>
          <p style={{ fontSize: 14, color: "#94A3B8", margin: 0 }}>Templates will be created automatically on first load</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {templates.map((t: any) => (
            <div
              key={t.id}
              style={{
                borderRadius: 3, border: "1px solid #E2E8F0", background: "#fff", padding: 16,
                transition: "border-color 0.15s, box-shadow 0.15s", cursor: "default",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C4B5FD"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <FileText size={18} style={{ marginTop: 2, color: "#94A3B8" }} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#0f2545" }}>{t.name}</span>
                      {t.isPreset && (
                        <span style={{
                          borderRadius: 100, background: "#F5F3FF", padding: "2px 8px",
                          fontSize: 10, fontWeight: 600, color: "#7C3AED",
                        }}>
                          PRESET
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>Subject: {t.subject}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#94A3B8", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.body}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => startEdit(t)}
                    style={{ background: "none", border: "none", borderRadius: 3, padding: 4, color: "#94A3B8", cursor: "pointer" }}
                  >
                    <Edit2 size={14} />
                  </button>
                  {!t.isPreset && (
                    <button
                      onClick={() => deleteMutation.mutate(t.id)}
                      style={{ background: "none", border: "none", borderRadius: 3, padding: 4, color: "#94A3B8", cursor: "pointer" }}
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
