import { checkPassword, hashPassword, normaliseEmail } from '@/components/auth/password';
import { revokeAllSessions } from '@/components/auth/session';
import { turnDownSwapsOf } from '@/lib/swaps/service';
import {
  countActiveManagers,
  createFirstManager,
  createStaffAccount,
  findEarliestUserId,
  findMemberById,
  findMemberByUserId,
  findUserByEmail,
  isUniqueClash,
  linkExistingUser,
  markRemoved,
  reactivateMember,
  saveOwnPassword,
} from './queries';
import type { AddStaffInput, CafeMember } from './schema';

/** The rules for who is on the café's staff list. */

export type MemberFailure = { ok: false; message: string; field?: string };
export type AddStaffOutcome = 'created' | 'linked' | 'reactivated';
export type AddStaffResult =
  { ok: true; member: CafeMember; outcome: AddStaffOutcome } | MemberFailure;

interface SignedInUser {
  id: string;
  email: string;
  name: string | null;
}

function nameFromEmail(email: string): string {
  return email.split('@')[0] || email;
}

/**
 * The person who set the app up becomes its manager on their first visit.
 * Only while there is no manager, and only for the earliest account, so a
 * stranger who registers later can never promote themselves.
 */
export async function ensureFirstManager(user: SignedInUser): Promise<CafeMember | null> {
  if ((await countActiveManagers()) > 0) return null;
  if ((await findEarliestUserId()) !== user.id) return null;
  if (await findMemberByUserId(user.id)) return null;
  const created = await createFirstManager({
    userId: user.id,
    name: user.name?.trim() || nameFromEmail(user.email),
  });
  // Lost the race to a second tab: the winner's row is the answer.
  return created ?? findMemberByUserId(user.id);
}

function passwordProblem(input: AddStaffInput, email: string): MemberFailure | null {
  const check = checkPassword(input.startingPassword, { email, name: input.name });
  if (check.ok) return null;
  const message = check.issues[0] ?? 'Please choose a different password.';
  return { ok: false, message, field: 'startingPassword' };
}

/**
 * Adds a person: a new account, an existing account joining the list, or
 * someone who left coming back with a new starting password.
 */
export async function addStaffMember(input: AddStaffInput): Promise<AddStaffResult> {
  const email = normaliseEmail(input.email);
  const name = input.name.trim();
  const user = await findUserByEmail(email);
  const existing = user ? await findMemberByUserId(user.id) : null;

  if (existing && !existing.removedAt) {
    const message = 'That email is already on your staff list.';
    return { ok: false, message, field: 'email' };
  }
  if (user && !existing) {
    const member = await linkExistingUser({ userId: user.id, name });
    return { ok: true, member, outcome: 'linked' };
  }

  const problem = passwordProblem(input, email);
  if (problem) return problem;
  const passwordHash = await hashPassword(input.startingPassword);

  if (existing) {
    const member = await reactivateMember({ member: existing, name, passwordHash });
    return { ok: true, member, outcome: 'reactivated' };
  }
  return createNewAccount({ name, email, passwordHash });
}

async function createNewAccount(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<AddStaffResult> {
  try {
    return { ok: true, member: await createStaffAccount(input), outcome: 'created' };
  } catch (error) {
    if (!isUniqueClash(error)) throw error;
    const message = 'That email was added a moment ago. Please refresh the page.';
    return { ok: false, message, field: 'email' };
  }
}

/** Takes someone off the list, closes their account and signs them out everywhere. */
export async function removeMember(input: {
  memberId: string;
  removedBy: CafeMember;
}): Promise<{ ok: true; member: CafeMember } | MemberFailure> {
  const member = await findMemberById(input.memberId);
  if (!member || member.removedAt) {
    return { ok: false, message: 'That person is not on the staff list.' };
  }
  if (member.id === input.removedBy.id) {
    return { ok: false, message: 'You cannot remove yourself from the staff list.' };
  }
  await markRemoved(member);
  await revokeAllSessions(member.userId);
  await turnDownSwapsOf(member.id);
  return { ok: true, member };
}

/** A person replaces their starting password with one of their own. */
export async function chooseOwnPassword(input: {
  member: CafeMember;
  email: string;
  password: string;
}): Promise<{ ok: true } | MemberFailure> {
  const check = checkPassword(input.password, { email: input.email, name: input.member.name });
  if (!check.ok) {
    const message = check.issues[0] ?? 'Please choose a different password.';
    return { ok: false, message, field: 'password' };
  }
  const passwordHash = await hashPassword(input.password);
  await saveOwnPassword({ member: input.member, passwordHash });
  return { ok: true };
}
