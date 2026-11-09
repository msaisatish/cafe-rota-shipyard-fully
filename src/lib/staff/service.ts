import { listStaffRecords, type StaffRecord } from './queries';
import type { StaffRow } from './rows';

function toRow(record: StaffRecord, viewerId: string): StaffRow {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    isManager: record.role === 'manager',
    isRemoved: record.removedAt !== null,
    isYou: record.id === viewerId,
  };
}

/**
 * The staff list as the manager sees it: by name, and people who have left
 * last, so the ones who can be put on a shift are always at the top.
 */
export async function staffListFor(viewerId: string): Promise<StaffRow[]> {
  const rows = (await listStaffRecords()).map((record) => toRow(record, viewerId));
  const current = rows.filter((row) => !row.isRemoved);
  const removed = rows.filter((row) => row.isRemoved);
  return [...current, ...removed];
}
