/** One line of the Staff screen, safe to send to the browser. No database here. */
export interface StaffRow {
  id: string;
  name: string;
  email: string;
  isManager: boolean;
  isRemoved: boolean;
  isYou: boolean;
}

/** True when nobody but the manager looking at the list is still on it. */
export function isOnlyYou(rows: readonly StaffRow[]): boolean {
  return rows.every((row) => row.isYou || row.isRemoved);
}
