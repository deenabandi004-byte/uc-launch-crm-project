import { FileText } from "lucide-react";

export default function Quotes() {
  return (
    <div className="quotes-root">
      <div className="quotes-header">
        <div>
          <h1 className="quotes-title">Quotes & Invoices</h1>
          <p className="quotes-subtitle">Generate quotes and convert them to invoices</p>
        </div>
      </div>

      <div className="quotes-empty">
        <FileText size={40} strokeWidth={1.2} className="quotes-empty-icon" />
        <h3 className="quotes-empty-title">Coming Soon</h3>
        <p className="quotes-empty-desc">
          Line-item quote builder, PDF generation, email delivery, and quote-to-invoice conversion.
        </p>
      </div>

      <style>{`
        .quotes-root {
          background: #faf9fb;
          padding: 40px 48px;
          max-width: 960px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
          color: #1e1b4b;
        }
        .quotes-header { margin-bottom: 28px; }
        .quotes-title { font-size: 24px; font-weight: 700; letter-spacing: -.4px; margin: 0 0 4px; }
        .quotes-subtitle { font-size: 14px; color: #6b7280; margin: 0; }
        .quotes-empty {
          display: flex; flex-direction: column; align-items: center;
          padding: 80px 16px; border: 2px dashed #f0eef5;
          border-radius: 14px; text-align: center;
        }
        .quotes-empty-icon { color: #9ca3af; margin-bottom: 12px; }
        .quotes-empty-title { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
        .quotes-empty-desc { font-size: 14px; color: #9ca3af; margin: 0; max-width: 400px; line-height: 1.5; }
      `}</style>
    </div>
  );
}
