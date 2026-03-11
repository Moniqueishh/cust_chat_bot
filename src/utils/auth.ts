
export const CHECK_CUSTOMER_URL = "/api/auth/check-customer";
export const REDEEM_URL = "/api/auth/redeem";

export function normalizeResponse(data: any) {
  if (!data) return data;
  if (Array.isArray(data)) {
    // If it's an array, look for an object that has a devMagicLink or message
    const linkObj = data.find(item => item && (item.devMagicLink || item.message || item.token));
    if (linkObj) return linkObj;
    // Otherwise return the first item
    return data[0];
  }
  return data;
}

export async function requestLoginLink(email: string) {
  const res = await fetch(CHECK_CUSTOMER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  return normalizeResponse(data);
}

export async function redeemToken(token: string) {
  // ... (existing mock mode)
  if (token === "JUMP-TEST-2026") {
    return {
      ok: true,
      sessionId: "mock_session_123",
      projects: [
        { 
          projectId: "PROJ-001", 
          projectType: "Residential EV", 
          status: "in_progress",
          jobType: "US Residential Installation",
          installer: "demo-us"
        },
        { 
          projectId: "PROJ-002", 
          projectType: "Commercial", 
          status: "completed",
          jobType: "Commercial Solar Array",
          installer: "demo-us",
          completedAt: "2026-03-01T10:00:00Z" // More than 24h ago
        },
        { 
          projectId: "PROJ-003", 
          projectType: "Fleet", 
          status: "completed",
          jobType: "Fleet Charging Hub",
          installer: "demo-us",
          completedAt: "2026-03-04T10:00:00Z" // Less than 24h ago
        }
      ]
    };
  }

  const res = await fetch(REDEEM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  return normalizeResponse(data);
}

export async function fetchProjectsByEmail(email: string) {
  const res = await fetch(`/api/auth/projects-by-email/${encodeURIComponent(email)}`);
  const data = await res.json();
  return data;
}

export async function fetchProjectsFromN8N(email: string) {
  const url = import.meta.env.VITE_N8N_PROJECT_URL || "https://n8n.dev.jumptech.tools/webhook/check-customer";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Failed to fetch projects from n8n");
  const data = await res.json();
  return data;
}

export function decodeBase64Token(token: string) {
  try {
    const json = atob(token);
    return JSON.parse(json);
  } catch (e) {
    console.error("Failed to decode token", e);
    return null;
  }
}

export function isTokenExpired(exp: number) {
  if (!exp) return false;
  // exp is usually in seconds
  const now = Math.floor(Date.now() / 1000);
  return now > exp;
}

export function getSession() {
  const sessionId = localStorage.getItem("jt_sessionId");
  const selectedProjectId = localStorage.getItem("jt_selectedProjectId");
  let projects = [];
  try { 
    projects = JSON.parse(localStorage.getItem("jt_projects") || "[]"); 
  } catch(e) {
    console.error("Failed to parse projects from localStorage", e);
  }
  return { sessionId, selectedProjectId, projects };
}

export function clearSession() {
  localStorage.removeItem("jt_sessionId");
  localStorage.removeItem("jt_projects");
  localStorage.removeItem("jt_selectedProjectId");
}

export function canRequestLink() {
  const last = Number(localStorage.getItem("jt_lastLinkRequestAt") || "0");
  const now = Date.now();
  const diff = now - last;
  const waitMs = 30_000;
  if (diff < waitMs) return { ok: false, retryInSeconds: Math.ceil((waitMs - diff) / 1000) };
  return { ok: true, retryInSeconds: 0 };
}

export function markLinkRequested() {
  localStorage.setItem("jt_lastLinkRequestAt", String(Date.now()));
}
