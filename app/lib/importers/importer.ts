import type { ImportResult, UnifiedMessage } from "./types";
import { importWhatsAppZip } from "./zip";

export async function importConversationFile(
  file: File
): Promise<ImportResult> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".zip")) {
    return importWhatsAppZip(file);
  }

  if (lower.endsWith(".txt")) {
    return importWhatsAppTxt(file);
  }

  throw new Error(
    "Format non reconnu. Utilise un export WhatsApp au format TXT ou ZIP."
  );
}

async function importWhatsAppTxt(
  file: File
): Promise<ImportResult> {
  const text = await file.text();
  const messages = parseWhatsAppText(text);

  if (!messages.length) {
    throw new Error(
      "Format WhatsApp non reconnu. Aucun message exploitable n'a été trouvé dans ce fichier."
    );
  }

  return {
    platform: "whatsapp",
    messages,
    conversations: [],
    warnings: [],
  };
}

export function parseWhatsAppText(
  text: string
): UnifiedMessage[] {
  const lines = text.replace(/\r/g, "").split("\n");

  const messages: UnifiedMessage[] = [];

  /*
   * Formats WhatsApp acceptés :
   *
   * 05/05/2023, 19:26 - Kévin: Bonjour
   * 05/05/2023, 7:26 PM - Kévin: Bonjour
   * 05/05/2023, 7:26 soir - Kévin: Bonjour
   * [05/05/2023, 19:26] - Kévin: Bonjour
   * 05/05/23, 19:26 - Kévin: Bonjour
   */

  const regs = [
    /^\[?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:(AM|PM|am|pm|matin|soir|nuit|après-midi|apres-midi))?\]?\s*-\s*([^:]+):\s?(.*)$/i,

    /^\[?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:(AM|PM|am|pm|matin|soir|nuit|après-midi|apres-midi))?\]?\s*-\s*([^:]+):\s?(.*)$/i,
  ];

  let current: UnifiedMessage | null = null;

  for (const line of lines) {
    const match = regs
      .map((regex) => line.match(regex))
      .find(Boolean);

    if (match) {
      if (current) {
        messages.push(current);
      }

      const date = match[1];
      const time = match[2];
      const period = match[3] || "";
      const sender = match[4].trim();
      const messageText = match[5] || "";

      current = {
        date: `${date} ${time}${period ? ` ${period}` : ""}`,
        sender,
        text: messageText,
        platform: "whatsapp",
      };
    } else if (current && line.trim()) {
      /*
       * Les messages WhatsApp peuvent être sur plusieurs lignes.
       * Une ligne qui ne commence pas par une date est donc
       * considérée comme la suite du message précédent.
       */
      current.text += `\n${line}`;
    }
  }

  if (current) {
    messages.push(current);
  }

  return messages.filter((message) => {
    const text = message.text.trim();

    if (!text) return false;

    const systemMessages = [
      "Messages and calls are end-to-end encrypted",
      "Messages and calls are secured with end-to-end encryption",
      "Les messages et appels sont chiffrés de bout en bout",
      "Les messages et les appels sont chiffrés de bout en bout",
    ];

    return !systemMessages.some((system) =>
      text.includes(system)
    );
  });
}