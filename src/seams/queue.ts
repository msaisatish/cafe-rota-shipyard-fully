import { SeamNotImplemented, SHIPYARD_SEAM_STUB } from './errors';

export { SHIPYARD_SEAM_STUB };

/**
 * Work that happens later.
 *
 * Anything slow — sending a batch, generating a report, calling somebody
 * else's API — goes through here rather than blocking a request. Writing it
 * against this seam from the start is what makes adding a real queue later a
 * component install rather than a rewrite of every call site.
 */

export interface SeamJobOptions {
  /** Earliest time to run it. */
  runAt?: Date;
  /** How many times to retry before giving up. */
  maxAttempts?: number;
}

export async function enqueue(
  jobName: string,
  payload: Record<string, unknown>,
  options?: SeamJobOptions,
): Promise<{ id: string }> {
  void jobName;
  void payload;
  void options;
  throw new SeamNotImplemented('enqueue()', 'Work that happens in the background', 'background_job_runner');
}
