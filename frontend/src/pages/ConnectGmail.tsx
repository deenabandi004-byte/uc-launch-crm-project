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
    <div
      className="flex min-h-screen items-center justify-center bg-dots"
      style={{ background: "#FAFBFF", fontFamily: "Inter, sans-serif" }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 3,
          boxShadow: "0 8px 24px rgba(124,58,237,0.08)",
          padding: "32px 32px 28px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 3,
            background: "#F5F3FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
          }}
        >
          <Mail style={{ color: "#7C3AED" }} size={20} />
        </div>

        <div style={{ marginTop: 20 }}>
          <h2
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 500,
              color: "#0f2545",
              margin: 0,
            }}
          >
            Connect Gmail
          </h2>
          <p style={{ marginTop: 8, fontSize: "0.875rem", color: "#64748B", lineHeight: 1.6 }}>
            Connect your Gmail account to send personalized outreach emails directly from Outbound.
          </p>
        </div>

        <div style={{ marginTop: 20, textAlign: "left" }}>
          {[
            "Send campaigns from your Gmail address",
            "Track replies and engagement automatically",
            "We only request compose and read permissions",
          ].map((text) => (
            <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#7C3AED",
                  flexShrink: 0,
                  marginTop: 6,
                }}
              />
              <span style={{ fontSize: "0.875rem", color: "#64748B" }}>{text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting}
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "#0F172A",
            color: "#EDE9FE",
            border: "none",
            borderRadius: 3,
            padding: "12px 24px",
            fontSize: "0.875rem",
            fontWeight: 500,
            fontFamily: "Inter, sans-serif",
            cursor: connecting ? "not-allowed" : "pointer",
            opacity: connecting ? 0.5 : 1,
            marginTop: 24,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!connecting) e.currentTarget.style.background = "#1E293B";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#0F172A";
          }}
        >
          {connecting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Mail size={16} />
          )}
          Connect Gmail Account
        </button>

        <button
          onClick={() => navigate("/dashboard")}
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            background: "none",
            border: "none",
            fontSize: "0.875rem",
            color: "#94A3B8",
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            marginTop: 16,
            padding: "8px 0",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#0F172A";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94A3B8";
          }}
        >
          Skip for now <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
