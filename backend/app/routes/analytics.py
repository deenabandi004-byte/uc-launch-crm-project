"""
Analytics & Reporting routes.

Provides:
  GET /api/analytics/overview           — Dashboard-level KPIs and recent activity
  GET /api/analytics/campaign/<id>      — Per-campaign analytics with contact details
  GET /api/analytics/pipeline/history   — Pipeline conversion funnel counts
"""
import logging
from flask import Blueprint, request, jsonify
from app.extensions import require_firebase_auth, get_db

logger = logging.getLogger(__name__)
analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@analytics_bp.get("/overview")
@require_firebase_auth
def overview():
    """Return dashboard-level analytics computed from Firestore."""
    uid = request.firebase_user["uid"]
    db = get_db()
    user_ref = db.collection("users").document(uid)

    # ── Contacts ──
    contacts_docs = list(user_ref.collection("contacts").stream())
    contacts = [doc.to_dict() | {"id": doc.id} for doc in contacts_docs]
    total_contacts = len(contacts)

    # ── Leads ──
    leads_docs = list(user_ref.collection("leads").stream())
    total_leads = len(leads_docs)

    # ── Campaigns ──
    campaigns_docs = list(user_ref.collection("campaigns").stream())
    campaigns = [doc.to_dict() | {"id": doc.id} for doc in campaigns_docs]
    sent_campaigns = [c for c in campaigns if c.get("status") == "sent"]
    campaigns_sent = len(sent_campaigns)
    emails_sent = sum(c.get("sentCount", 0) for c in campaigns)

    # ── Pipeline breakdown ──
    pipeline_breakdown = {}
    for c in contacts:
        stage = c.get("pipelineStage", "new_lead")
        pipeline_breakdown[stage] = pipeline_breakdown.get(stage, 0) + 1

    # ── Reply rate ──
    contacts_with_thread = [c for c in contacts if c.get("gmailThreadId")]
    contacts_with_reply = [c for c in contacts if c.get("hasUnreadReply")]
    # Also count contacts that have been classified (reply already read/dismissed)
    contacts_replied = [c for c in contacts_with_thread if c.get("hasUnreadReply") or c.get("aiCategory")]
    reply_rate = 0.0
    if contacts_with_thread:
        reply_rate = round((len(contacts_replied) / len(contacts_with_thread)) * 100, 1)

    # ── Conversion rate ──
    paid_contacts = [c for c in contacts if c.get("pipelineStage") == "paid"]
    conversion_rate = 0.0
    if total_contacts > 0:
        conversion_rate = round((len(paid_contacts) / total_contacts) * 100, 1)

    # ── Revenue from invoices ──
    invoices_docs = list(user_ref.collection("invoices").stream())
    invoices = [doc.to_dict() | {"id": doc.id} for doc in invoices_docs]
    total_revenue = sum(inv.get("total", 0) for inv in invoices)
    collected = sum(inv.get("total", 0) for inv in invoices if inv.get("status") == "paid")
    pending = sum(inv.get("total", 0) for inv in invoices if inv.get("status") != "paid")

    # ── Recent activity (combine replies, campaigns, invoices) ──
    activity = []

    # Replies
    replies_docs = list(user_ref.collection("replies").stream())
    for doc in replies_docs:
        r = doc.to_dict()
        activity.append({
            "type": "reply",
            "contactName": r.get("contactName", "Unknown"),
            "description": f"Classified as {r.get('category', 'unknown')}",
            "timestamp": r.get("receivedAt", r.get("processedAt", "")),
        })

    # Campaign sends
    for c in sent_campaigns:
        activity.append({
            "type": "campaign_sent",
            "description": f"{c.get('name', 'Campaign')} — {c.get('sentCount', 0)} emails",
            "timestamp": c.get("createdAt", ""),
        })

    # Invoice events
    for inv in invoices:
        status_label = "paid" if inv.get("status") == "paid" else "sent"
        activity.append({
            "type": "invoice",
            "description": f"Invoice {inv.get('invoiceNumber', '')} {status_label} — ${inv.get('total', 0):,.2f}",
            "timestamp": inv.get("paidAt", inv.get("createdAt", "")),
        })

    # Sort descending by timestamp, take last 10
    activity.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
    recent_activity = activity[:10]

    return jsonify({
        "totalContacts": total_contacts,
        "totalLeads": total_leads,
        "campaignsSent": campaigns_sent,
        "emailsSent": emails_sent,
        "pipelineBreakdown": pipeline_breakdown,
        "replyRate": reply_rate,
        "conversionRate": conversion_rate,
        "revenue": {
            "total": round(total_revenue, 2),
            "pending": round(pending, 2),
            "collected": round(collected, 2),
        },
        "recentActivity": recent_activity,
    })


@analytics_bp.get("/campaign/<campaign_id>")
@require_firebase_auth
def campaign_analytics(campaign_id):
    """Return per-campaign analytics with contact-level details."""
    uid = request.firebase_user["uid"]
    db = get_db()
    user_ref = db.collection("users").document(uid)

    camp_doc = user_ref.collection("campaigns").document(campaign_id).get()
    if not camp_doc.exists:
        return jsonify({"error": "Campaign not found"}), 404

    campaign = camp_doc.to_dict()
    drafts = campaign.get("drafts", [])

    # Build contact details from drafts + live contact data
    contact_details = []
    for draft in drafts:
        contact_id = draft.get("contactId", "")
        contact_data = {}
        if contact_id:
            cdoc = user_ref.collection("contacts").document(contact_id).get()
            if cdoc.exists:
                contact_data = cdoc.to_dict()

        contact_details.append({
            "name": draft.get("contactName", ""),
            "email": draft.get("contactEmail", ""),
            "status": draft.get("status", "unknown"),
            "replied": contact_data.get("hasUnreadReply", False) or bool(contact_data.get("aiCategory")),
            "category": contact_data.get("aiCategory", ""),
            "pipelineStage": contact_data.get("pipelineStage", ""),
        })

    return jsonify({
        "name": campaign.get("name", ""),
        "sentCount": campaign.get("sentCount", 0),
        "deliveredCount": campaign.get("sentCount", 0),  # assume delivered = sent for now
        "contacts": contact_details,
    })


@analytics_bp.get("/pipeline/history")
@require_firebase_auth
def pipeline_history():
    """Return pipeline conversion funnel — count of contacts per stage in order."""
    uid = request.firebase_user["uid"]
    db = get_db()

    contacts_docs = list(
        db.collection("users").document(uid).collection("contacts").stream()
    )

    stage_order = [
        "new_lead", "contacted", "interested", "estimate_sent",
        "approved", "in_progress", "complete", "paid",
    ]
    stage_labels = {
        "new_lead": "New Lead",
        "contacted": "Contacted",
        "interested": "Interested",
        "estimate_sent": "Estimate Sent",
        "approved": "Approved",
        "in_progress": "In Progress",
        "complete": "Complete",
        "paid": "Paid",
    }

    counts = {s: 0 for s in stage_order}
    for doc in contacts_docs:
        stage = doc.to_dict().get("pipelineStage", "new_lead")
        if stage in counts:
            counts[stage] += 1
        else:
            # contacts with non-standard stages go to new_lead bucket
            counts["new_lead"] += 1

    funnel = []
    for stage in stage_order:
        funnel.append({
            "stage": stage,
            "label": stage_labels[stage],
            "count": counts[stage],
        })

    return jsonify(funnel)
