import type { ArrangementItem, ArrangementStatus, ArrangementContextType, ArrangementOrigin, MergeSuggestion } from "@/types/arrangement";

export const arrangementsStorageKey = "arkme-demo.arrangements";
export const arrangementsStorageEvent = "arkme-demo:arrangements-updated";

function readJsonValue(key: string): unknown {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeJsonValue(key: string, value: unknown) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the in-memory UI usable if localStorage is unavailable.
  }
}

function normalizeArrangement(value: unknown, index: number): ArrangementItem | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Partial<ArrangementItem>;
  const title = typeof item.title === "string" ? item.title.trim() : "";
  if (!title) return null;

  const id = typeof item.id === "string" ? item.id : `arrangement-${Date.now()}-${index}`;
  const status: ArrangementStatus =
    item.status === "done" || item.status === "snoozed" ? item.status : "pending";
  const source = item.source === "self" || item.source === "chat" || item.source === "ai" ? item.source : "manual";
  const priority = item.priority === "high" || item.priority === "medium" || item.priority === "low"
    ? item.priority : "medium";

  return {
    id,
    title,
    note: typeof item.note === "string" ? item.note.trim() : "",
    status,
    priority,
    scheduledAt:
      typeof item.scheduledAt === "number" && Number.isFinite(item.scheduledAt)
        ? item.scheduledAt
        : null,
    people: Array.isArray(item.people)
      ? item.people.filter((p): p is string => typeof p === "string").map((p) => p.trim())
      : [],
    location: typeof item.location === "string" ? item.location.trim() : "",
    source,
    createdAt:
      typeof item.createdAt === "number" && Number.isFinite(item.createdAt)
        ? item.createdAt
        : Date.now(),
    updatedAt:
      typeof item.updatedAt === "number" && Number.isFinite(item.updatedAt)
        ? item.updatedAt
        : Date.now(),
    snoozedAt:
      typeof item.snoozedAt === "number" && Number.isFinite(item.snoozedAt)
        ? item.snoozedAt
        : null,
    contexts: Array.isArray(item.contexts)
      ? item.contexts.filter((c): c is ArrangementContextType =>
          c && typeof c === "object" && typeof c.conversationId === "string" && Array.isArray(c.messageIds))
      : [],
    relatedIds: Array.isArray(item.relatedIds)
      ? item.relatedIds.filter((r): r is string => typeof r === "string")
      : [],
    reminderAt:
      typeof item.reminderAt === "number" && Number.isFinite(item.reminderAt)
        ? item.reminderAt
        : null,
    isRepeating: typeof item.isRepeating === "boolean" ? item.isRepeating : false,
    repeatPattern: typeof item.repeatPattern === "string" ? item.repeatPattern : null,
    isDraft: typeof item.isDraft === "boolean" ? item.isDraft : false,
    aiConfidence: typeof item.aiConfidence === "number" && Number.isFinite(item.aiConfidence)
      ? Math.min(1, Math.max(0, item.aiConfidence))
      : 0,
    origin: (item.origin && typeof item.origin === "object" && typeof item.origin.rawContent === "string")
      ? item.origin as ArrangementOrigin
      : null,
    topicTags: Array.isArray(item.topicTags)
      ? item.topicTags.filter((t): t is string => typeof t === "string").map(t => t.trim()).filter(Boolean)
      : [],
    mergedWith: typeof item.mergedWith === "string" ? item.mergedWith : null,
    mergeSuggestions: Array.isArray(item.mergeSuggestions)
      ? item.mergeSuggestions.filter((s): s is MergeSuggestion =>
          s && typeof s === "object" && typeof s.arrangementId === "string" && typeof s.similarityScore === "number")
      : [],
  };
}

export function getInitialArrangements(): ArrangementItem[] {
  const parsedValue = readJsonValue(arrangementsStorageKey);
  if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
    // 返回预置的测试数据
    const now = Date.now();
    return [
      {
        id: 'test-1',
        title: '产品规划会议',
        note: '讨论Q2产品路线图和新功能规划',
        status: 'pending',
        priority: 'high',
        scheduledAt: now + 2 * 60 * 60 * 1000,
        people: ['张三', '李四', '王五'],
        location: '会议室A',
        source: 'manual',
        createdAt: now,
        updatedAt: now,
        snoozedAt: null,
        contexts: [],
        relatedIds: [],
        reminderAt: null,
        isRepeating: false,
        repeatPattern: null,
        isDraft: false,
        aiConfidence: 0,
        origin: null,
        topicTags: ['工作', '会议'],
        mergedWith: null,
        mergeSuggestions: []
      },
      {
        id: 'test-2',
        title: '产品评审会',
        note: '评审新功能设计稿',
        status: 'pending',
        priority: 'high',
        scheduledAt: now + 3 * 60 * 60 * 1000,
        people: ['张三', '李四'],
        location: '会议室A',
        source: 'manual',
        createdAt: now,
        updatedAt: now,
        snoozedAt: null,
        contexts: [],
        relatedIds: [],
        reminderAt: null,
        isRepeating: false,
        repeatPattern: null,
        isDraft: false,
        aiConfidence: 0,
        origin: null,
        topicTags: ['工作', '会议'],
        mergedWith: null,
        mergeSuggestions: []
      },
      {
        id: 'test-3',
        title: '约医生看牙',
        note: '定期检查，最近牙齿有点痛',
        status: 'pending',
        priority: 'medium',
        scheduledAt: now + 24 * 60 * 60 * 1000,
        people: ['王医生'],
        location: '口腔医院',
        source: 'manual',
        createdAt: now,
        updatedAt: now,
        snoozedAt: null,
        contexts: [],
        relatedIds: [],
        reminderAt: null,
        isRepeating: false,
        repeatPattern: null,
        isDraft: false,
        aiConfidence: 0,
        origin: null,
        topicTags: ['医疗'],
        mergedWith: null,
        mergeSuggestions: []
      },
      {
        id: 'test-4',
        title: '和朋友聚餐',
        note: '庆祝小明生日，好久没聚了',
        status: 'snoozed',
        priority: 'low',
        scheduledAt: now - 2 * 24 * 60 * 60 * 1000,
        people: ['小明', '小红', '小华'],
        location: '海底捞',
        source: 'manual',
        createdAt: now,
        updatedAt: now,
        snoozedAt: now - 24 * 60 * 60 * 1000,
        contexts: [],
        relatedIds: [],
        reminderAt: null,
        isRepeating: false,
        repeatPattern: null,
        isDraft: false,
        aiConfidence: 0,
        origin: null,
        topicTags: ['社交'],
        mergedWith: null,
        mergeSuggestions: []
      },
      {
        id: 'test-5',
        title: '健身训练',
        note: '每周三次，不能偷懒',
        status: 'done',
        priority: 'medium',
        scheduledAt: now - 3 * 60 * 60 * 1000,
        people: [],
        location: '健身房',
        source: 'manual',
        createdAt: now,
        updatedAt: now,
        snoozedAt: null,
        contexts: [],
        relatedIds: [],
        reminderAt: null,
        isRepeating: true,
        repeatPattern: 'weekly',
        isDraft: false,
        aiConfidence: 0,
        origin: null,
        topicTags: ['健康'],
        mergedWith: null,
        mergeSuggestions: []
      }
    ];
  }

  return parsedValue
    .map(normalizeArrangement)
    .filter((item): item is ArrangementItem => Boolean(item));
}

export function persistArrangements(arrangements: ArrangementItem[]) {
  writeJsonValue(arrangementsStorageKey, arrangements);
  notifyArrangementsChange();
}

export function notifyArrangementsChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(arrangementsStorageEvent));
}

export function createArrangement(
  title: string,
  note: string,
  scheduledAt: number | null,
  people: string[],
  location: string,
  priority: ArrangementItem["priority"] = "medium",
  contexts: ArrangementContextType[] = [],
  source: ArrangementItem["source"] = "manual",
  isDraft: boolean = false,
  aiConfidence: number = 0,
  origin: ArrangementOrigin | null = null,
  topicTags: string[] = []
): ArrangementItem {
  const timestamp = Date.now();
  return {
    id: `arrangement-${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    note: note.trim(),
    status: "pending",
    priority,
    scheduledAt,
    people: people.map((p) => p.trim()).filter(Boolean),
    location: location.trim(),
    source,
    createdAt: timestamp,
    updatedAt: timestamp,
    snoozedAt: null,
    contexts,
    relatedIds: [],
    reminderAt: null,
    isRepeating: false,
    repeatPattern: null,
    isDraft,
    aiConfidence,
    origin,
    topicTags: topicTags.map(t => t.trim()).filter(Boolean),
    mergedWith: null,
    mergeSuggestions: [],
  };
}

export function updateArrangementStatus(
  arrangement: ArrangementItem,
  status: ArrangementStatus
): ArrangementItem {
  return {
    ...arrangement,
    status,
    updatedAt: Date.now(),
    snoozedAt: status === "snoozed" ? Date.now() : null,
  };
}

export function mergeArrangements(
  arrangements: ArrangementItem[],
  sourceIds: string[],
  targetTitle: string,
  targetNote: string
): ArrangementItem[] {
  const sourceItems = arrangements.filter(a => sourceIds.includes(a.id));
  if (sourceItems.length === 0) return arrangements;

  const allContexts: ArrangementContextType[] = [];
  const allPeople = new Set<string>();
  let latestScheduledAt: number | null = null;

  sourceItems.forEach(item => {
    allContexts.push(...item.contexts);
    item.people.forEach(p => allPeople.add(p));
    if (item.scheduledAt && (!latestScheduledAt || item.scheduledAt < latestScheduledAt)) {
      latestScheduledAt = item.scheduledAt;
    }
  });

  const merged: ArrangementItem = {
    id: `arrangement-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: targetTitle.trim(),
    note: targetNote.trim(),
    status: "pending",
    priority: sourceItems[0].priority,
    scheduledAt: latestScheduledAt,
    people: Array.from(allPeople),
    location: sourceItems.find(a => a.location)?.location || "",
    source: "manual",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    snoozedAt: null,
    contexts: allContexts,
    relatedIds: sourceIds,
    reminderAt: null,
    isRepeating: false,
    repeatPattern: null,
    isDraft: false,
    aiConfidence: 0,
    origin: null,
  };

  return arrangements.filter(a => !sourceIds.includes(a.id)).concat(merged);
}

export function addContextToArrangement(
  arrangements: ArrangementItem[],
  arrangementId: string,
  context: ArrangementContextType
): ArrangementItem[] {
  return arrangements.map(a =>
    a.id === arrangementId
      ? { ...a, contexts: [...a.contexts, context], updatedAt: Date.now() }
      : a
  );
}

export function updateArrangement(
  arrangements: ArrangementItem[],
  arrangementId: string,
  updates: Partial<Pick<ArrangementItem, "title" | "note" | "scheduledAt" | "people" | "location" | "priority" | "reminderAt" | "isRepeating" | "repeatPattern">>
): ArrangementItem[] {
  return arrangements.map(a =>
    a.id === arrangementId
      ? { ...a, ...updates, updatedAt: Date.now() }
      : a
  );
}

export function getArrangementsByDate(arrangements: ArrangementItem[], date: Date): ArrangementItem[] {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  return arrangements.filter(a => {
    if (!a.scheduledAt) return false;
    return a.scheduledAt >= startOfDay && a.scheduledAt <= endOfDay;
  });
}

export function getUpcomingArrangements(arrangements: ArrangementItem[], days: number = 7): ArrangementItem[] {
  const now = Date.now();
  const future = now + days * 24 * 60 * 60 * 1000;

  return arrangements
    .filter(a => a.status === "pending" && a.scheduledAt && a.scheduledAt >= now && a.scheduledAt <= future)
    .sort((a, b) => (a.scheduledAt || 0) - (b.scheduledAt || 0));
}

export function getOverdueArrangements(arrangements: ArrangementItem[]): ArrangementItem[] {
  const now = Date.now();

  return arrangements
    .filter(a => a.status === "pending" && a.scheduledAt && a.scheduledAt < now)
    .sort((a, b) => (a.scheduledAt || 0) - (b.scheduledAt || 0));
}