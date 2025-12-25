export interface Person {
  id: string;
  name: string;
  isExempt: boolean;
  exemptUntil: string | null; // ISO Date string
}

export enum LocationId {
  V61 = 'Vọng gác 61',
  V62 = 'Vọng gác 62',
  DN1 = 'Đơn nguyên 1',
  DN3 = 'Đơn nguyên 3',
}

export interface TimeSlot {
  id: number;
  label: string;
  startTime: string;
  endTime: string;
}

export interface ShiftAssignment {
  locationId: LocationId;
  slotId: number;
  personId: string | null;
}

export interface DailySchedule {
  date: string; // YYYY-MM-DD
  assignments: ShiftAssignment[];
}

export interface HistoryRecord {
  date: string;
  locationId: LocationId;
  slotId: number;
}

// Map personId to their history
export type PersonnelHistory = Record<string, HistoryRecord[]>;