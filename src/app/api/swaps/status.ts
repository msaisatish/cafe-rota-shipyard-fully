import type { SwapFailure } from '@/lib/swaps/service';

/** The HTTP status for each way a swap can be refused. */
export function statusFor(reason: SwapFailure['reason']): number {
  if (reason === 'missing') return 404;
  if (reason === 'conflict') return 409;
  return 400;
}
