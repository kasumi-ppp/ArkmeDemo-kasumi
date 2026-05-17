import React from "react";
import { cn } from "@/lib/utils";
import type { ArrangementItem } from "@/types/arrangement";

interface ArrangementDraftModalProps {
  draft: Partial<ArrangementItem>;
  onConfirm: () => void;
  onEdit: () => void;
  onIgnore: () => void;
  onClose: () => void;
}

export default function ArrangementDraftModal({
  draft,
  onConfirm,
  onEdit,
  onIgnore,
  onClose,
}: ArrangementDraftModalProps) {
  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  const confidenceLabel = draft.aiConfidence
    ? draft.aiConfidence > 0.7
      ? "高置信度"
      : draft.aiConfidence > 0.5
      ? "中置信度"
      : "低置信度"
    : "";

  const confidenceColor = draft.aiConfidence
    ? draft.aiConfidence > 0.7
      ? "text-success"
      : draft.aiConfidence > 0.5
      ? "text-primary"
      : "text-warning"
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md animate-slide-up rounded-t-[20px] bg-surface">
        <div className="px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">AI 识别到安排</h3>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-hover-overlay"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {confidenceLabel && (
            <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1">
              <span className={cn("text-xs", confidenceColor)}>{confidenceLabel}</span>
              {draft.aiConfidence && (
                <span className="text-xs text-text-tertiary">
                  {(draft.aiConfidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          )}

          <div className="mb-4 rounded-lg border border-border bg-surface-card p-4">
            <div className="mb-3">
              <span className="text-xs text-text-tertiary">来源消息</span>
              <p className="mt-1 text-sm text-text-muted">
                {draft.origin?.rawContent || draft.note || draft.title}
              </p>
            </div>

            <div className="mb-3">
              <span className="text-xs text-text-tertiary">标题</span>
              <h4 className="mt-1 text-base font-medium text-text">{draft.title}</h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {formatDate(draft.scheduledAt) && (
                <div>
                  <span className="text-xs text-text-tertiary">时间</span>
                  <p className="mt-1 text-sm text-text">📅 {formatDate(draft.scheduledAt)}</p>
                </div>
              )}
              {draft.location && (
                <div>
                  <span className="text-xs text-text-tertiary">地点</span>
                  <p className="mt-1 text-sm text-text">📍 {draft.location}</p>
                </div>
              )}
              {draft.people && draft.people.length > 0 && (
                <div className="col-span-2">
                  <span className="text-xs text-text-tertiary">相关人物</span>
                  <p className="mt-1 text-sm text-text">👤 {draft.people.join(", ")}</p>
                </div>
              )}
            </div>

            {draft.note && draft.note !== draft.title && (
              <div className="mt-3">
                <span className="text-xs text-text-tertiary">备注</span>
                <p className="mt-1 text-sm text-text-muted">{draft.note}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-lg border border-border px-4 py-3 text-sm font-medium text-text-tertiary transition hover:bg-surface-muted"
              onClick={onIgnore}
            >
              忽略
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg border border-border px-4 py-3 text-sm font-medium text-text transition hover:bg-surface-muted"
              onClick={onEdit}
            >
              编辑
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-dark"
              onClick={onConfirm}
            >
              确认创建
            </button>
          </div>
        </div>

        <div className="h-safe-area-inset-bottom" />
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
