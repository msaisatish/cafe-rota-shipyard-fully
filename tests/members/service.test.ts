import { beforeEach, describe, expect, it, vi } from 'vitest';

import { revokeAllSessions } from '@/components/auth/session';
import {
  addStaffMember,
  chooseOwnPassword,
  ensureFirstManager,
  removeMember,
} from '@/lib/members/service';
import type { CafeMember } from '@/lib/members/schema';
import { fakeDb } from './fake-db';

vi.mock('@/lib/prisma', async () => ({ prisma: (await import('./fake-db')).fakeDb.client }));
vi.mock('@/components/auth/session', () => ({
  revokeAllSessions: vi.fn(async () => 1),
  getSessionUser: vi.fn(async () => null),
}));
vi.mock('@/components/auth/password', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/auth/password')>()),
  // The real rule, a fast hash: bcrypt at full cost would slow every case.
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
}));

const GOOD_PASSWORD = 'Flat-White-2026';
const early = new Date('2026-01-01T00:00:00Z');
const later = new Date('2026-02-01T00:00:00Z');

function asMember(row: Record<string, unknown>): CafeMember {
  return row as unknown as CafeMember;
}

beforeEach(() => {
  fakeDb.reset();
  vi.mocked(revokeAllSessions).mockClear();
});

describe('the first manager', () => {
  const first = { id: 'u1', email: 'owner@cafe.test', name: 'Ola' };

  it('is the earliest account, on its first visit, when there is no manager', async () => {
    fakeDb.addUser({ ...first, createdAt: early });
    fakeDb.addUser({ id: 'u2', email: 'later@cafe.test', createdAt: later });
    const member = await ensureFirstManager(first);
    expect(member).toMatchObject({ userId: 'u1', role: 'manager', name: 'Ola' });
    expect(fakeDb.members[0]?.bootstrapKey).toBe('first-manager');
  });

  it('is never someone who registered later', async () => {
    fakeDb.addUser({ ...first, createdAt: early });
    fakeDb.addUser({ id: 'u2', email: 'later@cafe.test', createdAt: later });
    const member = await ensureFirstManager({ id: 'u2', email: 'later@cafe.test', name: null });
    expect(member).toBeNull();
    expect(fakeDb.members).toHaveLength(0);
  });

  it('is not made again once a manager exists', async () => {
    fakeDb.addUser({ ...first, createdAt: early });
    fakeDb.addMember({ userId: 'u9', role: 'manager' });
    expect(await ensureFirstManager(first)).toBeNull();
    expect(fakeDb.members).toHaveLength(1);
  });

  it('is made once when two visits arrive together', async () => {
    fakeDb.addUser({ ...first, createdAt: early });
    const [a, b] = await Promise.all([ensureFirstManager(first), ensureFirstManager(first)]);
    expect(fakeDb.members).toHaveLength(1);
    expect(a?.id).toBe(b?.id);
  });
});

describe('adding staff', () => {
  const sam = { name: 'Sam', email: 'Sam@Cafe.test', startingPassword: GOOD_PASSWORD };

  it('makes an account that must choose its own password', async () => {
    const result = await addStaffMember(sam);
    expect(result).toMatchObject({ ok: true, outcome: 'created' });
    expect(fakeDb.users[0]).toMatchObject({
      email: 'sam@cafe.test',
      passwordHash: 'hashed:' + GOOD_PASSWORD,
    });
    expect(fakeDb.members[0]).toMatchObject({ role: 'staff', mustChangePassword: true });
  });

  it('refuses a weak starting password with the rule’s first message', async () => {
    const result = await addStaffMember({ ...sam, startingPassword: 'short' });
    expect(result).toMatchObject({ ok: false, field: 'startingPassword' });
    expect(result.ok ? '' : result.message).toMatch(/at least 12 characters/);
    expect(fakeDb.users).toHaveLength(0);
  });

  it('links an existing account without forcing a new password', async () => {
    fakeDb.addUser({ id: 'u5', email: 'sam@cafe.test', passwordHash: 'theirs', createdAt: early });
    const result = await addStaffMember({ ...sam, startingPassword: '' });
    expect(result).toMatchObject({ ok: true, outcome: 'linked' });
    expect(fakeDb.members[0]).toMatchObject({ userId: 'u5', mustChangePassword: false });
    expect(fakeDb.users[0]?.passwordHash).toBe('theirs');
  });

  it('reactivates someone who left, with a new starting password', async () => {
    fakeDb.addUser({ id: 'u5', email: 'sam@cafe.test', disabledAt: later, createdAt: early });
    fakeDb.addMember({ userId: 'u5', removedAt: later });
    const result = await addStaffMember(sam);
    expect(result).toMatchObject({ ok: true, outcome: 'reactivated' });
    expect(fakeDb.members[0]).toMatchObject({ removedAt: null, mustChangePassword: true });
    expect(fakeDb.users[0]).toMatchObject({
      disabledAt: null,
      passwordHash: 'hashed:' + GOOD_PASSWORD,
    });
  });

  it('refuses someone already on the list', async () => {
    fakeDb.addUser({ id: 'u5', email: 'sam@cafe.test', createdAt: early });
    fakeDb.addMember({ userId: 'u5', name: 'Sam' });
    const result = await addStaffMember(sam);
    expect(result).toMatchObject({ ok: false, field: 'email' });
  });
});

describe('removing someone', () => {
  it('takes them off the list, disables the account and signs them out', async () => {
    const manager = asMember(fakeDb.addMember({ userId: 'm1', role: 'manager' }));
    fakeDb.addUser({ id: 'u5', email: 'sam@cafe.test', createdAt: early });
    const sam = fakeDb.addMember({ userId: 'u5' });
    const result = await removeMember({ memberId: sam.id as string, removedBy: manager });
    expect(result.ok).toBe(true);
    expect(fakeDb.members[1]?.removedAt).toBeInstanceOf(Date);
    expect(fakeDb.users[0]?.disabledAt).toBeInstanceOf(Date);
    expect(revokeAllSessions).toHaveBeenCalledWith('u5');
  });

  it('refuses removing yourself', async () => {
    const manager = asMember(fakeDb.addMember({ userId: 'm1', role: 'manager' }));
    const result = await removeMember({ memberId: manager.id, removedBy: manager });
    expect(result.ok).toBe(false);
    expect(revokeAllSessions).not.toHaveBeenCalled();
  });
});

describe('choosing your own password', () => {
  it('saves it and lifts the must-change flag', async () => {
    fakeDb.addUser({ id: 'u5', email: 'sam@cafe.test', createdAt: early });
    const sam = asMember(fakeDb.addMember({ userId: 'u5', name: 'Sam', mustChangePassword: true }));
    const result = await chooseOwnPassword({
      member: sam,
      email: 'sam@cafe.test',
      password: GOOD_PASSWORD,
    });
    expect(result.ok).toBe(true);
    expect(fakeDb.users[0]?.passwordHash).toBe('hashed:' + GOOD_PASSWORD);
    expect(fakeDb.members[0]?.mustChangePassword).toBe(false);
  });

  it('keeps the flag when the password breaks the rule', async () => {
    fakeDb.addUser({ id: 'u5', email: 'sam@cafe.test', createdAt: early });
    const sam = asMember(fakeDb.addMember({ userId: 'u5', name: 'Sam', mustChangePassword: true }));
    const result = await chooseOwnPassword({
      member: sam,
      email: 'sam@cafe.test',
      password: 'password',
    });
    expect(result.ok).toBe(false);
    expect(fakeDb.members[0]?.mustChangePassword).toBe(true);
  });
});
