import { Status } from '@/components/ui_foundation/Status';
import type { SwapStatus } from '@/lib/swaps/schema';

/** How the manager sees a request's status (DESIGN.md section 5). */
export function ManagerSwapStatus({ status }: { status: SwapStatus }) {
  if (status === 'approved') return <Status tone="ok" label="Approved" />;
  if (status === 'turned_down') return <Status tone="neutral" label="Turned down" />;
  return <Status tone="warn" label="Waiting for you" />;
}
