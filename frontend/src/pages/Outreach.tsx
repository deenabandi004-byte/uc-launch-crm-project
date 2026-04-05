import { useState } from "react";
import { Send, Repeat, Mail } from "lucide-react";
import CampaignCompose from "./CampaignCompose";
import Sequences from "./Sequences";
import EmailTemplates from "./EmailTemplates";

const TABS = [
  { key: "campaigns", label: "Campaigns", icon: Send },
  { key: "sequences", label: "Sequences", icon: Repeat },
  { key: "templates", label: "Templates", icon: Mail },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function Outreach() {
  const [tab, setTab] = useState<TabKey>("campaigns");

  return (
    <div>
      {/* Tab bar */}
      <div style={{ borderBottom: "1px solid #E2E8F0", background: "#FAFBFF", padding: "24px 32px 0" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Outreach</h1>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: "3px 3px 0 0",
                fontSize: 13.5, fontWeight: 500, cursor: "pointer",
                border: "none",
                borderBottom: tab === key ? "2px solid #7C3AED" : "2px solid transparent",
                color: tab === key ? "#7C3AED" : "#64748B",
                background: tab === key ? "#F5F3FF" : "transparent",
                transition: "all .15s",
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — each component renders its own padding/layout */}
      {tab === "campaigns" && <CampaignCompose />}
      {tab === "sequences" && <Sequences />}
      {tab === "templates" && <EmailTemplates />}
    </div>
  );
}
