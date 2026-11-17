export function parseGmailMessageListQuery(query = {}) {
  const rawMaxResults = query.maxResults ?? "25";
  const maxResults = Number(rawMaxResults);
  if (
    (typeof rawMaxResults !== "string" && typeof rawMaxResults !== "number") ||
    !Number.isInteger(maxResults) ||
    maxResults < 20 ||
    maxResults > 30
  ) {
    throw Object.assign(
      new Error("maxResults must be an integer between 20 and 30."),
      { status: 400 },
    );
  }

  const rawPageToken = query.pageToken;
  if (
    rawPageToken !== undefined &&
    (typeof rawPageToken !== "string" ||
      rawPageToken.length === 0 ||
      rawPageToken.length > 2048)
  ) {
    throw Object.assign(
      new Error("pageToken must be a non-empty string up to 2048 characters."),
      { status: 400 },
    );
  }

  const rawLabelIds = query.labelIds;
  const labelIds =
    rawLabelIds === undefined
      ? []
      : Array.isArray(rawLabelIds)
        ? rawLabelIds
        : [rawLabelIds];
  if (
    labelIds.length > 20 ||
    labelIds.some(
      (labelId) =>
        typeof labelId !== "string" ||
        labelId.length > 255 ||
        !/^[A-Za-z0-9_-]+$/.test(labelId),
    )
  ) {
    throw Object.assign(
      new Error("labelIds must contain valid Gmail label IDs."),
      { status: 400 },
    );
  }

  const rawQuery = query.q;
  if (
    rawQuery !== undefined &&
    (typeof rawQuery !== "string" || rawQuery.length > 500)
  ) {
    throw Object.assign(new Error("q must be a string up to 500 characters."), {
      status: 400,
    });
  }

  const q = rawQuery?.trim() || (labelIds.length ? undefined : "in:inbox");
  return {
    maxResults,
    pageToken: rawPageToken,
    labelIds: [...new Set(labelIds)],
    q,
  };
}

export function uniqueGmailMessageIds(messages = []) {
  return [
    ...new Set(
      messages
        .map((message) => message?.id)
        .filter((id) => typeof id === "string" && id.length > 0),
    ),
  ];
}
