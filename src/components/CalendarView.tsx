import React from "react";
import { cn } from "@/utils/style";
import type { ArrangementItem } from "@/types/arrangement";

interface CalendarViewProps {
  arrangements: ArrangementItem[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onOpenArrangement: (arrangement: ArrangementItem) => void;
}

export default function CalendarView({
  arrangements,
  selectedDate,
  onSelectDate,
  onOpenArrangement,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth()));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDay = firstDayOfMonth.getDay();

  const days = React.useMemo(() => {
    const result: { date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; arrangements: ArrangementItem[] }[] = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const dateEnd = dateStart + 24 * 60 * 60 * 1000 - 1;
      const dayArrangements = arrangements.filter(
        a => a.scheduledAt && a.scheduledAt >= dateStart && a.scheduledAt <= dateEnd
      );
      
      result.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selectedDate.getTime(),
        arrangements: dayArrangements,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const dateEnd = dateStart + 24 * 60 * 60 * 1000 - 1;
      const dayArrangements = arrangements.filter(
        a => a.scheduledAt && a.scheduledAt >= dateStart && a.scheduledAt <= dateEnd
      );
      
      result.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selectedDate.getTime(),
        arrangements: dayArrangements,
      });
    }

    const remainingCells = 42 - result.length;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const dateEnd = dateStart + 24 * 60 * 60 * 1000 - 1;
      const dayArrangements = arrangements.filter(
        a => a.scheduledAt && a.scheduledAt >= dateStart && a.scheduledAt <= dateEnd
      );
      
      result.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selectedDate.getTime(),
        arrangements: dayArrangements,
      });
    }

    return result;
  }, [currentMonth, selectedDate, arrangements]);

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth()));
    onSelectDate(today);
  };

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  const formatMonth = () => {
    const months = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
    return `${year}年${months[month]}`;
  };

  return (
    <div className="bg-surface rounded-[12px] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
        <button
          type="button"
          className="h-8 w-8 flex items-center justify-center rounded-full text-text-muted hover:bg-hover-overlay transition"
          onClick={prevMonth}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text">{formatMonth()}</span>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={goToToday}
          >
            今天
          </button>
        </div>
        
        <button
          type="button"
          className="h-8 w-8 flex items-center justify-center rounded-full text-text-muted hover:bg-hover-overlay transition"
          onClick={nextMonth}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-border-light">
        {weekDays.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-text-tertiary">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, index) => (
          <div
            key={index}
            className={cn(
              "relative min-h-[48px] p-1.5 border-b border-r border-border-light last:border-r-0 transition",
              !day.isCurrentMonth && "bg-surface-muted/50",
              day.isSelected && "bg-primary-soft/50",
              day.isToday && !day.isSelected && "bg-surface-muted"
            )}
            onClick={() => onSelectDate(day.date)}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  "text-xs font-medium",
                  !day.isCurrentMonth && "text-text-tertiary/50",
                  day.isToday && "text-primary font-semibold"
                )}
              >
                {day.date.getDate()}
              </span>
              {day.isToday && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </div>

            {day.arrangements.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {day.arrangements.slice(0, 2).map((arr) => (
                  <button
                    key={arr.id}
                    className={cn(
                      "w-full truncate text-xs px-1.5 py-1 rounded-[4px] text-left",
                      arr.status === "done" && "bg-success/10 text-success",
                      arr.status === "snoozed" && "bg-warning/10 text-warning",
                      arr.status === "pending" && "bg-primary/10 text-primary"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenArrangement(arr);
                    }}
                  >
                    {arr.title}
                  </button>
                ))}
                {day.arrangements.length > 2 && (
                  <span className="text-xs text-text-tertiary px-1.5">
                    +{day.arrangements.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
