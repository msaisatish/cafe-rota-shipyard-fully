import { SeamNotImplemented, SHIPYARD_SEAM_STUB } from './errors';

export { SHIPYARD_SEAM_STUB };

/**
 * Reaching the database, scoped to one customer.
 *
 * `scoped()` is the seam that matters. Once tenant separation is installed, a
 * query that is not scoped to an organisation **throws** rather than quietly
 * running across every customer's rows — which is the failure that looks
 * exactly like working software right up until the wrong person reads
 * somebody else's data.
 *
 * Until then it throws here, which is the same answer arriving earlier.
 *
 * The unscoped client stays available on purpose: a single-tenant app, a
 * migration or a seed script legitimately needs it. It is named so that using
 * it is a visible decision rather than the path of least resistance.
 */

export interface ScopedClient {
  readonly organizationId: string;
}

/** The database, scoped to one organisation. Everything customer-facing uses this. */
export function scoped(organizationId: string): ScopedClient {
  void organizationId;
  throw new SeamNotImplemented('scoped()', 'Keeping customers separate', 'organization_tenancy');
}

/**
 * The whole database, unscoped.
 *
 * Correct for seeds, migrations and genuinely single-tenant apps. Never
 * correct in a request handler once more than one customer exists.
 */
export async function unscopedClient(): Promise<unknown> {
  const { prisma } = await import('@/lib/prisma');
  return prisma;
}
