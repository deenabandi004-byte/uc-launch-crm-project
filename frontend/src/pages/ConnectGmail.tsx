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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <Mail className="text-red-500" size={32} />
        </div>

        <div>
          <h2 className="text-2xl font-bold">Connect Gmail</h2>
          <p className="mt-2 text-muted-foreground">
            Connect your Gmail account to send personalized outreach emails directly from OutboundCRM.
          </p>
        </div>

        <div className="space-y-3 text-left text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
            <span>Send campaigns from your Gmail address</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
            <span>Track replies and engagement automatically</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
            <span>We only request compose and read permissions</span>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
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
