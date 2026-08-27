import JSZip from "jszip";
import { importInstagramJson } from "./instagram";
import { importSnapchatJson } from "./snapchat";
import { importTelegramJson } from "./telegram";
import type { ImportResult, UnifiedMessage } from "./types";
import { importSocialZip } from "./zip";

export async function importConversationFile(
  file: File
): Promise<ImportResult> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".zip")) {
    return importSocialZip(file);
  }

  if (lower.endsWith(".json")) {
    const text = await file.text();

    const name = lower;

    if (name.includes("telegram") || name.includes("result.json")) {
      return importTelegramJson(text, file.name);
    }

    if (
      name.includes("instagram") ||
      text.includes("timestamp_ms") ||
      text.includes("sender_name")
    ) {
      return importInstagramJson(text, file.name);
    }

    return importSnapchatJson(text, file.name);
  }

  if (lower.endsWith(".txt")) {
    return importWhatsAppTxt(file);
  }

  throw new Error(
    "Format non reconnu. Utilise un export WhatsApp TXT/ZIP ou un export Snapchat, Instagram ou Telegram en ZIP/JSON."
  );
}

async function importWhatsAppTxt(
  file: File
): Promise<ImportResult> {
  const text = await file.text();
  const lines = text.replace(/\r/g, "").split("\n");

  const messages: UnifiedMessage[] = [];

  const regs = [
    /^\[?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+-\s+([^:]+):\s?(.*)$/,
    /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),\s+(\d{1,2}:\d{2})\s+-\s+([^:]+):\s?(.*)$/,
  ];

  let current: UnifiedMessage | null = null;

  for (const line of lines) {
    const match = regs.map((r) => line.match(r)).find(Boolean);

    if (match) {
      if (current) messages.push(current);

      current = {
        date: `${match[1]} ${match[2]}`,
        sender: match[3].trim(),
        text: match[4] || "",
        platform: "whatsapp",
      };
    } else if (current && line.trim()) {
      current.text += `\n${line}`;
    }
  }

  if (current) messages.push(current);

  const clean = messages.filter(
    (m) =>
      m.text.trim() &&
      !m.text.includes(
        "Messages and calls are end-to-end encrypted"
      )
  );

  if (!clean.length) {
    throw new Error("Format WhatsApp non reconnu.");
  }

  return {
    platform: "whatsapp",
    messages: clean,
    conversations: [],
    warnings: [],
  };
}
