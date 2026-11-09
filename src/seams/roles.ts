import { SeamNotImplemented, SHIPYARD_SEAM_STUB } from './errors';
import type { SeamUser } from './auth';

export { SHIPYARD_SEAM_STUB };

/**
 * What the signed-in person is allowed to do.
 *
 * Its own file rather than part of `auth`, because a different component
 * implements it — and a seam file has exactly one owner. Two components
 * installing over the same path is the collision the installer refuses, and
 * putting `requireRole` beside `getCurrentUser` would create it the first time
 * somebody installed both.
 *
 * It throws rather than returning false for the same reason `requireUser`
 * does: a boolean lets a caller forget the `if` and carry on past a failed
 * check, which is the most common way a private page ends up public.
 */
export async function requireRole(...roles: readonly string[]): Promise<SeamUser> {
  void roles;
  throw new SeamNotImplemented('requireRole()', 'Who is allowed to do what', 'rbac');
}
