import { getSessionUser, type SessionUser } from '@/components/auth/session';

/**
 * The auth seam, now implemented.
 *
 * This file replaced the stub that threw "this needs the Signing in
 * component". Every caller of `getCurrentUser()` and `requireUser()` written
 * before the install keeps working unchanged — that is what the seam is for
 * (ARCHITECTURE.md, ARC-03).
 *
 * This file declares no stub marker, and that absence is load-bearing: it is
 * what stops a later install quietly replacing a file that now holds real
 * behaviour.
 *
 * Protected, like the rest of the component. If this is wrong for your project,
 * change the code that calls it rather than editing here.
 */

export type SeamUser = SessionUser & {
  role?: string;
  organizationId?: string;
};

/** The signed-in user, or null. Safe to call anywhere on the server. */
export async function getCurrentUser(): Promise<SeamUser | null> {
  return getSessionUser();
}

/**
 * The signed-in user, or throw.
 *
 * Throwing rather than returning null is the point: a caller cannot forget an
 * `if` and carry on past a failed check, which is the most common way a
 * private page ends up public. In a route handler, prefer `requireUser()` from
 * `@/components/auth/current-user`, which hands back a 401 response instead of
 * an exception.
 */
export async function requireUser(): Promise<SeamUser> {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in.');
  return user;
}
