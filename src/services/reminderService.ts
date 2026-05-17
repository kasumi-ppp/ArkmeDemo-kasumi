import type { ArrangementItem, ArrangementStatus } from "@/types/arrangement";

const reminderStorageKey = "arkme-demo.reminders";
const reminderEvent = "arkme-demo:reminder-triggered";

export interface Reminder {
  id: string;
  arrangementId: string;
  triggerAt: number;
  notified: boolean;
}

function readReminders(): Reminder[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(reminderStorageKey);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function writeReminders(reminders: Reminder[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(reminderStorageKey, JSON.stringify(reminders));
  } catch {
    // Ignore storage errors
  }
}

export function scheduleReminder(arrangement: ArrangementItem, minutesBefore: number = 15): void {
  if (!arrangement.scheduledAt) return;

  const triggerAt = arrangement.scheduledAt - minutesBefore * 60 * 1000;
  if (triggerAt < Date.now()) return;

  const reminders = readReminders();
  const existingIndex = reminders.findIndex(r => r.arrangementId === arrangement.id);

  const reminder: Reminder = {
    id: `reminder-${arrangement.id}`,
    arrangementId: arrangement.id,
    triggerAt,
    notified: false,
  };

  if (existingIndex >= 0) {
    reminders[existingIndex] = reminder;
  } else {
    reminders.push(reminder);
  }

  writeReminders(reminders);
  setupReminderTimer(reminder);
}

export function cancelReminder(arrangementId: string): void {
  const reminders = readReminders().filter(r => r.arrangementId !== arrangementId);
  writeReminders(reminders);
}

let reminderTimer: number | null = null;

function setupReminderTimer(reminder: Reminder): void {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
  }

  const now = Date.now();
  const delay = Math.max(0, reminder.triggerAt - now);

  reminderTimer = window.setTimeout(() => {
    triggerReminder(reminder);
    checkPendingReminders();
  }, delay);
}

function checkPendingReminders(): void {
  const now = Date.now();
  const reminders = readReminders();
  const pending = reminders.filter(r => !r.notified && r.triggerAt <= now);

  if (pending.length > 0) {
    const earliest = pending.reduce((prev, curr) => 
      curr.triggerAt < prev.triggerAt ? curr : prev
    );
    setupReminderTimer(earliest);
  }
}

function triggerReminder(reminder: Reminder): void {
  const reminders = readReminders();
  const index = reminders.findIndex(r => r.id === reminder.id);
  
  if (index >= 0) {
    reminders[index].notified = true;
    writeReminders(reminders);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(reminderEvent, { detail: reminder }));
  }
}

export function initReminderService(): void {
  checkPendingReminders();
}

export function getPendingReminders(): Reminder[] {
  return readReminders().filter(r => !r.notified);
}

export function getReminderForArrangement(arrangementId: string): Reminder | undefined {
  return readReminders().find(r => r.arrangementId === arrangementId && !r.notified);
}

export function autoUpdateStatus(arrangement: ArrangementItem): ArrangementStatus {
  const now = Date.now();

  if (arrangement.status === "done") return "done";
  
  if (arrangement.status === "snoozed") {
    if (arrangement.snoozedAt && now - arrangement.snoozedAt > 24 * 60 * 60 * 1000) {
      return "pending";
    }
    return "snoozed";
  }

  if (!arrangement.scheduledAt) return "pending";

  const timeDiff = arrangement.scheduledAt - now;
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  if (timeDiff < -oneDay) {
    return "snoozed";
  }

  return "pending";
}

export function updateAllArrangementStatuses(arrangements: ArrangementItem[]): ArrangementItem[] {
  return arrangements.map(arr => {
    const newStatus = autoUpdateStatus(arr);
    if (newStatus !== arr.status) {
      return {
        ...arr,
        status: newStatus,
        updatedAt: Date.now(),
        snoozedAt: newStatus === "snoozed" ? Date.now() : arr.snoozedAt,
      };
    }
    return arr;
  });
}

export function snoozeArrangement(arrangement: ArrangementItem, hours: number = 24): ArrangementItem {
  return {
    ...arrangement,
    status: "snoozed",
    snoozedAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function formatReminderTime(scheduledAt: number, minutesBefore: number): string {
  const reminderTime = new Date(scheduledAt - minutesBefore * 60 * 1000);
  const hours = reminderTime.getHours().toString().padStart(2, "0");
  const minutes = reminderTime.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getOverdueArrangements(arrangements: ArrangementItem[]): ArrangementItem[] {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  return arrangements.filter(arr => {
    if (!arr.scheduledAt || arr.status === "done") return false;
    return arr.scheduledAt < now - oneDay;
  }).sort((a, b) => (a.scheduledAt || 0) - (b.scheduledAt || 0));
}
