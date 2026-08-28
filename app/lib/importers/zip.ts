import JSZip from "jszip";
import type { ImportResult } from "./types";
import { parseWhatsAppText } from "./importer";

type ZipTextFile = {
  name: string;
  text: string;
};

async function readTextFiles(
  file: File
): Promise<ZipTextFile[]> {
  const zip = await JSZip.loadAsync(file);

  const result: ZipTextFile[] = [];

  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];

    if (entry.dir) continue;

    const lower = name.toLowerCase();

    if (!lower.endsWith(".txt")) continue;

    try {
      result.push({
        name,
        text: await entry.async("text"),
      });
    } catch {
      // Ignore les fichiers TXT illisibles.
    }
  }

  return result;
}

export async function importWhatsAppZip(
  file: File
): Promise<ImportResult> {
  let files: ZipTextFile[];

  try {
    files = await readTextFiles(file);
  } catch {
    throw new Error(
      "Impossible de lire cette archive ZIP. Vérifie qu'il s'agit bien d'un export WhatsApp valide."
    );
  }

  if (!files.length) {
    throw new Error(
      "Le ZIP WhatsApp est valide, mais aucun fichier TXT n'a été trouvé dans l'archive."
    );
  }

  const allMessages = [];

  for (const item of files) {
    const messages = parseWhatsAppText(item.text);

    allMessages.push(...messages);
  }

  const messages = dedupe(allMessages);

  if (!messages.length) {
    throw new Error(
      "Le fichier ZIP contient bien un TXT, mais aucun message WhatsApp exploitable n'a été trouvé."
    );
  }

  return {
    platform: "whatsapp",
    messages,
    conversations: [],
    warnings: [],
  };
}

function dedupe<T extends {
  date: string;
  sender: string;
  text: string;
}>(messages: T[]): T[] {
  const seen = new Set<string>();

  return messages.filter((message) => {
    const key =
      `${message.date}|${message.sender}|${message.text}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}