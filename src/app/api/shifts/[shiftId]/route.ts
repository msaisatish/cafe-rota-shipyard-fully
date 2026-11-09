import { NextResponse } from 'next/server';

import { validate } from '@/seams/validate';
import { requireMember } from '@/lib/members/access';
import { removeShiftSchema } from '@/lib/rota/schema';
import { removeShift } from '@/lib/rota/service';

/** `DELETE /api/shifts/{shiftId}` — the manager takes a shift off the rota. */
export async function DELETE(_request: Request, context: { params: Promise<{ shiftId: string }> }) {
  const gate = await requireMember({ role: 'manager' });
  if (!gate.ok) return gate.response;

  const input = validate(removeShiftSchema, await context.params);
  if (!input.ok) return NextResponse.json({ error: input.message }, { status: 400 });

  try {
    const result = await removeShift(input.data.shiftId);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 404 });
    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error('[rota] could not remove a shift', error);
    const message = "That shift wasn't removed. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
