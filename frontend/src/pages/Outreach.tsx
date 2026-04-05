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
      <div className="border-b border-border bg-card px-8 pt-6">
        <h1 className="mb-4 text-2xl font-bold">Outreach</h1>
        <div className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
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
