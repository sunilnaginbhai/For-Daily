import sanitizeHtml from "sanitize-html";

const allowedEmailTags = [
  ...new Set([
    ...sanitizeHtml.defaults.allowedTags,
    "img",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "td",
    "th",
    "hr",
    "sub",
    "sup",
  ]),
];

const allowedEmailStyles = {
  "*": {
    color: [
      /^#[\da-f]{3,8}$/i,
      /^rgba?\([\d.%\s,]+\)$/i,
      /^hsla?\([\d.%\s,]+\)$/i,
      /^[a-z]{3,20}$/i,
    ],
    "background-color": [
      /^#[\da-f]{3,8}$/i,
      /^rgba?\([\d.%\s,]+\)$/i,
      /^hsla?\([\d.%\s,]+\)$/i,
      /^[a-z]{3,20}$/i,
    ],
    "font-family": [/^[\w\s,"'-]+$/],
    "font-size": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
    "font-style": [/^(?:normal|italic|oblique)$/i],
    "font-weight": [/^(?:normal|bold|[1-9]00)$/i],
    height: [/^(?:\d+(?:\.\d+)?(?:px|pt|em|rem|%)|auto)$/i],
    "line-height": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)?$/i],
    margin: [/^(?:(?:auto|\d+(?:\.\d+)?(?:px|pt|em|rem|%)?)\s*){1,4}$/i],
    "margin-bottom": [/^(?:auto|[\d.]+(?:px|pt|em|rem|%)?)$/i],
    "margin-left": [/^(?:auto|[\d.]+(?:px|pt|em|rem|%)?)$/i],
    "margin-right": [/^(?:auto|[\d.]+(?:px|pt|em|rem|%)?)$/i],
    "margin-top": [/^(?:auto|[\d.]+(?:px|pt|em|rem|%)?)$/i],
    "max-height": [/^(?:\d+(?:\.\d+)?(?:px|pt|em|rem|%)|none)$/i],
    "max-width": [/^(?:\d+(?:\.\d+)?(?:px|pt|em|rem|%)|none)$/i],
    "min-height": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
    "min-width": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
    padding: [/^(?:\d+(?:\.\d+)?(?:px|pt|em|rem|%)?\s*){1,4}$/i],
    "padding-bottom": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
    "padding-left": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
    "padding-right": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
    "padding-top": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
    "text-align": [/^(?:left|right|center|justify|start|end)$/i],
    "text-decoration": [/^(?:none|underline|line-through|overline)$/i],
    "text-transform": [/^(?:none|capitalize|uppercase|lowercase)$/i],
    "vertical-align": [/^(?:baseline|top|middle|bottom|text-top|text-bottom)$/i],
    width: [/^(?:\d+(?:\.\d+)?(?:px|pt|em|rem|%)|auto)$/i],
    display: [/^(?:block|inline|inline-block|table|table-cell|table-row)$/i],
    "border-collapse": [/^(?:collapse|separate)$/i],
    "border-radius": [/^(?:\d+(?:\.\d+)?(?:px|pt|em|rem|%)\s*){1,4}$/i],
    "letter-spacing": [/^(?:normal|[-]?\d+(?:\.\d+)?(?:px|em))$/i],
    "white-space": [/^(?:normal|nowrap|pre|pre-wrap|pre-line)$/i],
  },
};

function decodeMessagePart(data) {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function normalizeContentId(value) {
  return String(value || "")
    .trim()
    .replace(/^<|>$/g, "")
    .toLowerCase();
}

function looksLikeHtml(value) {
  return /<(?:!doctype\s+html|html|body|div|p|table|img|br|h[1-6])(?:\s|\/?>)/i.test(value);
}

export function getGmailHeader(payload, name) {
  return (
    payload?.headers?.find(
      (header) => header.name?.toLowerCase() === name.toLowerCase(),
    )?.value || ""
  );
}

export function messageParts(payload, visit) {
  if (!payload) return;
  visit(payload);
  payload.parts?.forEach((part) => messageParts(part, visit));
}

function getInlineImages(payload) {
  const images = [];
  messageParts(payload, (part) => {
    const contentId = normalizeContentId(getGmailHeader(part, "Content-ID"));
    if (
      !contentId ||
      !part.body?.attachmentId ||
      !part.mimeType?.startsWith("image/")
    ) {
      return;
    }

    images.push({
      id: part.body.attachmentId,
      contentId,
      mimeType: part.mimeType,
    });
  });
  return images;
}

function sanitizeEmailHtml(html, messageId, inlineImages) {
  const inlineByContentId = new Map(
    inlineImages.map((image) => [image.contentId, image]),
  );

  return sanitizeHtml(html.slice(0, 200_000), {
    allowedTags: allowedEmailTags,
    allowedAttributes: {
      "*": ["dir", "lang", "style", "align", "valign"],
      a: ["href", "name", "target", "rel", "title", "style"],
      img: [
        "src",
        "alt",
        "title",
        "width",
        "height",
        "style",
        "data-external-src",
      ],
      table: ["width", "border", "cellpadding", "cellspacing", "style", "align"],
      td: ["colspan", "rowspan", "width", "height", "style", "align", "valign"],
      th: ["colspan", "rowspan", "width", "height", "style", "align", "valign"],
      ol: ["start", "type"],
      li: ["value"],
    },
    allowedStyles: allowedEmailStyles,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attributes) => ({
        tagName,
        attribs: {
          ...attributes,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      img: (tagName, attributes) => {
        const source = attributes.src || "";
        if (/^cid:/i.test(source)) {
          const image = inlineByContentId.get(
            normalizeContentId(source.slice(4)),
          );
          if (!image) {
            return {
              tagName,
              attribs: { alt: attributes.alt || "Embedded image unavailable" },
            };
          }

          return {
            tagName,
            attribs: {
              ...attributes,
              src: `/api/gmail/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(image.id)}?inline=1`,
            },
          };
        }

        if (/^https?:\/\//i.test(source)) {
          const { src: _src, ...safeAttributes } = attributes;
          return {
            tagName,
            attribs: { ...safeAttributes, "data-external-src": source },
          };
        }

        if (
          !/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z\d+/]+=*$/i.test(
            source,
          )
        ) {
          const { src: _src, ...safeAttributes } = attributes;
          return { tagName, attribs: safeAttributes };
        }

        return { tagName, attribs: attributes };
      },
    },
  });
}

export function getGmailMessageContent(payload, messageId) {
  const plainParts = [];
  const htmlParts = [];
  messageParts(payload, (part) => {
    if (typeof part.body?.data !== "string" || !part.body.data) return;
    if (part.mimeType === "text/plain") {
      plainParts.push(decodeMessagePart(part.body.data));
    } else if (part.mimeType === "text/html") {
      htmlParts.push(decodeMessagePart(part.body.data));
    }
  });

  let plainText = plainParts.join("\n\n").slice(0, 12000);
  const html = htmlParts.join("\n") || (looksLikeHtml(plainText) ? plainText : "");
  if (html && !htmlParts.length) plainText = "";

  const inlineImages = getInlineImages(payload);
  return {
    plainText,
    htmlBody: html ? sanitizeEmailHtml(html, messageId, inlineImages) : "",
    inlineImages,
  };
}

export function getGmailAttachments(payload, inlineImages = []) {
  const inlineImageIds = new Set(inlineImages.map((image) => image.id));
  const attachments = [];
  messageParts(payload, (part) => {
    if (
      part.filename &&
      part.body?.attachmentId &&
      !inlineImageIds.has(part.body.attachmentId)
    ) {
      attachments.push({
        id: part.body.attachmentId,
        name: part.filename,
        mimeType: part.mimeType || "application/octet-stream",
      });
    }
  });
  return attachments;
}
