import { CheckSquare, Plus } from "lucide-react";

export default function Tasks() {
  return (
    <div className="tasks-root">
      <div className="tasks-header">
        <div>
          <h1 className="tasks-title">Tasks</h1>
          <p className="tasks-subtitle">Manage your to-dos and follow-ups</p>
        </div>
        <button className="tasks-primary-btn" disabled>
          <Plus size={16} /> New Task
        </button>
      </div>

      <div className="tasks-empty">
        <CheckSquare size={40} strokeWidth={1.2} className="tasks-empty-icon" />
        <h3 className="tasks-empty-title">Coming Soon</h3>
        <p className="tasks-empty-desc">
          Task management with due dates, contact linking, and auto-creation from pipeline actions.
        </p>
      </div>

      <style>{`
        .tasks-root {
          background: #faf9fb;
          padding: 40px 48px;
          max-width: 960px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
          color: #1e1b4b;
        }
        .tasks-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .tasks-title { font-size: 24px; font-weight: 700; letter-spacing: -.4px; margin: 0 0 4px; }
        .tasks-subtitle { font-size: 14px; color: #6b7280; margin: 0; }
        .tasks-primary-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: #7c3aed; color: #fff; border: none;
          padding: 10px 20px; border-radius: 100px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          opacity: .5;
        }
        .tasks-empty {
          display: flex; flex-direction: column; align-items: center;
          padding: 80px 16px; border: 2px dashed #f0eef5;
          border-radius: 14px; text-align: center;
        }
        .tasks-empty-icon { color: #9ca3af; margin-bottom: 12px; }
        .tasks-empty-title { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
        .tasks-empty-desc { font-size: 14px; color: #9ca3af; margin: 0; max-width: 400px; line-height: 1.5; }
      `}</style>
    </div>
  );
}
