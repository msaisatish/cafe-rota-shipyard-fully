import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionUser } from '@/components/auth/session';
import { POST } from '@/app/api/staff/route';
import { DELETE } from '@/app/api/staff/[memberId]/route';
import { fakeDb } from '../members/fake-db';

vi.mock('@/lib/prisma', async () => ({
  prisma: (await import('../members/fake-db')).fakeDb.client,
}));
vi.mock('@/components/auth/session', () => ({
  revokeAllSessions: vi.fn(async () => 1),
  getSessionUser: vi.fn(async () => null),
}));
vi.mock('@/components/auth/password', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/auth/password')>()),
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
}));

const GOOD_PASSWORD = 'Flat-White-2026';

type Reply = { error?: string; fieldErrors?: Record<string, string>; outcome?: string };

function signInAs(userId: string): void {
  const email = `${userId}@cafe.test`;
  vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email, name: null });
}

function add(body: Record<string, unknown>): Promise<Response> {
  const request = new Request('http://cafe.test/api/staff', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return POST(request);
}

function remove(memberId: string): Promise<Response> {
  const request = new Request(`http://cafe.test/api/staff/${memberId}`, { method: 'DELETE' });
  return DELETE(request, { params: Promise.resolve({ memberId }) });
}

const newcomer = { name: 'Alex', email: 'alex@cafe.test', startingPassword: GOOD_PASSWORD };

beforeEach(() => {
  fakeDb.reset();
  vi.mocked(getSessionUser).mockResolvedValue(null);
  fakeDb.addUser({ id: 'boss', email: 'boss@cafe.test', createdAt: new Date('2026-01-01') });
  fakeDb.addUser({ id: 'sam', email: 'sam@cafe.test', createdAt: new Date('2026-02-01') });
  fakeDb.addMember({ userId: 'boss', name: 'Bea', role: 'manager' });
  fakeDb.addMember({ userId: 'sam', name: 'Sam' });
});

describe('who may change the staff list', () => {
  it('turns away a visitor who is not signed in', async () => {
    expect((await add(newcomer)).status).toBe(401);
    expect((await remove('member_sam')).status).toBe(401);
  });

  it('refuses a staff member', async () => {
    signInAs('sam');
    expect((await add(newcomer)).status).toBe(403);
    expect((await remove('member_boss')).status).toBe(403);
    expect(fakeDb.members).toHaveLength(2);
    expect(fakeDb.members.every((member) => member.removedAt === null)).toBe(true);
  });
});

describe('adding a staff member', () => {
  it('adds a new person for the manager', async () => {
    signInAs('boss');
    const response = await add(newcomer);
    const reply = (await response.json()) as Reply;
    expect(response.status).toBe(201);
    expect(reply.outcome).toBe('created');
    expect(fakeDb.members.some((member) => member.name === 'Alex')).toBe(true);
  });

  it('says which box is missing', async () => {
    signInAs('boss');
    const response = await add({ name: '', email: 'not-an-email', startingPassword: '' });
    const reply = (await response.json()) as Reply;
    expect(response.status).toBe(400);
    expect(reply.fieldErrors?.name).toBeTruthy();
    expect(reply.fieldErrors?.email).toBeTruthy();
    expect(reply.fieldErrors?.startingPassword).toBeTruthy();
  });

  it('puts a short password problem under the password', async () => {
    signInAs('boss');
    const response = await add({ ...newcomer, startingPassword: 'short' });
    const reply = (await response.json()) as Reply;
    expect(response.status).toBe(400);
    expect(reply.fieldErrors?.startingPassword).toContain('12 characters');
    expect(fakeDb.members).toHaveLength(2);
  });

  it('puts an email already on the list under the email', async () => {
    signInAs('boss');
    const response = await add({ ...newcomer, email: 'sam@cafe.test' });
    const reply = (await response.json()) as Reply;
    expect(response.status).toBe(400);
    expect(reply.fieldErrors?.email).toBeTruthy();
  });
});

describe('removing a staff member', () => {
  it('takes them off the list', async () => {
    signInAs('boss');
    expect((await remove('member_sam')).status).toBe(200);
    const sam = fakeDb.members.find((member) => member.userId === 'sam');
    expect(sam?.removedAt).toBeInstanceOf(Date);
  });

  it('will not let the manager remove themselves', async () => {
    signInAs('boss');
    const response = await remove('member_boss');
    const reply = (await response.json()) as Reply;
    expect(response.status).toBe(400);
    expect(reply.error).toBe('You cannot remove yourself from the staff list.');
    expect(fakeDb.members.find((member) => member.userId === 'boss')?.removedAt).toBeNull();
  });
});
