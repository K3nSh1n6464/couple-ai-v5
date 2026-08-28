import JSZip from "jszip";
import type { ImportResult, UnifiedMessage } from "./types";

type ZipTextFile = {
  name: string;
  text: string;
};

async function readTextFiles(file: File): Promise<ZipTextFile[]> {
  const zip = await JSZip.loadAsync(file);
  const result: ZipTextFile[] = [];

  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];

    if (entry.dir) continue;

    const lower = name.toLowerCase();

    // Pour WhatsApp, on cherche surtout les TXT.
    if (!lower.endsWith(".txt")) continue;

    try {
      result.push({
        name,
        text: await entry.async("text"),
      });
    } catch {
      // Ignore les fichiers qui ne peuvent pas être lus.
    }
  }

  return result;
}

function parseWhatsAppText(
  text: string
): UnifiedMessage[] {
  const lines = text.replace(/\r/g, "").split("\n");

  const messages: UnifiedMessage[] = [];

  const regs = [
    /^\[?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+-\s+([^:]+):\s?(.*)$/,
    /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),\s+(\d{1,2}:\d{2})\s+-\s+([^:]+):\s?(.*)$/,
  ];

  let current: UnifiedMessage | null = null;

  for (const line of lines) {
    const match = regs
      .map((r) => line.match(r))
      .find(Boolean);

    if (match) {
      if (current) {
        messages.push(current);
      }

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

  if (current) {
    messages.push(current);
  }

  return messages.filter(
    (m) =>
      m.text.trim() &&
      !m.text.includes(
        "Messages and calls are end-to-end encrypted"
      )
  );
}

export async function importWhatsAppZip(
  file: File
): Promise<ImportResult> {
  const files = await readTextFiles(file);

  if (!files.length) {
    throw new Error(
      "Archive WhatsApp valide, mais aucun fichier TXT n'a été trouvé. Vérifie que tu as exporté la conversation avec l'option d'inclure les médias désactivée."
    );
  }

  const allMessages: UnifiedMessage[] = [];

  for (const item of files) {
    const messages = parseWhatsAppText(item.text);

    allMessages.push(...messages);
  }

  const messages = dedupe(allMessages);

  if (!messages.length) {
    throw new Error(
      "Le ZIP contient bien un fichier TXT, mais aucun message WhatsApp exploitable n'a été trouvé."
    );
  }

  return {
    platform: "whatsapp",
    messages,
    conversations: [],
    warnings: [],
  };
}

function dedupe(messages: UnifiedMessage[]) {
  const seen = new Set<string>();

  return messages.filter((m) => {
    const key = `${m.date}|${m.sender}|${m.text}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}