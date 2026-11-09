import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionUser } from '@/components/auth/session';
import { getCafeAccess, requireMember } from '@/lib/members/access';
import { fakeDb } from './fake-db';

vi.mock('@/lib/prisma', async () => ({ prisma: (await import('./fake-db')).fakeDb.client }));
vi.mock('@/components/auth/session', () => ({
  revokeAllSessions: vi.fn(async () => 1),
  getSessionUser: vi.fn(async () => null),
}));

const early = new Date('2026-01-01T00:00:00Z');
const later = new Date('2026-02-01T00:00:00Z');

function signInAs(id: string, email: string): void {
  vi.mocked(getSessionUser).mockResolvedValue({ id, email, name: null });
}

async function statusOf(gate: Awaited<ReturnType<typeof requireMember>>): Promise<number> {
  return gate.ok ? 200 : gate.response.status;
}

beforeEach(() => {
  fakeDb.reset();
  vi.mocked(getSessionUser).mockResolvedValue(null);
  fakeDb.addUser({ id: 'boss', email: 'boss@cafe.test', createdAt: early });
  fakeDb.addUser({ id: 'sam', email: 'sam@cafe.test', createdAt: later });
});

describe('manager routes', () => {
  it('turn away a visitor who is not signed in', async () => {
    expect(await statusOf(await requireMember({ role: 'manager' }))).toBe(401);
  });

  it('refuse staff', async () => {
    fakeDb.addMember({ userId: 'boss', role: 'manager' });
    fakeDb.addMember({ userId: 'sam' });
    signInAs('sam', 'sam@cafe.test');
    expect(await statusOf(await requireMember({ role: 'manager' }))).toBe(403);
  });

  it('let the manager through', async () => {
    fakeDb.addMember({ userId: 'boss', role: 'manager' });
    signInAs('boss', 'boss@cafe.test');
    const gate = await requireMember({ role: 'manager' });
    expect(gate.ok && gate.member.role).toBe('manager');
  });

  it('refuse someone who has been removed', async () => {
    fakeDb.addMember({ userId: 'boss', role: 'manager' });
    fakeDb.addMember({ userId: 'sam', removedAt: later });
    signInAs('sam', 'sam@cafe.test');
    expect(await statusOf(await requireMember())).toBe(403);
  });

  it('refuse an account that is not on the staff list', async () => {
    fakeDb.addMember({ userId: 'boss', role: 'manager' });
    signInAs('sam', 'sam@cafe.test');
    expect(await statusOf(await requireMember())).toBe(403);
  });
});

describe('a starting password still in use', () => {
  beforeEach(() => {
    fakeDb.addMember({ userId: 'boss', role: 'manager' });
    fakeDb.addMember({ userId: 'sam', mustChangePassword: true });
    signInAs('sam', 'sam@cafe.test');
  });

  it('blocks every route', async () => {
    expect(await statusOf(await requireMember())).toBe(403);
    expect(await statusOf(await requireMember({ role: 'staff' }))).toBe(403);
  });

  it('but not the one that sets their own password', async () => {
    expect(await statusOf(await requireMember({ allowPasswordChange: true }))).toBe(200);
  });

  it('sends pages to the password screen', async () => {
    expect((await getCafeAccess()).kind).toBe('must-change-password');
  });
});

describe('what pages see', () => {
  it('is signed-out with nobody signed in', async () => {
    expect(await getCafeAccess()).toEqual({ kind: 'signed-out' });
  });

  it('makes the earliest account the manager on its first visit', async () => {
    signInAs('boss', 'boss@cafe.test');
    const access = await getCafeAccess();
    expect(access.kind === 'member' && access.member.role).toBe('manager');
  });

  it('is not-on-staff for a later account with no member record', async () => {
    fakeDb.addMember({ userId: 'boss', role: 'manager' });
    signInAs('sam', 'sam@cafe.test');
    expect(await getCafeAccess()).toEqual({ kind: 'not-on-staff', email: 'sam@cafe.test' });
  });
});
