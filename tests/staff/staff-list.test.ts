import { describe, expect, it, vi } from 'vitest';

import { isOnlyYou } from '@/lib/staff/rows';
import { staffListFor } from '@/lib/staff/service';

vi.mock('@/lib/staff/queries', () => ({
  listStaffRecords: vi.fn(async () => [
    { id: 'a', userId: 'ua', name: 'Ann', role: 'staff', removedAt: new Date(), email: 'a@x.test' },
    { id: 'b', userId: 'ub', name: 'Bea', role: 'manager', removedAt: null, email: 'b@x.test' },
    { id: 'c', userId: 'uc', name: 'Cal', role: 'staff', removedAt: null, email: 'c@x.test' },
  ]),
}));

describe('the staff list', () => {
  it('keeps name order and puts people who left last', async () => {
    const rows = await staffListFor('b');
    expect(rows.map((row) => row.name)).toEqual(['Bea', 'Cal', 'Ann']);
    expect(rows[0]?.isYou).toBe(true);
    expect(rows[2]?.isRemoved).toBe(true);
  });

  it('is "just you" only when nobody else is still working here', async () => {
    const rows = await staffListFor('b');
    expect(isOnlyYou(rows)).toBe(false);
    expect(isOnlyYou(rows.filter((row) => row.name !== 'Cal'))).toBe(true);
  });
});
