import { NextResponse } from 'next/server';

import { validateBody } from '@/seams/validate';
import { requireMember } from '@/lib/members/access';
import { askSwapSchema } from '@/lib/swaps/schema';
import { askForSwap, swapRequestsForManager } from '@/lib/swaps/service';
import { statusFor } from './status';

/** `GET /api/swaps` — the manager's list, waiting requests first. */
export async function GET() {
  const gate = await requireMember({ role: 'manager' });
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ swaps: await swapRequestsForManager() });
  } catch (error) {
    console.error('[swaps] could not list swap requests', error);
    const message = "We couldn't load the swap requests. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** `POST /api/swaps` — a member of staff asks a colleague to take one of their shifts. */
export async function POST(request: Request) {
  const gate = await requireMember({ role: 'staff' });
  if (!gate.ok) return gate.response;

  const input = await validateBody(request, askSwapSchema);
  if (!input.ok) {
    return NextResponse.json(
      { error: input.message, fieldErrors: input.fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await askForSwap({ asker: gate.member, request: input.data });
    if (!result.ok) {
      const fieldErrors = result.field ? { [result.field]: result.message } : {};
      return NextResponse.json(
        { error: result.message, fieldErrors },
        { status: statusFor(result.reason) },
      );
    }
    return NextResponse.json({ swap: { id: result.swap.id } }, { status: 201 });
  } catch (error) {
    console.error('[swaps] could not ask for a swap', error);
    const message = "That swap request wasn't sent. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
