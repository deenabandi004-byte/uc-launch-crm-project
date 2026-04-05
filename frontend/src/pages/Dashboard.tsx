import { useMemo, useState } from 'react';
import {
  Users, Target, Send, GitBranch, ArrowRight,
  Mail, ChevronRight, ExternalLink, TrendingUp, BarChart3, Zap
} from 'lucide-react';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';
import { getLeads, getContacts, getCampaigns, getPipeline, getGmailStatus, startGmailOAuth } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const getTimeOfDayGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getPipelineStageCounts = (pipeline: Record<string, any[]>) => {
  const stages: Record<string, number> = {};
  let total = 0;
  for (const [stage, items] of Object.entries(pipeline)) {
    const count = Array.isArray(items) ? items.length : 0;
    stages[stage] = count;
    total += count;
  }
  return { stages, total };
};

export default function Dashboard() {
  const { user } = useFirebaseAuth();
  const navigate = useNavigate();
  const [connectingGmail, setConnectingGmail] = useState(false);

  const { data: leads = [] } = useQuery({ queryKey: ['leads'], queryFn: getLeads });
  const { data: contacts = [] } = useQuery({ queryKey: ['contacts'], queryFn: getContacts });
  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: getCampaigns });
  const { data: pipeline = {} } = useQuery({ queryKey: ['pipeline'], queryFn: getPipeline });
  const { data: gmailStatus } = useQuery({ queryKey: ['gmail-status'], queryFn: getGmailStatus });

  const firstName = user?.name?.split(' ')[0] || 'there';
  const { stages: pipelineStages, total: pipelineCount } = useMemo(
    () => getPipelineStageCounts(pipeline as Record<string, any[]>),
    [pipeline]
  );
  const repliedCount = (pipeline as any).replied?.length || 0;
  const campaignCount = Array.isArray(campaigns) ? campaigns.length : 0;

  const handleConnectGmail = async () => {
    setConnectingGmail(true);
    try {
      const { authUrl } = await startGmailOAuth();
      window.location.href = authUrl;
    } catch (err: any) {
      toast.error(err.message || 'Failed to start Gmail connection');
      setConnectingGmail(false);
    }
  };

  const pipelineContacts = useMemo(() => {
    const all: Array<{ name: string; stage: string; company?: string; initial: string }> = [];
    for (const [stage, items] of Object.entries(pipeline as Record<string, any[]>)) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const name = item.name || item.contactName || item.email || 'Unknown';
        all.push({
          name,
          stage,
          company: item.company || item.companyName || '',
          initial: name.charAt(0).toUpperCase(),
        });
      }
    }
    return all;
  }, [pipeline]);

  const stats = [
    { label: 'Target Companies', value: leads.length, icon: Target, color: '#7c3aed' },
    { label: 'Contacts', value: contacts.length, icon: Users, color: '#7c3aed' },
    { label: 'Campaigns', value: campaignCount, icon: Send, color: '#7c3aed' },
    { label: 'In Pipeline', value: pipelineCount, icon: GitBranch, color: '#7c3aed' },
  ];

  return (
    <div className="db-root">
      {/* Header */}
      <header className="db-header">
        <div>
          <h1 className="db-title">
            {getTimeOfDayGreeting()}, {firstName}
          </h1>
          <p className="db-subtitle">
            {user?.companyName
              ? `Here's what's happening at ${user.companyName}`
              : "Track your clients, follow up on time, and close more deals."}
          </p>
        </div>
        <button
          onClick={() => navigate('/campaigns')}
          className="db-primary-btn"
        >
          <Zap size={16} />
          New Campaign
        </button>
      </header>

      {/* Gmail banner */}
      {gmailStatus && !gmailStatus.connected && (
        <div className="db-gmail-banner">
          <div className="db-gmail-banner-left">
            <div className="db-gmail-icon-wrap">
              <Mail size={18} />
            </div>
            <div>
              <p className="db-gmail-title">Connect Gmail to send campaigns</p>
              <p className="db-gmail-desc">Required for sending personalized emails</p>
            </div>
          </div>
          <button
            onClick={handleConnectGmail}
            disabled={connectingGmail}
            className="db-gmail-btn"
          >
            <ExternalLink size={14} />
            Connect
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="db-stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="db-stat-card">
            <div className="db-stat-icon-wrap">
              <stat.icon size={20} strokeWidth={1.5} />
            </div>
            <div className="db-stat-value">{stat.value}</div>
            <div className="db-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="db-main-grid">

        {/* Left — Active Outbound Deals style */}
        <div className="db-card db-card-wide">
          <div className="db-card-header">
            <h2 className="db-card-title">Active Pipeline</h2>
            {pipelineCount > 0 && (
              <button onClick={() => navigate('/pipeline')} className="db-link">
                View all <ArrowRight size={14} />
              </button>
            )}
          </div>

          {pipelineCount === 0 ? (
            <div className="db-empty">
              <p className="db-empty-title">No contacts in pipeline yet</p>
              <p className="db-empty-desc">Contacts appear here once you send campaigns</p>
              <button onClick={() => navigate('/leads')} className="db-secondary-btn" style={{ marginTop: 16 }}>
                <Target size={15} />
                Generate Leads
              </button>
            </div>
          ) : (
            <div className="db-deal-list">
              {pipelineContacts.slice(0, 6).map((c, i) => (
                <div
                  key={`${c.name}-${i}`}
                  className="db-deal-row"
                  onClick={() => navigate('/pipeline')}
                >
                  <div className="db-avatar">{c.initial}</div>
                  <div className="db-deal-info">
                    <span className="db-deal-name">{c.name}</span>
                    {c.company && <span className="db-deal-company">{c.company}</span>}
                  </div>
                  <span className="db-stage-badge">{c.stage}</span>
                  <ChevronRight size={16} className="db-chevron" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="db-right-col">

          {/* Pipeline breakdown */}
          <div className="db-card">
            <div className="db-card-header">
              <h2 className="db-card-title">
                <BarChart3 size={16} className="db-card-title-icon" />
                Pipeline Stages
              </h2>
            </div>
            {pipelineCount === 0 ? (
              <p className="db-empty-desc">No data yet</p>
            ) : (
              <div className="db-stage-list">
                {Object.entries(pipelineStages).map(([stage, count]) => (
                  <div key={stage} className="db-stage-row">
                    <span className="db-stage-label">{stage}</span>
                    <div className="db-bar-track">
                      <div
                        className="db-bar-fill"
                        style={{ width: `${Math.max((count / pipelineCount) * 100, 8)}%` }}
                      />
                    </div>
                    <span className="db-stage-count">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="db-card">
            <div className="db-card-header">
              <h2 className="db-card-title">Quick Actions</h2>
            </div>
            <div className="db-quick-actions">
              {[
                { label: 'Generate Leads', icon: Target, to: '/leads' },
                { label: 'Find Contacts', icon: Users, to: '/contacts' },
                { label: 'Email Templates', icon: Mail, to: '/templates' },
                { label: 'View Pipeline', icon: GitBranch, to: '/pipeline' },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.to)}
                  className="db-action-btn"
                >
                  <action.icon size={16} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Integrations */}
          <div className="db-card">
            <div className="db-card-header">
              <h2 className="db-card-title">Integrations</h2>
            </div>
            <div className="db-integration-row">
              <div className="db-integration-left">
                <Mail size={16} className={gmailStatus?.connected ? 'db-icon-active' : 'db-icon-muted'} />
                <div>
                  <p className="db-integration-name">Gmail</p>
                  <p className="db-integration-status">
                    {gmailStatus?.connected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              {gmailStatus?.connected ? (
                <span className="db-badge-green">Active</span>
              ) : (
                <button
                  onClick={handleConnectGmail}
                  disabled={connectingGmail}
                  className="db-link"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reply highlight */}
      {repliedCount > 0 && (
        <div className="db-reply-banner" onClick={() => navigate('/pipeline')}>
          <div className="db-reply-left">
            <TrendingUp size={18} />
            <span>
              You have <strong>{repliedCount} new {repliedCount === 1 ? 'reply' : 'replies'}</strong> — check your pipeline
            </span>
          </div>
          <ArrowRight size={16} />
        </div>
      )}

      <style>{`
        /* ==================== TOKENS ==================== */
        .db-root {
          --accent: #7c3aed;
          --accent-light: #ede9fe;
          --accent-mid: #c4b5fd;
          --text-primary: #1e1b4b;
          --text-secondary: #6b7280;
          --text-muted: #9ca3af;
          --bg: #faf9fb;
          --card-bg: #ffffff;
          --border: #f0eef5;
          --radius: 14px;
          --shadow: 0 1px 3px rgba(124,58,237,.04), 0 4px 14px rgba(124,58,237,.06);
          --shadow-hover: 0 2px 8px rgba(124,58,237,.08), 0 8px 24px rgba(124,58,237,.10);

          background: var(--bg);
          padding: 40px 48px;
          max-width: 1120px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
          color: var(--text-primary);
        }

        /* ==================== HEADER ==================== */
        .db-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 36px;
        }
        .db-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--text-primary);
          margin: 0 0 6px;
        }
        .db-subtitle {
          font-size: 15px;
          color: var(--text-secondary);
          margin: 0;
          font-weight: 400;
        }
        .db-primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 10px 22px;
          border-radius: 100px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background .15s, box-shadow .15s;
          white-space: nowrap;
        }
        .db-primary-btn:hover {
          background: #6d28d9;
          box-shadow: 0 4px 12px rgba(124,58,237,.25);
        }

        /* ==================== GMAIL BANNER ==================== */
        .db-gmail-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: var(--radius);
          padding: 14px 20px;
          margin-bottom: 32px;
        }
        .db-gmail-banner-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .db-gmail-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #fef3c7;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d97706;
        }
        .db-gmail-title {
          font-size: 13px;
          font-weight: 600;
          color: #92400e;
          margin: 0 0 2px;
        }
        .db-gmail-desc {
          font-size: 12px;
          color: #b45309;
          margin: 0;
        }
        .db-gmail-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #d97706;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background .15s;
        }
        .db-gmail-btn:hover { background: #b45309; }
        .db-gmail-btn:disabled { opacity: .5; cursor: default; }

        /* ==================== STAT CARDS ==================== */
        .db-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        .db-stat-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 22px 20px;
          box-shadow: var(--shadow);
          transition: box-shadow .2s, transform .2s;
          text-align: left;
        }
        .db-stat-card:hover {
          box-shadow: var(--shadow-hover);
          transform: translateY(-2px);
        }
        .db-stat-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--accent-light);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .db-stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
          margin-bottom: 4px;
          letter-spacing: -0.5px;
        }
        .db-stat-label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 400;
        }

        /* ==================== MAIN GRID ==================== */
        .db-main-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        /* ==================== CARDS ==================== */
        .db-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 24px;
          box-shadow: var(--shadow);
        }
        .db-card-wide { grid-column: 1; }
        .db-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .db-card-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .db-card-title-icon { color: var(--text-muted); }

        /* ==================== LINKS ==================== */
        .db-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 500;
          color: var(--accent);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: opacity .15s;
        }
        .db-link:hover { opacity: .75; }

        /* ==================== DEAL LIST ==================== */
        .db-deal-list { display: flex; flex-direction: column; }
        .db-deal-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 4px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          transition: background .15s;
          border-radius: 8px;
        }
        .db-deal-row:last-child { border-bottom: none; }
        .db-deal-row:hover { background: var(--accent-light); }
        .db-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--accent-light);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .db-deal-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .db-deal-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .db-deal-company {
          font-size: 12px;
          color: var(--text-muted);
        }
        .db-stage-badge {
          font-size: 11px;
          font-weight: 500;
          color: var(--accent);
          background: var(--accent-light);
          padding: 3px 10px;
          border-radius: 100px;
          text-transform: capitalize;
          white-space: nowrap;
        }
        .db-chevron { color: var(--text-muted); flex-shrink: 0; }

        /* ==================== EMPTY STATE ==================== */
        .db-empty {
          text-align: center;
          padding: 32px 16px;
        }
        .db-empty-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          margin: 0 0 6px;
        }
        .db-empty-desc {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
        }
        .db-secondary-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 18px;
          border-radius: 100px;
          border: 1px solid var(--border);
          background: var(--card-bg);
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color .15s, box-shadow .15s;
        }
        .db-secondary-btn:hover {
          border-color: var(--accent-mid);
          box-shadow: 0 0 0 3px var(--accent-light);
        }

        /* ==================== PIPELINE BARS ==================== */
        .db-stage-list { display: flex; flex-direction: column; gap: 12px; }
        .db-stage-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .db-stage-label {
          font-size: 13px;
          color: var(--text-secondary);
          text-transform: capitalize;
          width: 80px;
          flex-shrink: 0;
        }
        .db-bar-track {
          flex: 1;
          height: 6px;
          background: var(--accent-light);
          border-radius: 100px;
          overflow: hidden;
        }
        .db-bar-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 100px;
          transition: width .4s ease;
        }
        .db-stage-count {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          width: 24px;
          text-align: right;
        }

        /* ==================== QUICK ACTIONS ==================== */
        .db-quick-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .db-action-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: none;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background .12s, border-color .12s;
          text-align: left;
        }
        .db-action-btn:hover {
          background: var(--accent-light);
          border-color: var(--border);
        }
        .db-action-btn svg { color: var(--accent); }

        /* ==================== INTEGRATIONS ==================== */
        .db-integration-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .db-integration-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .db-icon-active { color: #16a34a; }
        .db-icon-muted { color: var(--text-muted); }
        .db-integration-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          margin: 0;
        }
        .db-integration-status {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0;
        }
        .db-badge-green {
          font-size: 11px;
          font-weight: 500;
          color: #16a34a;
          background: #dcfce7;
          padding: 3px 10px;
          border-radius: 100px;
        }

        /* ==================== REPLY BANNER ==================== */
        .db-reply-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--accent-light);
          border: 1px solid var(--accent-mid);
          border-radius: var(--radius);
          padding: 16px 22px;
          cursor: pointer;
          transition: box-shadow .15s;
        }
        .db-reply-banner:hover {
          box-shadow: 0 0 0 3px var(--accent-light);
        }
        .db-reply-left {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--accent);
          font-size: 14px;
        }
        .db-reply-left strong { font-weight: 600; }
        .db-reply-banner > svg { color: var(--accent); }

        /* ==================== RIGHT COL ==================== */
        .db-right-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* ==================== RESPONSIVE ==================== */
        @media (max-width: 1024px) {
          .db-main-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .db-root { padding: 24px 16px; }
          .db-stats-grid { grid-template-columns: repeat(2, 1fr); }
          .db-header { flex-direction: column; gap: 16px; }
          .db-primary-btn { width: 100%; justify-content: center; }
          .db-gmail-banner { flex-direction: column; gap: 12px; align-items: flex-start; }
          .db-gmail-btn { width: 100%; justify-content: center; }
          .db-deal-row { padding: 14px 4px; }
          .db-action-btn { min-height: 48px; }
          .db-reply-banner { flex-direction: column; gap: 10px; text-align: center; }
          .db-reply-left { flex-wrap: wrap; justify-content: center; }
        }
        @media (max-width: 480px) {
          .db-stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .db-stat-card { padding: 16px 14px; }
          .db-stat-value { font-size: 22px; }
          .db-stat-icon-wrap { width: 32px; height: 32px; margin-bottom: 12px; }
        }
      `}</style>
    </div>
  );
}
