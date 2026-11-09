import { Status } from '@/components/ui_foundation/Status';
import type { MySwap } from '@/lib/swaps/view';

function MySwapStatus({ swap }: { swap: MySwap }) {
  if (swap.status === 'approved') {
    return <Status tone="ok" label={`Approved – ${swap.to} has this shift now`} />;
  }
  if (swap.status === 'turned_down') {
    return <Status tone="neutral" label="Turned down – this shift is still yours" />;
  }
  return <Status tone="warn" label="Waiting for the manager" />;
}

/** "My swap requests", newest first. Hidden when there are none (DESIGN.md section 4). */
export function MySwapRequests({ requests }: { requests: readonly MySwap[] }) {
  if (requests.length === 0) return null;
  return (
    <section className="my-swaps" aria-labelledby="my-swaps-label">
      <h2 id="my-swaps-label" className="my-shifts-week-label">
        My swap requests
      </h2>
      <ul className="my-swaps-list">
        {requests.map((swap) => (
          <li key={swap.id} className="my-swap">
            <span>
              {swap.shift} → {swap.to}
            </span>
            <MySwapStatus swap={swap} />
          </li>
        ))}
      </ul>
    </section>
  );
}
