import type { ImportResult, UnifiedMessage } from "./types";

function toDateString(value: unknown): string | null {
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : formatDate(d);
  }

  if (typeof value !== "string") return null;

  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return formatDate(d);

  const m = value.match(
    /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4}).*?(\d{1,2}):(\d{2})/
  );

  if (!m) return null;

  let y = Number(m[3]);
  if (y < 100) y += 2000;

  return formatDate(
    new Date(y, Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]))
  );
}

function formatDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function pushIfValid(
  output: UnifiedMessage[],
  item: Record<string, unknown>,
  conversation?: string
) {
  const text =
    typeof item.text === "string"
      ? item.text
      : typeof item.message === "string"
        ? item.message
        : typeof item.content === "string"
          ? item.content
          : "";

  const sender =
    typeof item.sender === "string"
      ? item.sender
      : typeof item.from === "string"
        ? item.from
        : typeof item.username === "string"
          ? item.username
          : "";

  const date =
    toDateString(item.date) ??
    toDateString(item.timestamp) ??
    toDateString(item.created_at) ??
    toDateString(item.createdAt);

  if (!sender || !date || !text.trim()) return;

  output.push({
    date,
    sender,
    text: text.trim(),
    platform: "snapchat",
    conversation,
    attachment:
      Boolean(item.attachment) ||
      Boolean(item.media) ||
      Boolean(item.media_url),
  });
}

function walk(
  value: unknown,
  output: UnifiedMessage[],
  conversation?: string
) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, output, conversation);
    return;
  }

  if (!value || typeof value !== "object") return;

  const obj = value as Record<string, unknown>;

  const nextConversation =
    typeof obj.conversation === "string"
      ? obj.conversation
      : typeof obj.chat === "string"
        ? obj.chat
        : typeof obj.name === "string" && /chat|conversation/i.test(
            typeof obj.type === "string" ? obj.type : ""
          )
          ? obj.name
          : conversation;

  pushIfValid(output, obj, nextConversation);

  for (const [key, child] of Object.entries(obj)) {
    if (
      key === "messages" ||
      key === "chats" ||
      key === "conversations" ||
      key === "saved_chat_history" ||
      key === "saved_chat_history.json"
    ) {
      walk(child, output, nextConversation);
    }
  }
}

export function importSnapchatJson(
  text: string,
  source = "snapchat.json"
): ImportResult {
  const warnings: string[] = [];
  const messages: UnifiedMessage[] = [];

  try {
    const data = JSON.parse(text);
    walk(data, messages);
  } catch {
    warnings.push(
      `${source}: JSON illisible. Le fichier sera ignoré.`
    );
  }

  const unique = dedupe(messages);

  if (!unique.length) {
    warnings.push(
      "Aucun message Snapchat exploitable trouvé. L'export My Data peut contenir l'historique des chats sous un autre format."
    );
  }

  return {
    platform: "snapchat",
    messages: unique,
    conversations: uniqueConversations(unique),
    warnings,
  };
}

function dedupe(messages: UnifiedMessage[]) {
  const seen = new Set<string>();
  return messages.filter((m) => {
    const key = `${m.date}|${m.sender}|${m.text}|${m.conversation ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueConversations(messages: UnifiedMessage[]) {
  return [...new Set(
    messages
      .map((m) => m.conversation)
      .filter((x): x is string => Boolean(x))
  )];
}
