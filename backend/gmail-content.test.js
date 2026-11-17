import assert from "node:assert/strict";
import test from "node:test";
import {
  getGmailAttachments,
  getGmailMessageContent,
} from "./gmail-content.js";

function encodePart(value) {
  return Buffer.from(value).toString("base64url");
}

test("sanitizes HTML and maps inline CID images to authenticated attachment URLs", () => {
  const payload = {
    mimeType: "multipart/related",
    parts: [
      {
        mimeType: "text/plain",
        body: { data: encodePart("Plain alternative") },
      },
      {
        mimeType: "text/html",
        body: {
          data: encodePart(
            '<p style="color:#334455">Hello</p><img src="cid:hero-image" onerror="alert(1)"><script>alert(2)</script><img src="https://images.example.test/banner.jpg">',
          ),
        },
      },
      {
        mimeType: "image/png",
        filename: "hero.png",
        headers: [{ name: "Content-ID", value: "<hero-image>" }],
        body: { attachmentId: "att/hero" },
      },
    ],
  };

  const content = getGmailMessageContent(payload, "message/one");
  assert.equal(content.plainText, "Plain alternative");
  assert.equal(content.inlineImages.length, 1);
  assert.match(
    content.htmlBody,
    /src="\/api\/gmail\/messages\/message%2Fone\/attachments\/att%2Fhero\?inline=1"/,
  );
  assert.match(
    content.htmlBody,
    /data-external-src="https:\/\/images\.example\.test\/banner\.jpg"/,
  );
  assert.doesNotMatch(content.htmlBody, /onerror|<script/i);
  assert.deepEqual(getGmailAttachments(payload, content.inlineImages), []);
});

test("recognizes HTML in a plain-text MIME part and sanitizes it", () => {
  const content = getGmailMessageContent(
    {
      mimeType: "text/plain",
      body: { data: encodePart("<p>Visible message</p>") },
    },
    "message-2",
  );

  assert.equal(content.plainText, "");
  assert.equal(content.htmlBody, "<p>Visible message</p>");
});

test("preserves ordinary plain text and named attachments", () => {
  const payload = {
    mimeType: "multipart/mixed",
    parts: [
      {
        mimeType: "text/plain",
        body: { data: encodePart("A plain email.") },
      },
      {
        mimeType: "application/pdf",
        filename: "report.pdf",
        body: { attachmentId: "attachment-1" },
      },
    ],
  };

  const content = getGmailMessageContent(payload, "message-3");
  assert.equal(content.plainText, "A plain email.");
  assert.equal(content.htmlBody, "");
  assert.deepEqual(getGmailAttachments(payload, content.inlineImages), [
    {
      id: "attachment-1",
      name: "report.pdf",
      mimeType: "application/pdf",
    },
  ]);
});
