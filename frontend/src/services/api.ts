import { auth } from "../lib/firebase";

const BACKEND_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5001"
    : window.location.origin);

const API_BASE = `${BACKEND_URL}/api`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function apiGet<T = any>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function apiPut<T = any>(path: string, body?: any): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function apiDelete<T = any>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// User
export const getProfile = () => apiGet("/users/me");
export const updateProfile = (data: any) => apiPut("/users/me", data);

// Onboarding
export const completeOnboarding = (data: any) => apiPost("/onboarding/complete", data);
export const parseWebsite = (url: string) => apiPost("/onboarding/parse-website", { url });

// Leads
export const getLeads = () => apiGet("/leads/");
export const createLead = (data: any) => apiPost("/leads/", data);
export const updateLead = (id: string, data: any) => apiPut(`/leads/${id}`, data);
export const deleteLead = (id: string) => apiDelete(`/leads/${id}`);
export const generateLeads = () => apiPost("/leads/generate");
export const searchLeads = (query: string) => apiPost("/leads/search", { query });

// Contacts
export const getContacts = () => apiGet("/contacts/");
export const findContacts = (data: any) => apiPost("/contacts/find", data);
export const updateContact = (id: string, data: any) => apiPut(`/contacts/${id}`, data);
export const deleteContact = (id: string) => apiDelete(`/contacts/${id}`);
export const enrichContactPhones = () => apiPost("/contacts/enrich-phones");
export const importContacts = (data: any[]) => apiPost("/contacts/import", data);
export const exportContactsCsvUrl = () => `${API_BASE}/contacts/export`;

// Email Templates
export const getEmailTemplates = () => apiGet("/email-templates/");
export const createEmailTemplate = (data: any) => apiPost("/email-templates/", data);
export const updateEmailTemplate = (id: string, data: any) => apiPut(`/email-templates/${id}`, data);
export const deleteEmailTemplate = (id: string) => apiDelete(`/email-templates/${id}`);

// Campaigns
export const getCampaigns = () => apiGet("/campaigns/");
export const createCampaign = (data: any) => apiPost("/campaigns/create", data);
export const generateDrafts = (campaignId: string) => apiPost(`/campaigns/${campaignId}/generate`);
export const getDrafts = (campaignId: string) => apiGet(`/campaigns/${campaignId}/drafts`);
export const sendCampaign = (campaignId: string) => apiPost(`/campaigns/${campaignId}/send`);

// Pipeline
export const getPipeline = () => apiGet("/pipeline/");
export const movePipelineContact = (contactId: string, stage: string) =>
  apiPut(`/pipeline/move/${contactId}`, { stage });

// Tasks
export const getTasks = () => apiGet("/tasks/");
export const getTasksDueToday = () => apiGet("/tasks/due-today");
export const createTask = (data: any) => apiPost("/tasks/", data);
export const updateTask = (id: string, data: any) => apiPut(`/tasks/${id}`, data);
export const deleteTask = (id: string) => apiDelete(`/tasks/${id}`);

// Quotes
export const getQuotes = () => apiGet("/quotes/");
export const createQuote = (data: any) => apiPost("/quotes/", data);
export const updateQuote = (id: string, data: any) => apiPut(`/quotes/${id}`, data);
export const deleteQuote = (id: string) => apiDelete(`/quotes/${id}`);
export const generateQuotePdf = (id: string) => apiPost(`/quotes/${id}/pdf`);
export const convertQuoteToInvoice = (id: string, data?: any) => apiPost(`/quotes/${id}/convert`, data);

// Invoices
export const getInvoices = () => apiGet("/quotes/invoices");
export const createInvoice = (data: any) => apiPost("/quotes/invoices", data);
export const updateInvoice = (id: string, data: any) => apiPut(`/quotes/invoices/${id}`, data);
export const generateInvoicePdf = (id: string) => apiPost(`/quotes/invoices/${id}/pdf`);

// Analytics
export const getAnalyticsOverview = () => apiGet("/analytics/overview");
export const getCampaignAnalytics = (campaignId: string) => apiGet(`/analytics/campaign/${campaignId}`);
export const getPipelineHistory = () => apiGet("/analytics/pipeline/history");

// Replies
export const getReplies = () => apiGet("/replies/");
export const checkReplies = () => apiPost("/replies/check");
export const updateReply = (id: string, data: any) => apiPut(`/replies/${id}`, data);

// Tracking
export const getCampaignStats = (campaignId: string) => apiGet(`/tracking/stats/${campaignId}`);
export const getContactEngagement = (contactId: string) => apiGet(`/tracking/contact/${contactId}`);

// Sequences
export const getSequences = () => apiGet("/sequences/");
export const createSequence = (data: any) => apiPost("/sequences/", data);
export const updateSequence = (id: string, data: any) => apiPut(`/sequences/${id}`, data);
export const deleteSequence = (id: string) => apiDelete(`/sequences/${id}`);
export const startSequence = (id: string) => apiPost(`/sequences/${id}/start`);
export const executeSequenceStep = (id: string) => apiPost(`/sequences/${id}/execute`);
export const getSequenceStatus = (id: string) => apiGet(`/sequences/${id}/status`);

// Calendar
export const getCalendarEvents = () => apiGet("/calendar/events");
export const createCalendarEvent = (data: any) => apiPost("/calendar/events", data);
export const updateCalendarEvent = (id: string, data: any) => apiPut(`/calendar/events/${id}`, data);
export const deleteCalendarEvent = (id: string) => apiDelete(`/calendar/events/${id}`);
export const getAvailability = (startDate: string, endDate: string) => apiGet(`/calendar/availability?startDate=${startDate}&endDate=${endDate}`);

// Gmail
export const getGmailStatus = () => apiGet("/google/gmail/status");
export const startGmailOAuth = () => apiGet("/google/oauth/start");
