import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Leaf, Home, Thermometer, Droplets, Hammer,
  ArrowRight, ArrowLeft, Check, Users, Target,
  Loader2, Sparkles, Wrench, User, MapPin,
} from "lucide-react";
import logoImg from "../assets/logo-circle.png";

const TRADES = [
  { name: "Landscaping", icon: Leaf, color: "#10B981" },
  { name: "Roofing", icon: Home, color: "#7C3AED" },
  { name: "HVAC", icon: Thermometer, color: "#F59E0B" },
  { name: "Plumbing", icon: Droplets, color: "#06B6D4" },
  { name: "General Contractor", icon: Hammer, color: "#8B5CF6" },
];

const TEAM_SIZES = ["Just me", "2-5", "6-15", "16+"];
const GOALS = [
  "Get more leads",
  "Track jobs better",
  "Send follow-ups",
  "All of the above",
];

const SAMPLE_CLIENTS = [
  { name: "Mike Torres", trade: "Landscaping", status: "Estimate sent", color: "#10B981" },
  { name: "Green Valley LLC", trade: "Roofing", status: "Active job", color: "#7C3AED" },
  { name: "Sunrise Lawns", trade: "HVAC", status: "Invoice due", color: "#F59E0B" },
];

const steps = [
  { title: "Pick Your Trade", desc: "What kind of work do you do?", icon: Wrench },
  { title: "About Your Team", desc: "Help us set up your workspace", icon: Users },
  { title: "Sample Clients", desc: "We'll pre-load some demo data", icon: User },
  { title: "You're All Set!", desc: "Your CRM is ready to go", icon: Sparkles },
];

export default function TradesOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedTrade, setSelectedTrade] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);

  const canProceed = () => {
    if (step === 0) return !!selectedTrade;
    if (step === 1) return !!teamSize && !!goal;
    return true;
  };

  const handleComplete = () => {
    setLoading(true);
    setTimeout(() => {
      navigate("/dashboard");
    }, 600);
  };

  return (
    <div className="min-h-screen" style={{ background: "#FFFFFF" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <img src={logoImg} alt="Outbound" style={{ width: 32, height: 32, objectFit: "contain" }} />
        <span style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontWeight: 700, fontSize: 17, color: "#0f2545" }}>
          Outbound
        </span>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress bar (Offerloop style — icon circles with connector lines) */}
        <div className="flex items-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all"
                style={{
                  background: i < step ? "#7C3AED" : i === step ? "#7C3AED" : "#F1F5F9",
                  color: i <= step ? "#fff" : "#94A3B8",
                }}
              >
                {i < step ? <Check size={16} /> : <s.icon size={16} />}
              </div>
              {i < steps.length - 1 && (
                <div
                  className="h-[2px] flex-1"
                  style={{ background: i < step ? "#7C3AED" : "#E2E8F0" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 28, fontWeight: 400, color: "#0f2545", marginBottom: 4 }}>
              {steps[step].title}
            </h3>
            <p style={{ fontSize: 14, color: "#6B7280" }}>{steps[step].desc}</p>
          </div>

          {/* Step 0: Pick your trade */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              {TRADES.map((trade) => (
                <button
                  key={trade.name}
                  onClick={() => setSelectedTrade(trade.name)}
                  className="flex flex-col items-center gap-3 p-5 transition-all"
                  style={{
                    background: selectedTrade === trade.name ? "rgba(124,58,237,0.04)" : "#FAFBFF",
                    border: selectedTrade === trade.name ? "2px solid #7C3AED" : "1px solid #E2E8F0",
                    borderRadius: 3,
                    cursor: "pointer",
                    boxShadow: selectedTrade === trade.name ? "0 2px 8px rgba(124,58,237,0.10)" : "none",
                  }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-sm"
                    style={{ background: `${trade.color}15` }}
                  >
                    <trade.icon size={24} style={{ color: trade.color }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{trade.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Team size + goal */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 8, display: "block" }}>Team Size</label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setTeamSize(size)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm transition-all"
                      style={{
                        background: teamSize === size ? "#5B21B6" : "#FAFBFF",
                        color: teamSize === size ? "#fff" : "#475569",
                        border: teamSize === size ? "1px solid #5B21B6" : "1px solid #E2E8F0",
                        borderRadius: 3,
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      <Users size={14} />
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 8, display: "block" }}>Primary Goal</label>
                <div className="space-y-2">
                  {GOALS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-all"
                      style={{
                        background: goal === g ? "rgba(124,58,237,0.04)" : "#FAFBFF",
                        border: goal === g ? "1px solid #7C3AED" : "1px solid #E2E8F0",
                        borderRadius: 3,
                        cursor: "pointer",
                        color: "#0F172A",
                      }}
                    >
                      <Target size={16} style={{ color: goal === g ? "#7C3AED" : "#94A3B8" }} />
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Sample clients */}
          {step === 2 && (
            <div className="space-y-3">
              <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 12 }}>
                We'll add these sample clients so your CRM isn't empty. You can edit or remove them anytime.
              </p>
              {SAMPLE_CLIENTS.map((client) => (
                <div
                  key={client.name}
                  className="flex items-center gap-3 p-4"
                  style={{ border: "1px solid #E2E8F0", borderRadius: 3, background: "#FAFBFF" }}
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: client.color, fontSize: 13, fontWeight: 700 }}
                  >
                    {client.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{client.name}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>{client.trade}</div>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5"
                    style={{ fontSize: 11, fontWeight: 500, background: "rgba(124,58,237,0.08)", color: "#7C3AED" }}
                  >
                    {client.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="flex flex-col items-center py-6 text-center">
              <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: "rgba(124,58,237,0.08)" }}
              >
                <Sparkles style={{ color: "#7C3AED" }} size={32} />
              </div>
              <h4 style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 22, fontWeight: 400, color: "#0f2545", marginBottom: 8 }}>
                Your CRM is ready!
              </h4>
              <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 32, maxWidth: 380 }}>
                We've loaded {selectedTrade} data and 3 sample clients. Start tracking jobs, sending estimates, and following up — all in one place.
              </p>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 text-sm font-semibold"
                style={{
                  background: "#5B21B6",
                  color: "#fff",
                  borderRadius: 3,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  fontFamily: "'Libre Baskerville', Georgia, serif",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#4C1D95"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#5B21B6"; }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                Go to Dashboard
              </button>
            </div>
          )}

          {/* Navigation */}
          {step < 3 && (
            <div className="flex justify-between" style={{ marginTop: 32 }}>
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1 px-4 py-2 text-sm"
                  style={{ color: "#6B7280", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#0F172A"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#6B7280"; }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1 px-6 py-2.5 text-sm font-semibold"
                style={{
                  background: canProceed() ? "#5B21B6" : "#E2E8F0",
                  color: canProceed() ? "#fff" : "#94A3B8",
                  borderRadius: 3,
                  border: "none",
                  cursor: canProceed() ? "pointer" : "not-allowed",
                  fontFamily: "'Libre Baskerville', Georgia, serif",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { if (canProceed()) e.currentTarget.style.background = "#4C1D95"; }}
                onMouseLeave={(e) => { if (canProceed()) e.currentTarget.style.background = "#5B21B6"; }}
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
