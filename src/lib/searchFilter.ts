import type { ArrangementItem, ArrangementPriority, ArrangementStatus } from '../types/arrangement';

export function filterArrangements(
  arrangements: ArrangementItem[],
  searchQuery: string,
  filterPriority: ArrangementPriority | 'all',
  filterStatus: ArrangementStatus | 'all',
  filterTag: string
): ArrangementItem[] {
  return arrangements.filter((a) => {
    const matchSearch = !searchQuery || 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.people.some(p => p.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchPriority = filterPriority === 'all' || a.priority === filterPriority;
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchTag = filterTag === 'all' || a.topicTags.includes(filterTag);
    
    return matchSearch && matchPriority && matchStatus && matchTag;
  });
}

export function extractAllTags(arrangements: ArrangementItem[]): string[] {
  return [...new Set(arrangements.flatMap(a => a.topicTags))];
}

export function getOverdueArrangements(arrangements: ArrangementItem[]): ArrangementItem[] {
  const now = Date.now();
  return arrangements.filter((a) => {
    if (!a.scheduledAt || a.status !== 'pending') return false;
    return a.scheduledAt < now;
  });
}

export function getTodayArrangements(arrangements: ArrangementItem[]): ArrangementItem[] {
  const now = new Date();
  return arrangements.filter((a) => {
    if (!a.scheduledAt || a.status !== 'pending') return false;
    const itemDate = new Date(a.scheduledAt);
    return itemDate.toDateString() === now.toDateString();
  });
}

export function getUpcomingArrangements(arrangements: ArrangementItem[]): ArrangementItem[] {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return arrangements.filter((a) => {
    if (!a.scheduledAt || a.status !== 'pending') return false;
    const itemDate = new Date(a.scheduledAt);
    return itemDate.toDateString() !== now.toDateString() && itemDate >= tomorrow;
  });
}
