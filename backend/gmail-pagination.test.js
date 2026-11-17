import assert from "node:assert/strict";
import test from "node:test";
import {
  parseGmailMessageListQuery,
  uniqueGmailMessageIds,
} from "./gmail-pagination.js";

test("defaults to one 25-message inbox page", () => {
  assert.deepEqual(parseGmailMessageListQuery(), {
    maxResults: 25,
    pageToken: undefined,
    labelIds: [],
    q: "in:inbox",
  });
});

test("preserves the requested token, labels, and Gmail search query", () => {
  assert.deepEqual(
    parseGmailMessageListQuery({
      maxResults: "20",
      pageToken: "opaque-token",
      labelIds: ["INBOX", "UNREAD", "INBOX"],
      q: "from:team@example.com newer_than:7d",
    }),
    {
      maxResults: 20,
      pageToken: "opaque-token",
      labelIds: ["INBOX", "UNREAD"],
      q: "from:team@example.com newer_than:7d",
    },
  );
});

test("rejects page sizes outside the bounded page range", () => {
  for (const maxResults of ["1", "31", "25.5", "all"]) {
    assert.throws(
      () => parseGmailMessageListQuery({ maxResults }),
      { status: 400 },
    );
  }
});

test("rejects malformed tokens and Gmail label IDs", () => {
  assert.throws(
    () => parseGmailMessageListQuery({ pageToken: ["not-a-token"] }),
    { status: 400 },
  );
  assert.throws(
    () => parseGmailMessageListQuery({ labelIds: ["INBOX", "bad label"] }),
    { status: 400 },
  );
});

test("deduplicates message IDs and ignores malformed list entries", () => {
  assert.deepEqual(
    uniqueGmailMessageIds([
      { id: "one" },
      { id: "one" },
      { id: "two" },
      {},
      { id: "" },
    ]),
    ["one", "two"],
  );
});
