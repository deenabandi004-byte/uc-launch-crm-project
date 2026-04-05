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
      <div style={{ borderBottom: "1px solid #f0eef5", background: "#fff", padding: "24px 32px 0" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.4px", color: "#1e1b4b", marginBottom: 16 }}>Outreach</h1>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: "10px 10px 0 0",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: "none",
                borderBottom: tab === key ? "2px solid #7c3aed" : "2px solid transparent",
                color: tab === key ? "#7c3aed" : "#6b7280",
                background: tab === key ? "#f5f3ff" : "transparent",
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
