import { NextResponse } from 'next/server';

import { validate, validateBody } from '@/seams/validate';
import { requireMember } from '@/lib/members/access';
import { swapDecisionSchema, swapIdSchema } from '@/lib/swaps/schema';
import { decideSwap } from '@/lib/swaps/service';
import { statusFor } from '../status';

/** `POST /api/swaps/{swapId}` — the manager approves or turns down a request. */
export async function POST(request: Request, context: { params: Promise<{ swapId: string }> }) {
  const gate = await requireMember({ role: 'manager' });
  if (!gate.ok) return gate.response;

  const target = validate(swapIdSchema, await context.params);
  if (!target.ok) return NextResponse.json({ error: target.message }, { status: 400 });
  const input = await validateBody(request, swapDecisionSchema);
  if (!input.ok) return NextResponse.json({ error: input.message }, { status: 400 });

  try {
    const result = await decideSwap({ swapId: target.data.swapId, ...input.data });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: statusFor(result.reason) });
    }
    return NextResponse.json({ status: result.status });
  } catch (error) {
    console.error('[swaps] could not decide a swap request', error);
    const message = "That didn't go through, so nothing changed on the rota. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
