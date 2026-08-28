import type { ImportResult, UnifiedMessage } from "./types";

function formatDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function telegramText(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const obj = part as Record<string, unknown>;
          return typeof obj.text === "string" ? obj.text : "";
        }
        return "";
      })
      .join("");
  }

  return "";
}

export function importTelegramJson(
  text: string,
  source = "result.json"
): ImportResult {
  const warnings: string[] = [];
  const messages: UnifiedMessage[] = [];

  try {
    const data = JSON.parse(text) as Record<string, unknown>;

    const chats = Array.isArray(data.chats)
      ? data.chats
      : Array.isArray(data.messages)
        ? [{ name: data.name, messages: data.messages }]
        : [];

    for (const rawChat of chats) {
      if (!rawChat || typeof rawChat !== "object") continue;

      const chat = rawChat as Record<string, unknown>;
      const conversation =
        typeof chat.name === "string"
          ? chat.name
          : typeof chat.title === "string"
            ? chat.title
            : undefined;

      const rawMessages = Array.isArray(chat.messages)
        ? chat.messages
        : [];

      for (const raw of rawMessages) {
        if (!raw || typeof raw !== "object") continue;

        const item = raw as Record<string, unknown>;
        const textValue = telegramText(item.text);
        const sender =
          typeof item.from === "string"
            ? item.from
            : typeof item.actor === "string"
              ? item.actor
              : "";

        const date = formatDate(item.date);

        if (!sender || !date || !textValue.trim()) continue;

        messages.push({
          date,
          sender,
          text: textValue.trim(),
          platform: "telegram",
          conversation,
          attachment:
            item.type === "service" ||
            typeof item.media_type === "string" ||
            Boolean(item.file),
          source,
        });
      }
    }
  } catch {
    warnings.push(`${source}: JSON Telegram illisible.`);
  }

  if (!messages.length) {
    warnings.push(
      "Aucun message Telegram exploitable trouvé. Utilise l'export JSON de Telegram Desktop."
    );
  }

  return {
    platform: "telegram",
    messages: dedupe(messages),
    conversations: [
      ...new Set(
        messages
          .map((m) => m.conversation)
          .filter((x): x is string => Boolean(x))
      ),
    ],
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
