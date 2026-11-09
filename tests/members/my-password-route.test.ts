import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionUser } from '@/components/auth/session';
import { POST } from '@/app/api/my-password/route';
import { fakeDb } from './fake-db';

vi.mock('@/lib/prisma', async () => ({ prisma: (await import('./fake-db')).fakeDb.client }));
vi.mock('@/components/auth/session', () => ({
  revokeAllSessions: vi.fn(async () => 1),
  getSessionUser: vi.fn(async () => null),
}));
vi.mock('@/components/auth/password', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/auth/password')>()),
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
}));

const GOOD_PASSWORD = 'Flat-White-2026';
const early = new Date('2026-01-01T00:00:00Z');
const later = new Date('2026-02-01T00:00:00Z');

function choose(password: string, confirmPassword = password): Promise<Response> {
  const body = JSON.stringify({ password, confirmPassword });
  return POST(new Request('http://cafe.test/api/my-password', { method: 'POST', body }));
}

function samWith(mustChangePassword: boolean): void {
  fakeDb.addMember({ userId: 'boss', role: 'manager' });
  fakeDb.addMember({ userId: 'sam', name: 'Sam', mustChangePassword });
  vi.mocked(getSessionUser).mockResolvedValue({ id: 'sam', email: 'sam@cafe.test', name: null });
}

function samMember() {
  return fakeDb.members.find((member) => member.userId === 'sam');
}

beforeEach(() => {
  fakeDb.reset();
  vi.mocked(getSessionUser).mockResolvedValue(null);
  fakeDb.addUser({ id: 'boss', email: 'boss@cafe.test', createdAt: early });
  fakeDb.addUser({ id: 'sam', email: 'sam@cafe.test', createdAt: later });
});

describe('choosing your own password', () => {
  it('turns away a visitor who is not signed in', async () => {
    expect((await choose(GOOD_PASSWORD)).status).toBe(401);
  });

  it('saves it for someone still on their starting password', async () => {
    samWith(true);
    expect((await choose(GOOD_PASSWORD)).status).toBe(200);
    expect(samMember()?.mustChangePassword).toBe(false);
  });

  it('is refused once the person has already chosen their own', async () => {
    samWith(false);
    expect((await choose(GOOD_PASSWORD)).status).toBe(403);
  });

  it('refuses two passwords that do not match', async () => {
    samWith(true);
    const response = await choose(GOOD_PASSWORD, 'Something-Else-2026');
    const reply = (await response.json()) as { fieldErrors: Record<string, string> };
    expect(response.status).toBe(400);
    expect(reply.fieldErrors.confirmPassword).toBe("The two passwords don't match.");
    expect(samMember()?.mustChangePassword).toBe(true);
  });

  it('refuses a weak password and keeps the starting one', async () => {
    samWith(true);
    const response = await choose('short');
    const reply = (await response.json()) as { fieldErrors: Record<string, string> };
    expect(response.status).toBe(400);
    expect(reply.fieldErrors.password).toBeTruthy();
    expect(samMember()?.mustChangePassword).toBe(true);
  });
});
