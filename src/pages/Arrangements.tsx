import React, { useEffect } from "react";
import { usePreferences } from "@/settings/preferences";
import {
  getInitialArrangements,
  persistArrangements,
  arrangementsStorageEvent,
  createArrangement,
  updateArrangementStatus,
  updateArrangement,
  getOverdueArrangements,
  mergeArrangements,
} from "@/data/arrangements";
import { formatTimeLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import { filterArrangements, extractAllTags } from "@/lib/searchFilter";
import type { ArrangementItem, ArrangementPriority, ArrangementStatus } from "@/types/arrangement";
import { findSimilarArrangements, generateTopicTags } from "@/services/aiParser";
import {
  scheduleReminder,
  cancelReminder,
  initReminderService,
  updateAllArrangementStatuses,
  snoozeArrangement as snoozeService,
} from "@/services/reminderService";

type ViewMode = "list" | "calendar";

export default function Arrangements() {
  const { t } = usePreferences();
  const [arrangements, setArrangements] = React.useState(getInitialArrangements);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [selectedArrangement, setSelectedArrangement] = React.useState<ArrangementItem | null>(null);
  const [showDetailModal, setShowDetailModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterPriority, setFilterPriority] = React.useState<ArrangementPriority | "all">("all");
  const [filterStatus, setFilterStatus] = React.useState<ArrangementStatus | "all">("all");
  const [filterTag, setFilterTag] = React.useState<string>("all");
  const [formData, setFormData] = React.useState({
    title: "",
    note: "",
    scheduledAt: "",
    people: "",
    location: "",
    priority: "medium" as ArrangementPriority,
  });

  useEffect(() => {
    initReminderService();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => setArrangements(getInitialArrangements());
    window.addEventListener(arrangementsStorageEvent, refresh);
    return () => window.removeEventListener(arrangementsStorageEvent, refresh);
  }, []);

  useEffect(() => {
    const autoUpdated = updateAllArrangementStatuses(arrangements);
    const hasChanges = autoUpdated.some((a, i) => a.status !== arrangements[i]?.status);
    if (hasChanges) {
      setArrangements(autoUpdated);
      persistArrangements(autoUpdated);
    }
  }, []);

  const filteredArrangements = filterArrangements(
    arrangements, 
    searchQuery, 
    filterPriority, 
    filterStatus, 
    filterTag
  );

  const allTags = extractAllTags(arrangements);

  const pending = filteredArrangements.filter((a) => a.status === "pending");
  const done = filteredArrangements.filter((a) => a.status === "done");
  const snoozed = filteredArrangements.filter((a) => a.status === "snoozed");
  const overdue = getOverdueArrangements(filteredArrangements);
  const today = filteredArrangements.filter((a) => {
    if (!a.scheduledAt || a.status !== "pending") return false;
    const now = new Date();
    const itemDate = new Date(a.scheduledAt);
    return itemDate.toDateString() === now.toDateString();
  });
  const upcoming = filteredArrangements.filter((a) => {
    if (!a.scheduledAt || a.status !== "pending") return false;
    const now = new Date();
    const itemDate = new Date(a.scheduledAt);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return itemDate.toDateString() !== now.toDateString() && itemDate >= tomorrow;
  });

  const handleCreate = () => {
    const title = formData.title.trim();
    if (!title) return;
    const scheduledAt = formData.scheduledAt ? new Date(formData.scheduledAt).getTime() : null;
    const people = formData.people.split(",").map((p) => p.trim()).filter(Boolean);
    const newItem = createArrangement(title, formData.note, scheduledAt, people, formData.location, formData.priority);
    setArrangements((prev) => {
      const next = [...prev, newItem];
      persistArrangements(next);
      return next;
    });
    if (scheduledAt) {
      scheduleReminder(newItem, 15);
    }
    setFormData({ title: "", note: "", scheduledAt: "", people: "", location: "", priority: "medium" });
    setShowCreateModal(false);
  };

  const handleStatusChange = (id: string, status: "done" | "snoozed") => {
    if (status === "done") {
      cancelReminder(id);
    }
    setArrangements((prev) => {
      const next = prev.map((a) =>
        a.id === id ? updateArrangementStatus(a, status) : a
      );
      persistArrangements(next);
      return next;
    });
  };

  const handleDelete = (id: string) => {
    setArrangements((prev) => {
      const next = prev.filter((a) => a.id !== id);
      persistArrangements(next);
      return next;
    });
    if (selectedArrangement?.id === id) {
      setSelectedArrangement(null);
      setShowDetailModal(false);
    }
  };

  const handleOpenDetail = (arrangement: ArrangementItem) => {
    setSelectedArrangement(arrangement);
    setShowDetailModal(true);
  };

  const handleUpdateField = (id: string, updates: Partial<ArrangementItem>) => {
    setArrangements((prev) => {
      const next = updateArrangement(prev, id, updates);
      persistArrangements(next);
      return next;
    });
    if (selectedArrangement?.id === id) {
      setSelectedArrangement(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleReschedule = (id: string) => {
    const arrangement = arrangements.find(a => a.id === id);
    if (arrangement) {
      setSelectedArrangement(arrangement);
      setShowDetailModal(true);
    }
  };

  const handleMerge = (ids: string[], title: string, note: string) => {
    setArrangements((prev) => {
      const next = mergeArrangements(prev, ids, title, note);
      persistArrangements(next);
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between bg-bg px-4 py-3">
        <div>
          <h1 className="text-xl font-semibold text-text">{t("arrangements.title")}</h1>
          <p className="text-xs text-text-muted">{t("arrangements.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[8px] bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-[6px] px-3 py-1 text-xs font-medium transition",
                viewMode === "list" ? "bg-surface text-text shadow-sm" : "text-text-tertiary hover:text-text"
              )}
            >
              列表
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={cn(
                "rounded-[6px] px-3 py-1 text-xs font-medium transition",
                viewMode === "calendar" ? "bg-surface text-text shadow-sm" : "text-text-tertiary hover:text-text"
              )}
            >
              日历
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary transition hover:opacity-90"
          >
            +
          </button>
        </div>
      </header>

      {viewMode === "list" ? (
        <>
          <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-divider">
            <div className="rounded-lg bg-surface-muted p-3 text-center">
              <p className="text-lg font-semibold text-primary">{pending.length}</p>
              <p className="text-xs text-text-tertiary">待处理</p>
            </div>
            <div className="rounded-lg bg-surface-muted p-3 text-center">
              <p className="text-lg font-semibold text-green-500">{done.length}</p>
              <p className="text-xs text-text-tertiary">已完成</p>
            </div>
            <div className="rounded-lg bg-surface-muted p-3 text-center">
              <p className="text-lg font-semibold text-amber-500">{snoozed.length}</p>
              <p className="text-xs text-text-tertiary">以后再说</p>
            </div>
          </div>
          <div className="px-4 py-3 border-b border-divider">
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索安排..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-surface-muted pl-10 pr-4 py-2 text-sm text-text placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as ArrangementPriority | "all")}
                className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs text-text outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">全部优先级</option>
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ArrangementStatus | "all")}
                className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs text-text outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">全部状态</option>
                <option value="pending">待处理</option>
                <option value="done">已完成</option>
                <option value="snoozed">以后再说</option>
              </select>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs text-text outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">全部标签</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
          <ListView
            arrangements={filteredArrangements}
            pending={pending}
            done={done}
            snoozed={snoozed}
            overdue={overdue}
            today={today}
            upcoming={upcoming}
            onOpenDetail={handleOpenDetail}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onReschedule={handleReschedule}
          />
        </>
      ) : (
        <CalendarView arrangements={filteredArrangements.filter(a => a.status === "pending")} onOpenDetail={handleOpenDetail} />
      )}

      {showCreateModal && (
        <CreateModal formData={formData} onFormChange={setFormData} onSubmit={handleCreate} onClose={() => setShowCreateModal(false)} />
      )}

      {showDetailModal && selectedArrangement && (
        <DetailModal
          arrangement={selectedArrangement}
          onClose={() => { setShowDetailModal(false); setSelectedArrangement(null); }}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onUpdate={(updates) => handleUpdateField(selectedArrangement.id, updates)}
          arrangements={arrangements}
          onMerge={handleMerge}
        />
      )}
    </div>
  );
}

function ListView({
  arrangements,
  pending,
  done,
  snoozed,
  overdue,
  today,
  upcoming,
  onOpenDetail,
  onStatusChange,
  onDelete,
  onReschedule,
}: {
  arrangements: ArrangementItem[];
  pending: ArrangementItem[];
  done: ArrangementItem[];
  snoozed: ArrangementItem[];
  overdue: ArrangementItem[];
  today: ArrangementItem[];
  upcoming: ArrangementItem[];
  onOpenDetail: (arrangement: ArrangementItem) => void;
  onStatusChange: (id: string, status: "done" | "snoozed") => void;
  onDelete: (id: string) => void;
  onReschedule: (id: string) => void;
}) {
  const { t } = usePreferences();
  const hasContent = arrangements.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center">
        <div>
          <p className="text-[14px] font-medium text-text">{t("arrangements.emptyTitle")}</p>
          <p className="mt-1 text-[12px] text-text-tertiary">{t("arrangements.emptyDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {overdue.length > 0 && (
        <Section
          title="已过期"
          items={overdue}
          variant="overdue"
          onOpenDetail={onOpenDetail}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onReschedule={onReschedule}
        />
      )}
      {today.length > 0 && (
        <Section
          title="今天"
          items={today}
          variant="today"
          onOpenDetail={onOpenDetail}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onReschedule={onReschedule}
        />
      )}
      {upcoming.length > 0 && (
        <Section
          title="即将到来"
          items={upcoming}
          variant="upcoming"
          onOpenDetail={onOpenDetail}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onReschedule={onReschedule}
        />
      )}
      {pending.length === 0 && overdue.length === 0 && today.length === 0 && upcoming.length === 0 && (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-text-tertiary">暂无待处理安排</p>
        </div>
      )}
      {snoozed.length > 0 && (
        <Section
          title={t("arrangements.snoozed")}
          items={snoozed}
          variant="snoozed"
          onOpenDetail={onOpenDetail}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onReschedule={onReschedule}
        />
      )}
      {done.length > 0 && (
        <Section
          title={t("arrangements.done")}
          items={done}
          variant="done"
          onOpenDetail={onOpenDetail}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onReschedule={onReschedule}
        />
      )}
    </div>
  );
}

function CalendarView({ arrangements, onOpenDetail }: { arrangements: ArrangementItem[]; onOpenDetail: (arrangement: ArrangementItem) => void }) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const today = new Date();

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const arrangementsByDate = React.useMemo(() => {
    const map: Record<string, ArrangementItem[]> = {};
    arrangements.forEach((a) => {
      if (!a.scheduledAt) return;
      const dateKey = new Date(a.scheduledAt).toDateString();
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(a);
    });
    return map;
  }, [arrangements]);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-surface-muted">
          ←
        </button>
        <span className="text-sm font-medium text-text">
          {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
        </span>
        <button type="button" onClick={nextMonth} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-surface-muted">
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-text-tertiary">
            {day}
          </div>
        ))}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const dateKey = date.toDateString();
          const dayArrangements = arrangementsByDate[dateKey] || [];
          const isToday = date.toDateString() === today.toDateString();
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate()) && !isToday;

          return (
            <div
              key={day}
              className={cn(
                "aspect-square rounded-lg border p-1 cursor-pointer transition hover:bg-surface-muted",
                isToday && "border-primary",
                isPast && dayArrangements.length > 0 && "border-danger/30"
              )}
              onClick={() => dayArrangements.length > 0 && onOpenDetail(dayArrangements[0])}
            >
              <div className={cn("text-xs", isToday ? "font-bold text-primary" : isPast ? "text-text-tertiary" : "text-text")}>
                {day}
              </div>
              {dayArrangements.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  {dayArrangements.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        a.priority === "high" ? "bg-danger" : a.priority === "medium" ? "bg-primary" : "bg-text-tertiary"
                      )}
                    />
                  ))}
                  {dayArrangements.length > 3 && <span className="text-[8px] text-text-tertiary">+{dayArrangements.length - 3}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  variant,
  onOpenDetail,
  onStatusChange,
  onDelete,
  onReschedule,
}: {
  title: string;
  items: ArrangementItem[];
  variant: "today" | "upcoming" | "overdue" | "snoozed" | "done";
  onOpenDetail: (arrangement: ArrangementItem) => void;
  onStatusChange: (id: string, status: "done" | "snoozed") => void;
  onDelete: (id: string) => void;
  onReschedule: (id: string) => void;
}) {
  return (
    <div className="border-b border-border px-4 py-3">
      <h2 className={cn(
        "mb-2 text-[13px] font-semibold",
        variant === "overdue" ? "text-text-muted" : "text-text-tertiary"
      )}>
        {variant === "overdue" && items.length > 0 && "～ "}{title}
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <Card
            key={item.id}
            item={item}
            variant={variant}
            onOpenDetail={onOpenDetail}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onReschedule={onReschedule}
          />
        ))}
      </div>
    </div>
  );
}

function Card({
  item,
  variant,
  onOpenDetail,
  onStatusChange,
  onDelete,
  onReschedule,
}: {
  item: ArrangementItem;
  variant: "today" | "upcoming" | "overdue" | "snoozed" | "done";
  onOpenDetail: (arrangement: ArrangementItem) => void;
  onStatusChange: (id: string, status: "done" | "snoozed") => void;
  onDelete: (id: string) => void;
  onReschedule: (id: string) => void;
}) {
  const { t } = usePreferences();
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showMenu) return;
    const close = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !menuRef.current?.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [showMenu]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[12px] bg-surface p-3 transition hover:bg-surface-muted cursor-pointer",
        variant === "overdue" && "opacity-70"
      )}
      onClick={() => onOpenDetail(item)}
    >
      <button
        type="button"
        className={cn(
          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
          item.status === "done"
            ? "border-primary bg-primary text-on-primary"
            : variant === "overdue"
            ? "border-text-tertiary hover:border-primary"
            : "border-border hover:border-primary"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onStatusChange(item.id, item.status === "done" ? "snoozed" : "done");
        }}
      >
        {item.status === "done" && "✓"}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-[14px] font-medium leading-5", item.status === "done" ? "line-through text-text-tertiary" : "text-text")}>
            {item.title}
          </p>
          {item.priority === "high" && variant !== "done" && (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", variant === "overdue" ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary")}>
              重要
            </span>
          )}
          {item.contexts.length > 0 && (
            <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] text-text-tertiary">
              {item.contexts.length}条上下文
            </span>
          )}
        </div>
        {item.note && <p className="mt-1 text-[12px] leading-4 text-text-muted line-clamp-2">{item.note}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          {item.scheduledAt && (
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-[11px]",
              variant === "overdue" ? "text-danger" : "text-primary"
            )}>
              📅 {formatTimeLabel(item.scheduledAt)}
            </span>
          )}
          {item.location && <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-[11px] text-primary">📍 {item.location}</span>}
          {item.people.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-[11px] text-primary">👤 {item.people.length}</span>}
        </div>
      </div>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary transition hover:bg-hover-overlay"
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        >
          ⋮
        </button>
        {showMenu && (
          <div className="absolute right-0 top-6 z-20 w-[160px] rounded-[10px] border border-border bg-surface shadow-md">
            {item.status !== "snoozed" && variant !== "done" && (
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-text-tertiary transition hover:bg-hover-overlay hover:text-text"
                onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, "snoozed"); setShowMenu(false); }}
              >
                {t("arrangements.snooze")}
              </button>
            )}
            {variant === "overdue" && (
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-primary transition hover:bg-hover-overlay"
                onClick={(e) => { e.stopPropagation(); onReschedule(item.id); setShowMenu(false); }}
              >
                重新安排时间
              </button>
            )}
            {variant === "snoozed" && (
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-primary transition hover:bg-hover-overlay"
                onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, "pending"); setShowMenu(false); }}
              >
                恢复提醒
              </button>
            )}
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-danger transition hover:bg-hover-overlay"
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); setShowMenu(false); }}
            >
              {t("arrangements.delete")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailModal({
  arrangement,
  onClose,
  onStatusChange,
  onDelete,
  onUpdate,
  arrangements,
  onMerge,
}: {
  arrangement: ArrangementItem;
  onClose: () => void;
  onStatusChange: (id: string, status: "done" | "snoozed") => void;
  onDelete: (id: string) => void;
  onUpdate: (updates: Partial<ArrangementItem>) => void;
  arrangements: ArrangementItem[];
  onMerge: (ids: string[], title: string, note: string) => void;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [showMergeConfirm, setShowMergeConfirm] = React.useState(false);
  const [mergeTarget, setMergeTarget] = React.useState<string | null>(null);
  const [editData, setEditData] = React.useState({
    title: arrangement.title,
    note: arrangement.note,
    scheduledAt: arrangement.scheduledAt ? new Date(arrangement.scheduledAt).toISOString().slice(0, 16) : "",
    location: arrangement.location,
    priority: arrangement.priority,
  });

  const similarArrangements = React.useMemo(() => {
    return findSimilarArrangements(arrangement, arrangements, 0.4);
  }, [arrangement, arrangements]);

  const topicTags = React.useMemo(() => {
    return generateTopicTags(arrangement.title, arrangement.note);
  }, [arrangement.title, arrangement.note]);

  const handleSave = () => {
    onUpdate({
      title: editData.title,
      note: editData.note,
      scheduledAt: editData.scheduledAt ? new Date(editData.scheduledAt).getTime() : null,
      location: editData.location,
      priority: editData.priority as ArrangementPriority,
    });
    setIsEditing(false);
  };

  const handleMerge = (targetId: string) => {
    setMergeTarget(targetId);
    setShowMergeConfirm(true);
  };

  const confirmMerge = () => {
    if (!mergeTarget) return;
    const targetArrangement = arrangements.find(a => a.id === mergeTarget);
    if (!targetArrangement) return;
    
    const mergedTitle = `${arrangement.title} + ${targetArrangement.title}`;
    const mergedNote = [arrangement.note, targetArrangement.note].filter(Boolean).join("\n\n---\n\n");
    
    onMerge([arrangement.id, mergeTarget], mergedTitle, mergedNote);
    setShowMergeConfirm(false);
    setMergeTarget(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button type="button" className="absolute inset-0 bg-overlay backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-[20px] border-t border-border bg-surface px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">安排详情</h2>
          <button type="button" className="rounded-[8px] px-2 py-1 text-sm text-text-tertiary transition hover:bg-hover-overlay" onClick={onClose}>
            ✕
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-text-tertiary">
              标题
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="mt-1 h-10 w-full rounded-[10px] border border-border bg-input-bg px-3 text-sm text-text outline-none transition focus:border-primary"
              />
            </label>
            <label className="block text-xs font-medium text-text-tertiary">
              备注
              <textarea
                value={editData.note}
                onChange={(e) => setEditData({ ...editData, note: e.target.value })}
                className="mt-1 min-h-[60px] w-full rounded-[10px] border border-border bg-input-bg px-3 py-2 text-sm text-text outline-none transition focus:border-primary resize-none"
              />
            </label>
            <label className="block text-xs font-medium text-text-tertiary">
              计划时间
              <input
                type="datetime-local"
                value={editData.scheduledAt}
                onChange={(e) => setEditData({ ...editData, scheduledAt: e.target.value })}
                className="mt-1 h-10 w-full rounded-[10px] border border-border bg-input-bg px-3 text-sm text-text outline-none transition focus:border-primary"
              />
            </label>
            <label className="block text-xs font-medium text-text-tertiary">
              地点
              <input
                type="text"
                value={editData.location}
                onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                className="mt-1 h-10 w-full rounded-[10px] border border-border bg-input-bg px-3 text-sm text-text outline-none transition focus:border-primary"
              />
            </label>
            <label className="block text-xs font-medium text-text-tertiary">
              优先级
              <select
                value={editData.priority}
                onChange={(e) => setEditData({ ...editData, priority: e.target.value as ArrangementPriority })}
                className="mt-1 h-10 w-full rounded-[10px] border border-border bg-input-bg px-3 text-sm text-text outline-none transition focus:border-primary"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </label>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 rounded-[10px] border border-border bg-surface py-2.5 text-sm font-medium text-text transition hover:bg-hover-overlay"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-[10px] bg-primary py-2.5 text-sm font-medium text-on-primary transition hover:opacity-90"
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "rounded-full px-2 py-1 text-xs font-medium",
                  arrangement.priority === "high" ? "bg-danger/10 text-danger" :
                  arrangement.priority === "medium" ? "bg-primary/10 text-primary" :
                  "bg-surface-muted text-text-tertiary"
                )}>
                  {arrangement.priority === "high" ? "重要" : arrangement.priority === "medium" ? "普通" : "低优先级"}
                </span>
                <span className={cn(
                  "rounded-full px-2 py-1 text-xs",
                  arrangement.status === "pending" ? "bg-primary/10 text-primary" :
                  arrangement.status === "snoozed" ? "bg-surface-muted text-text-tertiary" :
                  "bg-primary/10 text-primary"
                )}>
                  {arrangement.status === "pending" ? "待处理" : arrangement.status === "snoozed" ? "以后再说" : "已完成"}
                </span>
                {topicTags.length > 0 && (
                  <div className="flex gap-1">
                    {topicTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-primary-soft px-2 py-1 text-xs text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-text">{arrangement.title}</h3>
                {arrangement.note && <p className="mt-2 text-sm text-text-muted whitespace-pre-wrap">{arrangement.note}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {arrangement.scheduledAt && (
                  <div className="rounded-[10px] bg-surface-muted p-3">
                    <p className="text-xs text-text-tertiary">📅 计划时间</p>
                    <p className="mt-1 text-sm font-medium text-text">
                      {new Date(arrangement.scheduledAt).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
                {arrangement.location && (
                  <div className="rounded-[10px] bg-surface-muted p-3">
                    <p className="text-xs text-text-tertiary">📍 地点</p>
                    <p className="mt-1 text-sm font-medium text-text">{arrangement.location}</p>
                  </div>
                )}
              </div>

              {arrangement.people.length > 0 && (
                <div className="rounded-[10px] bg-surface-muted p-3">
                  <p className="text-xs text-text-tertiary">👥 相关人物</p>
                  <p className="mt-1 text-sm font-medium text-text">{arrangement.people.join("、")}</p>
                </div>
              )}

              {arrangement.contexts.length > 0 && (
                <div>
                  <p className="text-xs text-text-tertiary mb-2">💬 来源对话</p>
                  <div className="space-y-2">
                    {arrangement.contexts.map((ctx, i) => (
                      <div key={i} className="rounded-[10px] bg-surface-muted p-3">
                        {ctx.senderNames && ctx.senderNames.length > 0 && (
                          <p className="text-xs text-text-tertiary">{ctx.senderNames.join("、")}</p>
                        )}
                        <p className="mt-1 text-sm text-text">{ctx.snippet}</p>
                        {ctx.timestamps && ctx.timestamps.length > 0 && (
                          <p className="mt-1 text-xs text-text-tertiary">
                            {new Date(ctx.timestamps[0]).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {arrangement.origin && (
                <div className="rounded-[10px] bg-surface-muted p-3">
                  <p className="text-xs text-text-tertiary">📝 原始消息</p>
                  <p className="mt-1 text-sm text-text">{arrangement.origin.rawContent}</p>
                  {arrangement.origin.senderName && (
                    <p className="mt-1 text-xs text-text-tertiary">发送者：{arrangement.origin.senderName}</p>
                  )}
                </div>
              )}

              {similarArrangements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-text-tertiary">🔍 AI 识别到相似安排</p>
                    <span className="text-[10px] text-text-tertiary">（建议合并）</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {similarArrangements.slice(0, 3).map((suggestion) => {
                      const similar = arrangements.find(a => a.id === suggestion.arrangementId);
                      if (!similar) return null;
                      return (
                        <div
                          key={suggestion.arrangementId}
                          className="flex items-center gap-3 rounded-[10px] bg-surface-muted p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text truncate">{similar.title}</p>
                            <p className="mt-0.5 text-xs text-text-tertiary">{suggestion.reason}</p>
                            <p className="mt-0.5 text-xs text-primary">相似度 {(suggestion.similarityScore * 100).toFixed(0)}%</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleMerge(suggestion.arrangementId)}
                            className="rounded-[8px] border border-primary px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/5"
                          >
                            合并
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-xs text-text-tertiary">
                创建于 {new Date(arrangement.createdAt).toLocaleDateString("zh-CN")}
                {arrangement.source !== "manual" && ` · 来源：${arrangement.source === "self" ? "发给自己" : "对话"}`}
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              {arrangement.status !== "done" && (
                <button
                  type="button"
                  onClick={() => { onStatusChange(arrangement.id, "done"); onClose(); }}
                  className="flex-1 rounded-[10px] bg-primary py-2.5 text-sm font-medium text-on-primary transition hover:opacity-90"
                >
                  ✓ 完成
                </button>
              )}
              {arrangement.status !== "snoozed" && arrangement.status !== "done" && (
                <button
                  type="button"
                  onClick={() => { onStatusChange(arrangement.id, "snoozed"); onClose(); }}
                  className="flex-1 rounded-[10px] border border-border bg-surface py-2.5 text-sm font-medium text-text transition hover:bg-hover-overlay"
                >
                  以后再说
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex-1 rounded-[10px] border border-border bg-surface py-2.5 text-sm font-medium text-text transition hover:bg-hover-overlay"
              >
                编辑
              </button>
              <button
                type="button"
                onClick={() => { onDelete(arrangement.id); }}
                className="flex-1 rounded-[10px] border border-danger/30 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/5"
              >
                删除
              </button>
            </div>
          </>
        )}

        {showMergeConfirm && mergeTarget && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-[80%] rounded-[12px] bg-surface p-4">
              <h3 className="text-base font-semibold text-text">确认合并</h3>
              <p className="mt-2 text-sm text-text-muted">
                确定要将此安排与另一安排合并吗？合并后将保留两份安排的所有信息。
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowMergeConfirm(false); setMergeTarget(null); }}
                  className="flex-1 rounded-[10px] border border-border bg-surface py-2.5 text-sm font-medium text-text transition hover:bg-hover-overlay"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmMerge}
                  className="flex-1 rounded-[10px] bg-primary py-2.5 text-sm font-medium text-on-primary transition hover:opacity-90"
                >
                  确认合并
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateModal({
  formData,
  onFormChange,
  onSubmit,
  onClose,
}: {
  formData: { title: string; note: string; scheduledAt: string; people: string; location: string; priority: ArrangementPriority };
  onFormChange: (data: typeof formData) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const { t } = usePreferences();

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button type="button" className="absolute inset-0 bg-overlay backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-[20px] border-t border-border bg-surface px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">{t("arrangements.createTitle")}</h2>
          <button type="button" className="rounded-[8px] px-2 py-1 text-sm text-text-tertiary transition hover:bg-hover-overlay" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-text-tertiary">
            {t("arrangements.titleLabel")}
            <input
              type="text"
              value={formData.title}
              onChange={(e) => onFormChange({ ...formData, title: e.target.value })}
              placeholder={t("arrangements.titlePlaceholder")}
              className="mt-1 h-10 w-full rounded-[10px] border border-border bg-input-bg px-3 text-sm text-text outline-none transition placeholder:text-input-placeholder focus:border-primary focus:shadow-focus"
              autoFocus
            />
          </label>

          <label className="block text-xs font-medium text-text-tertiary">
            {t("arrangements.noteLabel")}
            <textarea
              value={formData.note}
              onChange={(e) => onFormChange({ ...formData, note: e.target.value })}
              placeholder={t("arrangements.notePlaceholder")}
              className="mt-1 min-h-[60px] w-full rounded-[10px] border border-border bg-input-bg px-3 py-2 text-sm text-text outline-none transition placeholder:text-input-placeholder focus:border-primary focus:shadow-focus resize-none"
            />
          </label>

          <label className="block text-xs font-medium text-text-tertiary">
            优先级
            <select
              value={formData.priority}
              onChange={(e) => onFormChange({ ...formData, priority: e.target.value as ArrangementPriority })}
              className="mt-1 h-10 w-full rounded-[10px] border border-border bg-input-bg px-3 text-sm text-text outline-none transition focus:border-primary"
            >
              <option value="high">高 - 重要紧急</option>
              <option value="medium">中 - 普通</option>
              <option value="low">低 - 灵活</option>
            </select>
          </label>

          <label className="block text-xs font-medium text-text-tertiary">
            {t("arrangements.scheduledAtLabel")}
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => onFormChange({ ...formData, scheduledAt: e.target.value })}
              className="mt-1 h-10 w-full rounded-[10px] border border-border bg-input-bg px-3 text-sm text-text outline-none transition focus:border-primary focus:shadow-focus"
            />
          </label>

          <label className="block text-xs font-medium text-text-tertiary">
            {t("arrangements.peopleLabel")}
            <input
              type="text"
              value={formData.people}
              onChange={(e) => onFormChange({ ...formData, people: e.target.value })}
              placeholder={t("arrangements.peoplePlaceholder")}
              className="mt-1 h-10 w-full rounded-[10px] border border-border bg-input-bg px-3 text-sm text-text outline-none transition placeholder:text-input-placeholder focus:border-primary focus:shadow-focus"
            />
          </label>

          <label className="block text-xs font-medium text-text-tertiary">
            {t("arrangements.locationLabel")}
            <input
              type="text"
              value={formData.location}
              onChange={(e) => onFormChange({ ...formData, location: e.target.value })}
              placeholder={t("arrangements.locationPlaceholder")}
              className="mt-1 h-10 w-full rounded-[10px] border border-border bg-input-bg px-3 text-sm text-text outline-none transition placeholder:text-input-placeholder focus:border-primary focus:shadow-focus"
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[10px] border border-border bg-surface py-2.5 text-sm font-medium text-text transition hover:bg-hover-overlay"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!formData.title.trim()}
            className="flex-1 rounded-[10px] bg-primary py-2.5 text-sm font-medium text-on-primary transition hover:opacity-90 disabled:opacity-50"
          >
            {t("arrangements.create")}
          </button>
        </div>
      </div>
    </div>
  );
}