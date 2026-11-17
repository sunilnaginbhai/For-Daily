import crypto from "node:crypto";
import express from "express";
import { existsSync } from "node:fs";
import session from "express-session";
import { google } from "googleapis";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseGmailMessageListQuery,
  uniqueGmailMessageIds,
} from "./gmail-pagination.js";

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(serverDirectory, "..");
const envPaths = [
  path.join(projectDirectory, ".env"),
  path.resolve(projectDirectory, "..", ".env"),
];
dotenv.config({ path: envPaths.find(existsSync) || envPaths[0] });

const app = express();
app.use(express.json({ limit: "48kb" }));
const port = Number(process.env.PORT || 3001);
const appOrigin = new URL(process.env.APP_ORIGIN || "http://localhost:5173").origin;
const redirectUri =
  process.env.GOOGLE_REDIRECT_URI ||
  `http://localhost:${port}/auth/google/callback`;
const isProduction = process.env.NODE_ENV === "production";
const googleCredentialsConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);
const sessionSecret =
  process.env.SESSION_SECRET ||
  (!isProduction ? crypto.randomBytes(32).toString("hex") : "");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

if (isProduction) {
  throw new Error(
    "This local backend uses in-memory sessions. Configure a persistent session store before production deployment.",
  );
}

if (sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
}

if (!process.env.SESSION_SECRET) {
  console.warn("Using a temporary session secret; Gmail sessions end when the server restarts.");
}

app.use(
  session({
    name: "gmail.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function createOAuthClient() {
  if (!googleCredentialsConfigured) {
    throw new HttpError(
      503,
      "Google OAuth is not configured. Add the OAuth values to the local .env file.",
    );
  }

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );
}

function gmailForRequest(req) {
  if (!req.session.gmailTokens) {
    throw new HttpError(401, "Connect a Gmail account to continue.");
  }

  const auth = createOAuthClient();
  auth.setCredentials(req.session.gmailTokens);
  return google.gmail({ version: "v1", auth });
}

function matchesOAuthState(received, expected) {
  if (
    typeof received !== "string" ||
    typeof expected !== "string" ||
    received.length !== expected.length
  ) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

function getHeader(payload, name) {
  return payload?.headers?.find(
    (header) => header.name?.toLowerCase() === name.toLowerCase(),
  )?.value || "";
}

function parseSender(rawFrom) {
  const match = rawFrom.match(/^(.*?)\s*<([^<>]+)>$/);
  const address = match ? match[2].trim() : rawFrom.trim();
  const sender = (match?.[1] || address.split("@")[0] || "Gmail")
    .replace(/^["']|["']$/g, "")
    .trim();

  return { sender, address };
}

function getRfcMessageIds(value) {
  return value.match(/<[^<>\r\n]{1,120}>/g) || [];
}

function createReplyRawMessage(original, body) {
  const payload = original.payload;
  const rawRecipient =
    getHeader(payload, "Reply-To") || getHeader(payload, "From");
  const { address } = parseSender(rawRecipient);
  if (!/^[^\s<>@,;]+@[^\s<>@,;]+$/.test(address)) {
    throw new HttpError(400, "The original message has no valid reply address.");
  }

  const originalSubject = getHeader(payload, "Subject")
    .replace(/[\r\n]/g, " ")
    .trim();
  const replySubject = /^re\s*:/i.test(originalSubject)
    ? originalSubject
    : `Re: ${originalSubject || "(No subject)"}`;
  const messageId = getRfcMessageIds(getHeader(payload, "Message-ID"))[0];
  const references = [
    ...getRfcMessageIds(getHeader(payload, "References")),
    ...(messageId ? [messageId] : []),
  ]
    .slice(-8)
    .join(" ");
  const headers = [
    `To: ${address}`,
    `Subject: =?UTF-8?B?${Buffer.from(replySubject, "utf8").toString("base64")}?=`,
    ...(messageId ? [`In-Reply-To: ${messageId}`] : []),
    ...(references ? [`References: ${references}`] : []),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ];
  const normalizedBody = body.replace(/\r\n?/g, "\n").replace(/\n/g, "\r\n");
  const encodedBody =
    Buffer.from(normalizedBody, "utf8")
      .toString("base64")
      .match(/.{1,76}/g)
      ?.join("\r\n") || "";
  const mimeMessage = `${headers.join("\r\n")}\r\n\r\n${encodedBody}`;
  return Buffer.from(mimeMessage, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeMessagePart(data) {
  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
}

function messageParts(payload, visit) {
  if (!payload) return;
  visit(payload);
  payload.parts?.forEach((part) => messageParts(part, visit));
}

function getPlainText(payload) {
  const contents = [];
  messageParts(payload, (part) => {
    if (part.mimeType === "text/plain" && part.body?.data) {
      contents.push(decodeMessagePart(part.body.data));
    }
  });
  return contents.join("\n\n").slice(0, 12000);
}

function getAttachments(payload) {
  const attachments = [];
  messageParts(payload, (part) => {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        id: part.body.attachmentId,
        name: part.filename,
        mimeType: part.mimeType || "application/octet-stream",
      });
    }
  });
  return attachments;
}

function toEmail(message) {
  const payload = message.payload;
  const { sender, address } = parseSender(getHeader(payload, "From"));
  const text = getPlainText(payload);
  const bodyText = text || message.snippet || "";
  const labels = new Set(message.labelIds || []);
  const date = Number(message.internalDate);
  const palette = ["#b86b56", "#627b9a", "#9b7aa1", "#718b70", "#be8d54"];
  const colorIndex = [...sender].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % palette.length;
  const timestamp = Number.isFinite(date) && date > 0
    ? new Date(date).toISOString()
    : new Date().toISOString();
  const categoryLabel = [...labels].find((label) => label.startsWith("CATEGORY_"));
  const categories = {
    CATEGORY_PRIMARY: "Primary",
    CATEGORY_SOCIAL: "Social",
    CATEGORY_PROMOTIONS: "Promotions",
    CATEGORY_UPDATES: "Updates",
    CATEGORY_FORUMS: "Forums",
  };

  return {
    id: message.id,
    category: categories[categoryLabel] || "Inbox",
    sender,
    address,
    initials: sender
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase(),
    color: palette[colorIndex],
    subject: getHeader(payload, "Subject") || "(No subject)",
    summary: message.snippet || bodyText.slice(0, 180) || "No preview available.",
    timestamp,
    unread: labels.has("UNREAD"),
    important: labels.has("IMPORTANT"),
    starred: labels.has("STARRED"),
    actionRequired: false,
    priority: labels.has("IMPORTANT") ? "High" : "Low",
    deadline: null,
    body: bodyText
      ? bodyText.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
      : ["No message body available."],
    attachments: getAttachments(payload),
    insights: [],
    source: "gmail",
  };
}

function normalizeGoogleError(error) {
  const status = error.response?.status;
  const reasons = error.response?.data?.error?.errors?.map(
    (item) => item.reason,
  ) || [];
  const rateLimitedReasons = new Set([
    "rateLimitExceeded",
    "userRateLimitExceeded",
    "quotaExceeded",
  ]);
  if (
    status === 429 ||
    (status === 403 && reasons.some((reason) => rateLimitedReasons.has(reason)))
  ) {
    error.status = 429;
    error.publicMessage =
      "Gmail is temporarily rate-limiting requests. Wait briefly, then try again.";
    const retryAfter = Number(error.response?.headers?.["retry-after"]);
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      error.retryAfterSeconds = Math.min(Math.ceil(retryAfter), 3600);
    }
  } else if (status === 401) {
    error.status = 401;
    error.publicMessage =
      "Gmail authorization expired. Disconnect and reconnect your account.";
  } else if (status === 403) {
    error.status = 403;
    error.publicMessage =
      "Gmail permissions are missing or outdated. Disconnect Gmail and reconnect to approve the updated access.";
  }
  return error;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get(
  "/api/auth/status",
  asyncRoute(async (req, res) => {
    if (!req.session.gmailTokens) {
      return res.json({
        configured: googleCredentialsConfigured,
        connected: false,
        emailAddress: "",
      });
    }

    try {
      const gmail = gmailForRequest(req);
      const profile = await gmail.users.getProfile({ userId: "me" });
      return res.json({
        configured: true,
        connected: true,
        emailAddress: profile.data.emailAddress || "",
      });
    } catch (error) {
      throw normalizeGoogleError(error);
    }
  }),
);

app.get(
  "/auth/google",
  asyncRoute(async (req, res) => {
    const oauth = createOAuthClient();
    const state = crypto.randomBytes(32).toString("hex");
    req.session.oauthState = state;
    await saveSession(req);

    const url = oauth.generateAuthUrl({
      access_type: "offline",
      include_granted_scopes: true,
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/gmail.modify"],
      state,
    });
    res.redirect(url);
  }),
);

app.get(
  "/auth/google/callback",
  asyncRoute(async (req, res) => {
    if (req.query.error) {
      return res.redirect(`${appOrigin}/?email=1&gmail_error=access_denied`);
    }

    const state = req.query.state;
    const code = req.query.code;
    if (!matchesOAuthState(state, req.session.oauthState)) {
      throw new HttpError(400, "The Google OAuth state did not match. Try connecting again.");
    }
    if (typeof code !== "string") {
      throw new HttpError(400, "Google did not return an authorization code.");
    }

    const oauth = createOAuthClient();
    let tokens;
    try {
      ({ tokens } = await oauth.getToken(code));
    } catch (error) {
      console.error(`Google OAuth token exchange failed: ${error.message}`);
      return res.redirect(`${appOrigin}/?email=1&gmail_error=oauth_failed`);
    }
    if (!tokens.refresh_token) {
      return res.redirect(`${appOrigin}/?email=1&gmail_error=missing_refresh_token`);
    }

    await regenerateSession(req);
    req.session.gmailTokens = tokens;
    await saveSession(req);
    res.redirect(`${appOrigin}/?email=1&gmail=connected`);
  }),
);

app.post(
  "/api/auth/logout",
  asyncRoute(async (req, res) => {
    await new Promise((resolve, reject) => {
      req.session.destroy((error) => (error ? reject(error) : resolve()));
    });
    res.clearCookie("gmail.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });
    res.json({ connected: false });
  }),
);

app.get(
  "/api/gmail/labels",
  asyncRoute(async (req, res) => {
    try {
      const gmail = gmailForRequest(req);
      const result = await gmail.users.labels.list({
        userId: "me",
      });
      const labels = (result.data.labels || [])
        .filter((label) => label.id && label.name)
        .map(({ id, name, type }) => ({ id, name, type: type || "user" }));

      return res.json({ labels });
    } catch (error) {
      throw normalizeGoogleError(error);
    }
  }),
);

app.get(
  "/api/gmail/messages",
  asyncRoute(async (req, res) => {
    const { maxResults, pageToken, labelIds, q } =
      parseGmailMessageListQuery(req.query);

    try {
      const gmail = gmailForRequest(req);
      const result = await gmail.users.messages.list({
        userId: "me",
        maxResults,
        ...(pageToken ? { pageToken } : {}),
        ...(labelIds.length ? { labelIds } : {}),
        ...(q ? { q } : {}),
      });
      const ids = uniqueGmailMessageIds(result.data.messages || []);
      const messages = [];
      const concurrency = 5;
      let nextIndex = 0;
      let fetchError;
      await Promise.all(
        Array.from({ length: Math.min(concurrency, ids.length) }, async () => {
          while (!fetchError) {
            const index = nextIndex++;
            if (index >= ids.length) return;
            try {
              const response = await gmail.users.messages.get({
                userId: "me",
                id: ids[index],
                format: "full",
              });
              messages[index] = toEmail(response.data);
            } catch (error) {
              fetchError = error;
            }
          }
        }),
      );
      if (fetchError) throw fetchError;

      return res.json({
        messages,
        nextPageToken: result.data.nextPageToken || null,
        resultSizeEstimate: result.data.resultSizeEstimate ?? null,
      });
    } catch (error) {
      throw normalizeGoogleError(error);
    }
  }),
);

app.post(
  "/api/gmail/messages/actions",
  asyncRoute(async (req, res) => {
    const { ids, action } = req.body || {};
    const allowedActions = new Set([
      "markRead",
      "markUnread",
      "star",
      "unstar",
      "archive",
      "trash",
    ]);
    if (
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > 50 ||
      !ids.every(
        (id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,256}$/.test(id),
      )
    ) {
      throw new HttpError(400, "Provide between 1 and 50 valid Gmail message IDs.");
    }
    if (typeof action !== "string" || !allowedActions.has(action)) {
      throw new HttpError(400, "Choose a supported Gmail message action.");
    }

    const uniqueIds = [...new Set(ids)];
    try {
      const gmail = gmailForRequest(req);
      if (action === "trash") {
        const results = await Promise.allSettled(
          uniqueIds.map((id) =>
            gmail.users.messages.trash({ userId: "me", id }),
          ),
        );
        const permissionError = results.find(
          (result) =>
            result.status === "rejected" &&
            [401, 403].includes(result.reason.response?.status),
        );
        if (permissionError) {
          throw normalizeGoogleError(permissionError.reason);
        }
        return res.json({
          succeeded: uniqueIds.filter((_, index) => results[index].status === "fulfilled"),
          failed: uniqueIds.filter((_, index) => results[index].status === "rejected"),
        });
      }

      const updates = {
        markRead: { removeLabelIds: ["UNREAD"] },
        markUnread: { addLabelIds: ["UNREAD"] },
        star: { addLabelIds: ["STARRED"] },
        unstar: { removeLabelIds: ["STARRED"] },
        archive: { removeLabelIds: ["INBOX"] },
      }[action];
      await gmail.users.messages.batchModify({
        userId: "me",
        requestBody: { ids: uniqueIds, ...updates },
      });
      return res.json({ succeeded: uniqueIds, failed: [] });
    } catch (error) {
      throw normalizeGoogleError(error);
    }
  }),
);

app.post(
  "/api/gmail/messages/:messageId/reply",
  asyncRoute(async (req, res) => {
    const { messageId } = req.params;
    const { body } = req.body || {};
    if (!/^[A-Za-z0-9_-]{1,256}$/.test(messageId)) {
      throw new HttpError(400, "Provide a valid Gmail message ID.");
    }
    if (typeof body !== "string" || !body.trim() || body.length > 10000) {
      throw new HttpError(400, "Reply text must be between 1 and 10,000 characters.");
    }

    try {
      const gmail = gmailForRequest(req);
      const originalResponse = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });
      const original = originalResponse.data;
      const raw = createReplyRawMessage(original, body);
      const result = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw,
          threadId: original.threadId,
        },
      });
      return res.json({ sent: true, id: result.data.id || "" });
    } catch (error) {
      throw normalizeGoogleError(error);
    }
  }),
);

app.get(
  "/api/gmail/messages/:messageId/attachments/:attachmentId",
  asyncRoute(async (req, res) => {
    try {
      const gmail = gmailForRequest(req);
      const message = await gmail.users.messages.get({
        userId: "me",
        id: req.params.messageId,
        format: "full",
      });
      let attachmentPart;
      messageParts(message.data.payload, (part) => {
        if (part.body?.attachmentId === req.params.attachmentId) {
          attachmentPart = part;
        }
      });
      if (!attachmentPart?.filename) {
        throw new HttpError(404, "The Gmail attachment was not found.");
      }

      const result = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: req.params.messageId,
        id: req.params.attachmentId,
      });
      const data = result.data.data;
      if (!data) {
        throw new HttpError(404, "The Gmail attachment has no downloadable content.");
      }

      const bytes = Buffer.from(
        data.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      );
      const filename = attachmentPart.filename.replace(/[^\x20-\x7E]|[\\/"\r\n]/g, "_");
      const encodedFilename = encodeURIComponent(attachmentPart.filename).replace(
        /['()*]/g,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
      );
      res.setHeader("Content-Type", attachmentPart.mimeType || "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "no-store");
      return res.send(bytes);
    } catch (error) {
      throw normalizeGoogleError(error);
    }
  }),
);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

app.use((error, req, res, _next) => {
  const status = error.status || 500;
  console.error(`Request failed for ${req.method} ${req.path}: ${error.message}`);
  if (status === 429) {
    res.setHeader("Retry-After", String(error.retryAfterSeconds || 30));
  }
  res.status(status).json({
    error:
      error.publicMessage ||
      (status < 500 ? error.message : "The Gmail backend request failed. Check the server logs."),
  });
});

app.listen(port, () => {
  console.log(`Gmail backend listening on http://localhost:${port}`);
});
