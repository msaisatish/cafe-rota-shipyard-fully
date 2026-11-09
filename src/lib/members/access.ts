import { NextResponse } from 'next/server';

import { requireUser } from '@/components/auth/current-user';
import { getCurrentUser } from '@/seams/auth';
import { findMemberByUserId } from './queries';
import type { CafeMember, MemberRole } from './schema';
import { ensureFirstManager } from './service';

/**
 * Who may use the café rota. Signing in proves who someone is; being on the
 * staff list (and not removed) is what lets them in.
 */

export type CafeAccess =
  | { kind: 'signed-out' }
  | { kind: 'not-on-staff'; email: string }
  | { kind: 'must-change-password'; member: CafeMember }
  | { kind: 'member'; member: CafeMember };

export type MemberGate = { ok: true; member: CafeMember } | { ok: false; response: NextResponse };

export interface MemberRequirement {
  /** Only this role may continue. Leave out to let any member through. */
  role?: MemberRole;
  /** True only on the route that sets the person's own password. */
  allowPasswordChange?: boolean;
}

async function activeMemberFor(user: {
  id: string;
  email: string;
  name: string | null;
}): Promise<CafeMember | null> {
  const member = (await findMemberByUserId(user.id)) ?? (await ensureFirstManager(user));
  if (!member || member.removedAt) return null;
  return member;
}

/** For pages: what this visitor may see. Makes the first manager on their first visit. */
export async function getCafeAccess(): Promise<CafeAccess> {
  const user = await getCurrentUser();
  if (!user) return { kind: 'signed-out' };
  const member = await activeMemberFor(user);
  if (!member) return { kind: 'not-on-staff', email: user.email };
  if (member.mustChangePassword) return { kind: 'must-change-password', member };
  return { kind: 'member', member };
}

function refuse(message: string): MemberGate {
  return { ok: false, response: NextResponse.json({ error: message }, { status: 403 }) };
}

/** For routes: the member, or the 401/403 response to send back. */
export async function requireMember(options: MemberRequirement = {}): Promise<MemberGate> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  const member = await activeMemberFor(auth.user);
  if (!member) return refuse('You are not on the café staff list.');
  if (member.mustChangePassword && !options.allowPasswordChange) {
    return refuse('Please choose your own password first.');
  }
  if (options.role && member.role !== options.role) {
    const message = options.role === 'manager' ? 'Only the manager can do that.' : 'Not allowed.';
    return refuse(message);
  }
  return { ok: true, member };
}
