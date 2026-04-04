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

// Gmail
export const getGmailStatus = () => apiGet("/google/gmail/status");
export const startGmailOAuth = () => apiGet("/google/oauth/start");
