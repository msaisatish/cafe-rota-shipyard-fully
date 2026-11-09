import { SeamNotImplemented, SHIPYARD_SEAM_STUB } from './errors';

export { SHIPYARD_SEAM_STUB };

/**
 * A record of who did what.
 *
 * This one has the most dangerous possible stub, which is why it throws
 * loudly rather than doing nothing. An audit log that silently discards
 * everything is indistinguishable from one that works until the day somebody
 * needs to prove what happened — and by then the record does not exist.
 */

export interface SeamAuditEvent {
  /** A stable identifier such as `booking.cancelled`, not a sentence. */
  action: string;
  entityType: string;
  entityId?: string;
  /** Null when the system did it rather than a person. */
  actorUserId?: string | null;
  organizationId?: string;
  /** Redacted before it is written. Never passwords, keys or tokens. */
  details?: Record<string, unknown>;
}

export async function logAudit(event: SeamAuditEvent): Promise<void> {
  void event;
  throw new SeamNotImplemented('logAudit()', 'A record of who did what', 'audit_logging');
}
