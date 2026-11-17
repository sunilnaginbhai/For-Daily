async function request(path, options) {
  let response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...options,
    });
  } catch {
    throw new Error(
      "Cannot reach the Gmail backend. Start it with `npm run dev:full`, then retry.",
    );
  }

  let payload;
  const responseText = await response.text();
  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch {
    const error = new Error(
      `The Gmail backend returned a non-JSON response (HTTP ${response.status}). Make sure the backend is running with \`npm run dev:backend\`.`,
    );
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      payload.error || `Gmail request failed (${response.status}).`,
    );
    error.status = response.status;
    error.retryAfterSeconds = Number(response.headers.get("Retry-After")) || null;
    throw error;
  }

  return payload;
}

export function getGmailStatus() {
  return request("/api/auth/status");
}

export function completeDesktopGmailAuth(ticket, challenge) {
  return request("/api/auth/desktop/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket, challenge }),
  });
}

export function getGmailLabels() {
  return request("/api/gmail/labels");
}

export function getGmailMessages({
  maxResults = 25,
  pageToken,
  labelIds = [],
  q,
} = {}) {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (pageToken) params.set("pageToken", pageToken);
  for (const labelId of labelIds) params.append("labelIds", labelId);
  if (q) params.set("q", q);
  return request(`/api/gmail/messages?${params.toString()}`);
}

export function updateGmailMessages(ids, action) {
  return request("/api/gmail/messages/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, action }),
  });
}

export function sendGmailReply(messageId, body) {
  return request(
    `/api/gmail/messages/${encodeURIComponent(messageId)}/reply`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    },
  );
}

export function disconnectGmail() {
  return request("/api/auth/logout", { method: "POST" });
}

export async function downloadGmailAttachment(messageId, attachmentId, name) {
  const response = await fetch(
    `/api/gmail/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { credentials: "same-origin" },
  );

  if (!response.ok) {
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("The Gmail backend returned an invalid response.");
    }
    throw new Error(payload.error || `Gmail request failed (${response.status}).`);
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
