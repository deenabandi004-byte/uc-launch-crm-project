import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startGmailOAuth } from "../services/api";
import { toast } from "sonner";
import { Mail, Loader2, ArrowRight } from "lucide-react";

export default function ConnectGmail() {
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { authUrl } = await startGmailOAuth();
      window.location.href = authUrl;
    } catch (err: any) {
      toast.error(err.message || "Failed to start Gmail connection");
      setConnecting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-dots" style={{ background: "#FAFBFF" }}>
      <div className="w-full max-w-md space-y-6 bg-white p-8 text-center" style={{ borderRadius: 3, border: "1px solid #E2E8F0", boxShadow: "0 8px 24px rgba(124,58,237,0.08)" }}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center" style={{ borderRadius: 3, background: "#F5F3FF" }}>
          <Mail style={{ color: "#7C3AED" }} size={32} />
        </div>

        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#0F172A" }}>Connect Gmail</h2>
          <p className="mt-2 text-muted-foreground">
            Connect your Gmail account to send personalized outreach emails directly from Outbound.
          </p>
        </div>

        <div className="space-y-3 text-left text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "#7C3AED" }} />
            <span>Send campaigns from your Gmail address</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "#7C3AED" }} />
            <span>Track replies and engagement automatically</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "#7C3AED" }} />
            <span>We only request compose and read permissions</span>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting}
          className="btn-primary-glass flex w-full items-center justify-center gap-2 px-6 py-3 text-sm font-medium disabled:opacity-50"
        >
          {connecting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Mail size={16} />
          )}
          Connect Gmail Account
        </button>

        <button
          onClick={() => navigate("/")}
          className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Skip for now <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
