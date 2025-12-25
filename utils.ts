import { HistoryRecord, LocationId, Person, PersonnelHistory } from './types';

// Check if a person is available to work on a specific date
export const isPersonAvailable = (person: Person, targetDate: string): boolean => {
  if (person.isExempt) return false;
  if (person.exemptUntil) {
    const exemptDate = new Date(person.exemptUntil);
    const checkDate = new Date(targetDate);
    // If exemptUntil is today or in future, they are not available
    if (exemptDate >= checkDate) return false;
  }
  return true;
};

// The Core Logic: Validate Drop based on History
// Rule: Check last 3 shifts. Cannot repeat Location OR Slot ID.
export const checkAssignmentValidity = (
  personHistory: HistoryRecord[] = [],
  targetLocation: LocationId,
  targetSlotId: number
): { valid: boolean; reason?: string } => {
  
  // Get last 3 assignments
  // Assuming history is sorted descending by date/time when stored
  const recentHistory = personHistory.slice(0, 3);

  for (const record of recentHistory) {
    if (record.locationId === targetLocation) {
      return { valid: false, reason: `Đã gác ${targetLocation} gần đây` };
    }
    if (record.slotId === targetSlotId) {
      return { valid: false, reason: `Đã gác Ca ${targetSlotId} gần đây` };
    }
  }

  return { valid: true };
};

export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

// Helper to get the most recent date a person guarded
export const getLastGuardedDate = (history: HistoryRecord[] | undefined): string | null => {
  if (!history || history.length === 0) return null;
  // History is assumed to be sorted with newest first (index 0)
  return history[0].date;
};

// Sort personnel by priority: Never guarded -> Guarded long ago -> Guarded recently -> Name
export const sortPersonnelByPriority = (personnel: Person[], history: PersonnelHistory) => {
  return [...personnel].sort((a, b) => {
    const lastDateA = getLastGuardedDate(history[a.id]);
    const lastDateB = getLastGuardedDate(history[b.id]);

    // Priority 1: Those who haven't guarded yet come first
    if (lastDateA === null && lastDateB !== null) return -1;
    if (lastDateA !== null && lastDateB === null) return 1;

    // Priority 2: Those who guarded longer ago come first (Ascending date sort)
    if (lastDateA && lastDateB) {
      if (lastDateA < lastDateB) return -1;
      if (lastDateA > lastDateB) return 1;
    }

    // Priority 3: Alphabetical by Name
    return a.name.localeCompare(b.name);
  });
};