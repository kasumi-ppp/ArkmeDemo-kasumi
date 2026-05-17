export type ArrangementStatus =
  | "pending"
  | "done"
  | "snoozed";

export type ArrangementSource = "manual" | "self" | "chat" | "ai";

export type ArrangementOrigin = {
  type: "message" | "manual";
  conversationId?: string;
  messageId?: string;
  senderName?: string;
  rawContent: string;
};

export type ArrangementPriority = "high" | "medium" | "low";

export type ArrangementContextType = {
  conversationId: string;
  messageIds: string[];
  snippet: string;
  senderNames: string[];
  timestamps: number[];
};

export type MergeSuggestion = {
  arrangementId: string;
  similarityScore: number;
  reason: string;
};

export type ArrangementItem = {
  id: string;
  title: string;
  note: string;
  status: ArrangementStatus;
  priority: ArrangementPriority;
  scheduledAt: number | null;
  people: string[];
  location: string;
  source: ArrangementSource;
  createdAt: number;
  updatedAt: number;
  snoozedAt: number | null;
  contexts: ArrangementContextType[];
  relatedIds: string[];
  reminderAt: number | null;
  isRepeating: boolean;
  repeatPattern: string | null;
  isDraft: boolean;
  aiConfidence: number;
  origin: ArrangementOrigin | null;
  topicTags: string[];
  mergedWith: string | null;
  mergeSuggestions: MergeSuggestion[];
};