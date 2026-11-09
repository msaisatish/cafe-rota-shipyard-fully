import { NextResponse } from 'next/server';

import { validateBody } from '@/seams/validate';
import { requireMember } from '@/lib/members/access';
import { addShiftSchema } from '@/lib/rota/schema';
import { addShift } from '@/lib/rota/service';

/** `POST /api/shifts` — the manager puts a member of staff on a shift. */
export async function POST(request: Request) {
  const gate = await requireMember({ role: 'manager' });
  if (!gate.ok) return gate.response;

  const input = await validateBody(request, addShiftSchema);
  if (!input.ok) {
    return NextResponse.json(
      { error: input.message, fieldErrors: input.fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await addShift(input.data);
    if (!result.ok) {
      const fieldErrors = result.field ? { [result.field]: result.message } : {};
      return NextResponse.json({ error: result.message, fieldErrors }, { status: 400 });
    }
    return NextResponse.json(
      { shift: { id: result.shift.id }, weekStart: result.weekStart },
      { status: 201 },
    );
  } catch (error) {
    console.error('[rota] could not add a shift', error);
    const message = "That shift wasn't saved. Try again; nothing you typed was lost.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
