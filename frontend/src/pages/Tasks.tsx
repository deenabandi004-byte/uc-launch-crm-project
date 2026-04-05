import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTasks, getContacts, createTask, updateTask, deleteTask } from "../services/api";
import { toast } from "sonner";
import {
  CheckSquare, Plus, Loader2, Trash2, Calendar,
  AlertCircle, Clock, Check, Filter, Search,
} from "lucide-react";

const PRIORITY_COLORS: Record<string, { background: string; color: string }> = {
  high: { background: "#FEE2E2", color: "#B91C1C" },
  medium: { background: "#FEF3C7", color: "#B45309" },
  low: { background: "#EDE9FE", color: "#7C3AED" },
};

const STATUS_FILTERS = ["all", "open", "overdue", "completed"] as const;

export default function Tasks() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({ queryKey: ["tasks"], queryFn: getTasks });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: getContacts });
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    contactId: "",
    contactName: "",
    dueDate: "",
    priority: "medium",
    notes: "",
  });

  const resetForm = () => {
    setForm({ title: "", contactId: "", contactName: "", dueDate: "", priority: "medium", notes: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create task"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
  });

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
      toast.success("Task updated");
      resetForm();
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (task: any) => {
    setForm({
      title: task.title || "",
      contactId: task.contactId || "",
      contactName: task.contactName || "",
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      priority: task.priority || "medium",
      notes: task.notes || "",
    });
    setEditingId(task.id);
    setShowForm(true);
  };

  const toggleComplete = (task: any) => {
    const newStatus = task.status === "completed" ? "open" : "completed";
    updateMutation.mutate({ id: task.id, data: { status: newStatus } });
    if (newStatus === "completed") {
      toast.success("Task completed!");
    }
  };

  const handleContactSelect = (contactId: string) => {
    const contact = contacts.find((c: any) => c.id === contactId);
    setForm({
      ...form,
      contactId,
      contactName: contact ? `${contact.firstName} ${contact.lastName}` : "",
    });
  };

  // Filter and search
  const filtered = tasks
    .filter((t: any) => {
      if (filter === "open") return t.status === "open";
      if (filter === "overdue") return t.status === "overdue";
      if (filter === "completed") return t.status === "completed";
      return true;
    })
    .filter((t: any) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        t.title?.toLowerCase().includes(s) ||
        t.contactName?.toLowerCase().includes(s) ||
        t.notes?.toLowerCase().includes(s)
      );
    })
    .sort((a: any, b: any) => {
      // Overdue first, then open, then completed
      const order: Record<string, number> = { overdue: 0, open: 1, completed: 2 };
      const diff = (order[a.status] ?? 1) - (order[b.status] ?? 1);
      if (diff !== 0) return diff;
      // Then by due date ascending
      return (a.dueDate || "").localeCompare(b.dueDate || "");
    });

  const overdueCount = tasks.filter((t: any) => t.status === "overdue").length;
  const openCount = tasks.filter((t: any) => t.status === "open").length;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 3,
    border: "1px solid #E2E8F0",
    padding: "10px 16px",
    fontSize: 14,
    outline: "none",
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ maxWidth: 896, margin: "0 auto", padding: "40px 48px", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#0f2545", fontFamily: "'Libre Baskerville', Georgia, serif", margin: 0 }}>Tasks</h1>
          <p style={{ color: "#64748B", fontSize: 14, margin: "4px 0 0" }}>
            {openCount} open{overdueCount > 0 && <span style={{ color: "#DC2626", fontWeight: 500 }}> ({overdueCount} overdue)</span>}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#0F172A", color: "#EDE9FE",
            borderRadius: 3, padding: "8px 16px",
            fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer",
          }}
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div style={{
          marginBottom: 24,
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 3,
          padding: 20,
        }}>
          <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: "#0f2545", marginTop: 0 }}>{editingId ? "Edit Task" : "New Task"}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              style={inputStyle}
              placeholder="Task title (e.g., Call Mike about estimate)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <select
                style={{ ...inputStyle, padding: "10px 12px" }}
                value={form.contactId}
                onChange={(e) => handleContactSelect(e.target.value)}
              >
                <option value="">Link to contact (optional)</option>
                {contacts.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} {c.company ? `(${c.company})` : ""}
                  </option>
                ))}
              </select>
              <input
                type="date"
                style={{ ...inputStyle, padding: "10px 12px" }}
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
              <select
                style={{ ...inputStyle, padding: "10px 12px" }}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <textarea
              style={{ ...inputStyle, resize: "vertical" }}
              rows={2}
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleSubmit}
                disabled={!form.title.trim() || createMutation.isPending}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#0F172A", color: "#EDE9FE",
                  borderRadius: 3, padding: "8px 16px",
                  fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer",
                  opacity: (!form.title.trim() || createMutation.isPending) ? 0.5 : 1,
                }}
              >
                {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingId ? "Update" : "Create Task"}
              </button>
              <button
                onClick={resetForm}
                style={{
                  borderRadius: 3, border: "1px solid #E2E8F0",
                  padding: "8px 16px", fontSize: 14, color: "#64748B",
                  background: "transparent", cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                borderRadius: 3,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 500,
                textTransform: "capitalize",
                border: filter === s ? "none" : "1px solid #E2E8F0",
                background: filter === s ? "#0F172A" : "transparent",
                color: filter === s ? "#EDE9FE" : "#64748B",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {s}
              {s === "overdue" && overdueCount > 0 && (
                <span style={{
                  marginLeft: 4, borderRadius: 100,
                  background: "#EF4444", padding: "1px 6px",
                  fontSize: 10, color: "#fff",
                }}>{overdueCount}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
          <input
            style={{ ...inputStyle, paddingLeft: 36, paddingRight: 12 }}
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 className="animate-spin" style={{ color: "#94A3B8" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          border: "2px dashed #E2E8F0", borderRadius: 3,
          padding: "64px 0",
        }}>
          <CheckSquare style={{ marginBottom: 12, color: "#94A3B8" }} size={40} />
          <h3 style={{ fontSize: 18, fontWeight: 500, color: "#0f2545", margin: 0 }}>
            {filter === "all" ? "No tasks yet" : `No ${filter} tasks`}
          </h3>
          <p style={{ fontSize: 14, color: "#64748B", margin: "4px 0 0" }}>
            {filter === "all" ? "Create a task to track your follow-ups" : "Try a different filter"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((task: any) => {
            const isOverdue = task.status === "overdue";
            const isCompleted = task.status === "completed";
            const dueLabel = task.dueDate
              ? new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : null;

            const pColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;

            return (
              <div
                key={task.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  borderRadius: 3, padding: 16,
                  border: isOverdue ? "1px solid #FECACA" : "1px solid #E2E8F0",
                  background: isOverdue ? "#FEF2F2" : isCompleted ? "#F8FAFC" : "#fff",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isOverdue && !isCompleted) {
                    e.currentTarget.style.borderColor = "#C4B5FD";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(124,58,237,0.10)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isOverdue && !isCompleted) {
                    e.currentTarget.style.borderColor = "#E2E8F0";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleComplete(task)}
                  style={{
                    marginTop: 2, display: "flex",
                    height: 20, width: 20, flexShrink: 0,
                    alignItems: "center", justifyContent: "center",
                    borderRadius: 3, border: isCompleted ? "1px solid #059669" : "1px solid #CBD5E1",
                    background: isCompleted ? "#059669" : "transparent",
                    color: isCompleted ? "#fff" : "transparent",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {isCompleted && <Check size={12} />}
                </button>

                {/* Content */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <button
                      onClick={() => handleEdit(task)}
                      style={{
                        fontSize: 14, fontWeight: 500, textAlign: "left",
                        color: isCompleted ? "#94A3B8" : "#0f2545",
                        textDecoration: isCompleted ? "line-through" : "none",
                        background: "none", border: "none", cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      {task.title}
                    </button>
                    <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 4 }}>
                      <span style={{
                        borderRadius: 100, padding: "2px 8px",
                        fontSize: 10, fontWeight: 600,
                        background: pColor.background,
                        color: pColor.color,
                      }}>
                        {task.priority}
                      </span>
                      <button
                        onClick={() => deleteMutation.mutate(task.id)}
                        style={{
                          borderRadius: 3, padding: 4,
                          color: "#94A3B8", background: "none",
                          border: "none", cursor: "pointer",
                          transition: "color 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#DC2626"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 12, color: "#64748B" }}>
                    {task.contactName && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{
                          height: 16, width: 16, borderRadius: "50%",
                          background: "#EDE9FE", textAlign: "center",
                          fontSize: 9, fontWeight: 700, lineHeight: "16px",
                          color: "#7C3AED", display: "inline-block",
                        }}>
                          {task.contactName.charAt(0).toUpperCase()}
                        </span>
                        {task.contactName}
                      </span>
                    )}
                    {dueLabel && (
                      <span style={{
                        display: "flex", alignItems: "center", gap: 4,
                        color: isOverdue ? "#DC2626" : "#64748B",
                        fontWeight: isOverdue ? 500 : 400,
                      }}>
                        {isOverdue ? <AlertCircle size={11} /> : <Calendar size={11} />}
                        {dueLabel}
                        {isOverdue && " (overdue)"}
                      </span>
                    )}
                    {task.createdFrom && task.createdFrom !== "manual" && (
                      <span style={{
                        borderRadius: 3, background: "#F1F5F9",
                        padding: "2px 6px", fontSize: 10,
                        color: "#64748B",
                      }}>
                        {task.createdFrom === "pipeline_prompt" ? "from pipeline" : task.createdFrom.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>

                  {task.notes && (
                    <p style={{
                      marginTop: 6, fontSize: 12, color: "#94A3B8",
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap", margin: "6px 0 0",
                    }}>{task.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
