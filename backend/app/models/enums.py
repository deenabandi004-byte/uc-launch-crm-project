"""Pipeline stages and status enums"""

PIPELINE_STAGES = [
    "none",
    "no_response",
    "replied",
    "call_scheduled",
    "proposal_sent",
    "won",
    "not_interested",
    "lost",
]

CAMPAIGN_STATUSES = [
    "draft",
    "drafts_ready",
    "sending",
    "sent",
    "error",
]

LEAD_STATUSES = [
    "new",
    "contacted",
    "qualified",
    "disqualified",
]
