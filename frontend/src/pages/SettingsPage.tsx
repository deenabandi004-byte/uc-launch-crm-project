import { useFirebaseAuth } from "../contexts/FirebaseAuthContext";
import { useQuery } from "@tanstack/react-query";
import { getGmailStatus, startGmailOAuth } from "../services/api";
import { Settings, Mail, ExternalLink, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useFirebaseAuth();
  const { data: gmailStatus } = useQuery({ queryKey: ["gmail-status"], queryFn: getGmailStatus });
  const [connectingGmail, setConnectingGmail] = useState(false);

  const handleConnectGmail = async () => {
    setConnectingGmail(true);
    try {
      const { authUrl } = await startGmailOAuth();
      window.location.href = authUrl;
    } catch (err: any) {
      toast.error(err.message || "Failed to start Gmail connection");
      setConnectingGmail(false);
    }
  };

  return (
    <div className="st-root">
      <div className="st-header">
        <h1 className="st-title">Settings</h1>
        <p className="st-subtitle">Manage your account and integrations</p>
      </div>

      {/* Account */}
      <div className="st-card">
        <div className="st-card-header">
          <User size={18} className="st-card-icon" />
          <h2 className="st-card-title">Account</h2>
        </div>
        <div className="st-row">
          <span className="st-row-label">Name</span>
          <span className="st-row-value">{user?.name || "—"}</span>
        </div>
        <div className="st-row">
          <span className="st-row-label">Email</span>
          <span className="st-row-value">{user?.email || "—"}</span>
        </div>
        <div className="st-row">
          <span className="st-row-label">Company</span>
          <span className="st-row-value">{user?.companyName || "—"}</span>
        </div>
        <div className="st-row st-row-last">
          <span className="st-row-label">Industry</span>
          <span className="st-row-value">{user?.industry || "—"}</span>
        </div>
      </div>

      {/* Gmail */}
      <div className="st-card">
        <div className="st-card-header">
          <Mail size={18} className="st-card-icon" />
          <h2 className="st-card-title">Gmail Integration</h2>
        </div>
        <div className="st-row st-row-last">
          <div>
            <span className="st-row-label">Status</span>
            <span className={`st-status ${gmailStatus?.connected ? "st-status--active" : ""}`}>
              {gmailStatus?.connected ? "Connected" : "Not connected"}
            </span>
          </div>
          {!gmailStatus?.connected && (
            <button onClick={handleConnectGmail} disabled={connectingGmail} className="st-connect-btn">
              <ExternalLink size={14} />
              Connect Gmail
            </button>
          )}
        </div>
      </div>

      <style>{`
        .st-root {
          background: #faf9fb;
          padding: 40px 48px;
          max-width: 720px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
          color: #1e1b4b;
        }
        .st-header { margin-bottom: 32px; }
        .st-title { font-size: 24px; font-weight: 700; letter-spacing: -.4px; margin: 0 0 4px; }
        .st-subtitle { font-size: 14px; color: #6b7280; margin: 0; }

        .st-card {
          background: #fff;
          border: 1px solid #f0eef5;
          border-radius: 14px;
          padding: 0;
          box-shadow: 0 1px 3px rgba(124,58,237,.04), 0 4px 14px rgba(124,58,237,.06);
          margin-bottom: 20px;
          overflow: hidden;
        }
        .st-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 22px;
          border-bottom: 1px solid #f0eef5;
          background: #f8f7fc;
        }
        .st-card-icon { color: #7c3aed; }
        .st-card-title { font-size: 15px; font-weight: 600; margin: 0; }

        .st-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 22px;
          border-bottom: 1px solid #f0eef5;
        }
        .st-row-last { border-bottom: none; }
        .st-row-label { font-size: 13px; color: #6b7280; }
        .st-row-value { font-size: 13px; font-weight: 500; }

        .st-status {
          font-size: 12px;
          font-weight: 500;
          color: #9ca3af;
          margin-left: 8px;
        }
        .st-status--active { color: #059669; }

        .st-connect-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #7c3aed;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background .15s;
        }
        .st-connect-btn:hover { background: #6d28d9; }
        .st-connect-btn:disabled { opacity: .5; cursor: default; }

        @media (max-width: 768px) {
          .st-root { padding: 24px 16px; }
        }
      `}</style>
    </div>
  );
}
