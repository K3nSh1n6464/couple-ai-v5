import JSZip from "jszip";
import {
  importInstagramJson,
  importSnapchatJson,
  importTelegramJson,
} from "./index";
import type { ImportResult, UnifiedMessage } from "./types";

type ZipJsonFile = {
  name: string;
  text: string;
};

async function readJsonFiles(file: File): Promise<ZipJsonFile[]> {
  const zip = await JSZip.loadAsync(file);
  const result: ZipJsonFile[] = [];

  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];

    if (entry.dir || !name.toLowerCase().endsWith(".json")) continue;

    try {
      result.push({
        name,
        text: await entry.async("text"),
      });
    } catch {
      // Ignore files that cannot be decoded as text.
    }
  }

  return result;
}

function guessPlatform(name: string, text: string) {
  const n = name.toLowerCase();
  const t = text.slice(0, 20000).toLowerCase();

  if (
    n.includes("telegram") ||
    n.includes("result.json") ||
    t.includes('"personal_information"') &&
      t.includes('"chats"')
  ) {
    return "telegram";
  }

  if (
    n.includes("instagram") ||
    n.includes("messages/inbox") ||
    n.includes("inbox") &&
      (t.includes("sender_name") || t.includes("timestamp_ms"))
  ) {
    return "instagram";
  }

  if (
    n.includes("snapchat") ||
    n.includes("saved_chat") ||
    t.includes("saved chat history")
  ) {
    return "snapchat";
  }

  return null;
}

export async function importSocialZip(
  file: File
): Promise<ImportResult> {
  const files = await readJsonFiles(file);

  const results: ImportResult[] = [];
  const warnings: string[] = [];

  for (const item of files) {
    const platform = guessPlatform(item.name, item.text);

    if (platform === "telegram") {
      results.push(importTelegramJson(item.text, item.name));
    } else if (platform === "instagram") {
      results.push(importInstagramJson(item.text, item.name));
    } else if (platform === "snapchat") {
      results.push(importSnapchatJson(item.text, item.name));
    }
  }

  for (const result of results) {
    warnings.push(...result.warnings);
  }

  const messages = dedupe(
    results.flatMap((result) => result.messages)
  );

  const platforms = [...new Set(results.map((r) => r.platform))];

  if (!messages.length) {
    throw new Error(
      "Aucun fichier de conversation reconnu dans cette archive."
    );
  }

  return {
    platform:
      platforms.length === 1 ? platforms[0] : "telegram",
    messages,
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
    const key = `${m.platform}|${m.date}|${m.sender}|${m.text}|${m.conversation ?? ""}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}
