import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTasks, getContacts, createTask, updateTask, deleteTask } from "../services/api";
import { toast } from "sonner";
import {
  CheckSquare, Plus, Loader2, Trash2, Calendar,
  AlertCircle, Clock, Check, Filter, Search,
} from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-purple-100 text-purple-700",
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

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            {openCount} open{overdueCount > 0 && <span className="text-red-600 font-medium"> ({overdueCount} overdue)</span>}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">{editingId ? "Edit Task" : "New Task"}</h3>
          <div className="space-y-3">
            <input
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
              placeholder="Task title (e.g., Call Mike about estimate)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select
                className="rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
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
                className="rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
              <select
                className="rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <textarea
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
              rows={2}
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!form.title.trim() || createMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingId ? "Update" : "Create Task"}
              </button>
              <button
                onClick={resetForm}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === s
                  ? "bg-primary text-white"
                  : "border border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {s}
              {s === "overdue" && overdueCount > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{overdueCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <CheckSquare className="mb-3 text-muted-foreground" size={40} />
          <h3 className="text-lg font-medium">
            {filter === "all" ? "No tasks yet" : `No ${filter} tasks`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? "Create a task to track your follow-ups" : "Try a different filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task: any) => {
            const isOverdue = task.status === "overdue";
            const isCompleted = task.status === "completed";
            const dueLabel = task.dueDate
              ? new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : null;

            return (
              <div
                key={task.id}
                className={`group flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                  isOverdue
                    ? "border-red-200 bg-red-50/50"
                    : isCompleted
                    ? "border-border bg-muted/30"
                    : "border-border bg-card hover:bg-secondary/30"
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleComplete(task)}
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                    isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-gray-300 hover:border-primary"
                  }`}
                >
                  {isCompleted && <Check size={12} />}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => handleEdit(task)}
                      className={`text-sm font-medium text-left hover:text-primary ${
                        isCompleted ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.title}
                    </button>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                        {task.priority}
                      </span>
                      <button
                        onClick={() => deleteMutation.mutate(task.id)}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {task.contactName && (
                      <span className="flex items-center gap-1">
                        <span className="h-4 w-4 rounded-full bg-purple-100 text-center text-[9px] font-bold leading-4 text-purple-700">
                          {task.contactName.charAt(0).toUpperCase()}
                        </span>
                        {task.contactName}
                      </span>
                    )}
                    {dueLabel && (
                      <span className={`flex items-center gap-1 ${isOverdue ? "font-medium text-red-600" : ""}`}>
                        {isOverdue ? <AlertCircle size={11} /> : <Calendar size={11} />}
                        {dueLabel}
                        {isOverdue && " (overdue)"}
                      </span>
                    )}
                    {task.createdFrom && task.createdFrom !== "manual" && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px]">
                        {task.createdFrom === "pipeline_prompt" ? "from pipeline" : task.createdFrom.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>

                  {task.notes && (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">{task.notes}</p>
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
