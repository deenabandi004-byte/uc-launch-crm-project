import { useFirebaseAuth } from "../contexts/FirebaseAuthContext";
import { useQuery } from "@tanstack/react-query";
import { getLeads, getContacts, getPipeline, getGmailStatus, startGmailOAuth } from "../services/api";
import { Target, Users, Send, GitBranch, Mail, ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";

export default function Dashboard() {
  const { user } = useFirebaseAuth();
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: getContacts });
  const { data: pipeline = {} } = useQuery({ queryKey: ["pipeline"], queryFn: getPipeline });
  const { data: gmailStatus } = useQuery({ queryKey: ["gmail-status"], queryFn: getGmailStatus });
  const [connectingGmail, setConnectingGmail] = useState(false);

  const pipelineCount = Object.values(pipeline).flat().length;
  const repliedCount = (pipeline as any).replied?.length || 0;

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

  const stats = [
    { label: "Target Companies", value: leads.length, icon: Target, to: "/leads", color: "text-blue-600 bg-blue-50" },
    { label: "Contacts", value: contacts.length, icon: Users, to: "/contacts", color: "text-emerald-600 bg-emerald-50" },
    { label: "In Pipeline", value: pipelineCount, icon: GitBranch, to: "/pipeline", color: "text-purple-600 bg-purple-50" },
    { label: "Replies", value: repliedCount, icon: Send, to: "/pipeline", color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground">
          {user?.companyName ? `${user.companyName} Dashboard` : "Your outbound sales dashboard"}
        </p>
      </div>

      {/* Gmail connection banner */}
      {gmailStatus && !gmailStatus.connected && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <Mail className="text-amber-600" size={20} />
            <div>
              <p className="text-sm font-medium text-amber-900">Connect Gmail to send campaigns</p>
              <p className="text-xs text-amber-700">Required for sending personalized emails to your contacts</p>
            </div>
          </div>
          <button
            onClick={handleConnectGmail}
            disabled={connectingGmail}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <ExternalLink size={14} />
            Connect Gmail
          </button>
        </div>
      )}

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-lg p-2 ${stat.color}`}>
                <stat.icon size={18} />
              </div>
              <ArrowRight size={16} className="text-muted-foreground" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            to="/leads"
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
          >
            <Target size={20} className="text-blue-600" />
            <div>
              <div className="text-sm font-medium">Generate Leads</div>
              <div className="text-xs text-muted-foreground">Find target companies with AI</div>
            </div>
          </Link>
          <Link
            to="/campaigns"
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
          >
            <Send size={20} className="text-emerald-600" />
            <div>
              <div className="text-sm font-medium">New Campaign</div>
              <div className="text-xs text-muted-foreground">Send personalized emails</div>
            </div>
          </Link>
          <Link
            to="/pipeline"
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
          >
            <GitBranch size={20} className="text-purple-600" />
            <div>
              <div className="text-sm font-medium">View Pipeline</div>
              <div className="text-xs text-muted-foreground">Track your outreach</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
