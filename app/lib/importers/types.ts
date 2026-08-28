export type Platform =
  | "whatsapp"
  | "snapchat"
  | "instagram"
  | "telegram";

export type UnifiedMessage = {
  date: string;
  sender: string;
  text: string;
  platform: Platform;
  conversation?: string;
  attachment?: boolean;
  source?: string;
};

export type ImportResult = {
  platform: Platform;
  messages: UnifiedMessage[];
  conversations: string[];
  warnings: string[];
};
