/**
 * The seams: the signatures the rest of this app is written against.
 *
 * Import from here, not from `src/components/…`. A seam is a stable name whose
 * implementation arrives later — installing the component that provides one
 * replaces the file behind the signature, and nothing that calls it changes
 * (ARCHITECTURE.md).
 *
 * Two kinds live here, and the difference is worth knowing:
 *
 * **Stubs**, which throw until their component is installed, naming it:
 *   `auth`, `roles`, `db`, `email`, `queue`, `audit`
 *
 * **Conventions**, which are fully implemented and have no component coming:
 *   `money`, `validate`, `paginate`
 *
 * A stub that throws is deliberate. The alternative — a helper that quietly
 * does nothing — makes an audit log that records nothing look exactly like one
 * that works, and you find out on the day you need the record.
 */

export { SeamNotImplemented, SHIPYARD_SEAM_STUB } from './errors';

export { getCurrentUser, requireUser, type SeamUser } from './auth';
export { requireRole } from './roles';
export { scoped, unscopedClient, type ScopedClient } from './db';
export { sendEmail, type SeamEmail, type SeamEmailResult } from './email';
export { enqueue, type SeamJobOptions } from './queue';
export { logAudit, type SeamAuditEvent } from './audit';

export {
  money,
  fromDecimal,
  add,
  subtract,
  times,
  allocate,
  percentage,
  isZero,
  compare,
  toDecimal,
  format,
  exponentFor,
  type Money,
} from './money';

export {
  validate,
  validateBody,
  validateQuery,
  field,
  type Validated,
  type Invalid,
} from './validate';

export {
  pageSize,
  encodeCursor,
  decodeCursor,
  toPage,
  afterCursor,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type Page,
  type PageRequest,
  type Cursor,
} from './paginate';
