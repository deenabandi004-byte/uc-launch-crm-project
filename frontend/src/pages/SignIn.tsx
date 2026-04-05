import { useNavigate } from "react-router-dom";
import { useFirebaseAuth } from "../contexts/FirebaseAuthContext";
import { useState } from "react";

export default function SignIn() {
  const { signIn } = useFirebaseAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const next = await signIn();
      navigate(next === "onboarding" ? "/onboarding" : "/");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Sign in failed. Please try again.");
      }
    } finally {
      setLoading(false);
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
          padding: 40,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              fontSize: "1.875rem",
              fontWeight: 500,
              color: "#0f2545",
              letterSpacing: "-0.015em",
              margin: 0,
            }}
          >
            Outbound
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: "0.875rem",
              color: "#94A3B8",
            }}
          >
            The simple CRM for busy small businesses
          </p>
        </div>

        <div style={{ marginTop: 32 }}>
          <button
            onClick={handleSignIn}
            disabled={loading}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              border: "1px solid #E2E8F0",
              background: "#fff",
              borderRadius: 3,
              padding: "12px 24px",
              fontSize: "0.875rem",
              fontWeight: 500,
              fontFamily: "Inter, sans-serif",
              color: "#0F172A",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = "#C4B5FD";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.08)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#E2E8F0";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <svg style={{ height: 20, width: 20 }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          {error && (
            <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#EF4444", marginTop: 16 }}>
              {error}
            </p>
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: "0.75rem",
            color: "#94A3B8",
            marginTop: 32,
          }}
        >
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </div>
      </div>
    </div>
  );
}
