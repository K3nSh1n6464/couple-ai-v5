import type { ImportResult, UnifiedMessage } from "./types";

function normalizeDate(value: unknown): string | null {
  if (typeof value === "number") {
    // Instagram exports can use Unix timestamps in seconds.
    const millis = value < 10_000_000_000 ? value * 1000 : value;
    const d = new Date(millis);
    return Number.isNaN(d.getTime()) ? null : formatDate(d);
  }

  if (typeof value !== "string") return null;

  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return formatDate(d);

  const unix = Number(value);
  if (Number.isFinite(unix)) {
    const millis = unix < 10_000_000_000 ? unix * 1000 : unix;
    const dd = new Date(millis);
    if (!Number.isNaN(dd.getTime())) return formatDate(dd);
  }

  return null;
}

function formatDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function extractText(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;

          if (typeof obj.text === "string") return obj.text;
          if (typeof obj.title === "string") return obj.title;
          if (typeof obj.value === "string") return obj.value;
        }

        return "";
      })
      .join("");
  }

  return "";
}

function parseMessage(
  item: Record<string, unknown>,
  conversation?: string
) {
  const sender =
    typeof item.sender_name === "string"
      ? item.sender_name
      : typeof item.sender === "string"
        ? item.sender
        : typeof item.from === "string"
          ? item.from
          : "";

  const text =
    extractText(item.content) ||
    extractText(item.text) ||
    extractText(item.message);

  const date =
    normalizeDate(item.timestamp_ms) ??
    normalizeDate(item.timestamp) ??
    normalizeDate(item.date) ??
    normalizeDate(item.created_at);

  if (!sender || !date || !text.trim()) return null;

  return {
    date,
    sender,
    text: text.trim(),
    platform: "instagram" as const,
    conversation,
    attachment:
      Boolean(item.photos) ||
      Boolean(item.videos) ||
      Boolean(item.media),
  };
}

function walk(
  value: unknown,
  messages: ReturnType<typeof parseMessage>[],
  conversation?: string
) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, messages, conversation);
    return;
  }

  if (!value || typeof value !== "object") return;

  const obj = value as Record<string, unknown>;

  let nextConversation = conversation;

  if (typeof obj.title === "string") {
    nextConversation = obj.title;
  }

  if (Array.isArray(obj.messages)) {
    for (const item of obj.messages) {
      if (item && typeof item === "object") {
        const parsed = parseMessage(
          item as Record<string, unknown>,
          nextConversation
        );

        if (parsed) messages.push(parsed);
      }
    }
  }

  for (const [key, child] of Object.entries(obj)) {
    if (
      key === "messages" ||
      key === "participants" ||
      key === "conversation" ||
      key === "conversation_data"
    ) {
      continue;
    }

    if (
      key === "direct" ||
      key === "inbox" ||
      key === "threads" ||
      key === "conversations"
    ) {
      walk(child, messages, nextConversation);
    }
  }
}

export function importInstagramJson(
  text: string,
  source = "instagram.json"
): ImportResult {
  const warnings: string[] = [];
  const messages: ReturnType<typeof parseMessage>[] = [];

  try {
    const data = JSON.parse(text);
    walk(data, messages);
  } catch {
    warnings.push(`${source}: JSON Instagram illisible.`);
  }

  const clean = messages.filter(
    (m): m is NonNullable<typeof m> => Boolean(m)
  );

  const unique = dedupe(clean);

  if (!unique.length) {
    warnings.push(
      "Aucun DM Instagram exploitable trouvé. Les exports Instagram peuvent changer de structure selon le format choisi dans Accounts Center."
    );
  }

  return {
    platform: "instagram",
    messages: unique,
    conversations: [
      ...new Set(
        unique
          .map((m) => m.conversation)
          .filter((x): x is string => Boolean(x))
      ),
    ],
    warnings,
  };
}

function dedupe<T extends { date: string; sender: string; text: string; conversation?: string }>(
  messages: T[]
) {
  const seen = new Set<string>();

  return messages.filter((m) => {
    const key = `${m.date}|${m.sender}|${m.text}|${m.conversation ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
