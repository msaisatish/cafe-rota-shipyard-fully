import { NextResponse } from 'next/server';

import { validateBody } from '@/seams/validate';
import { requireMember } from '@/lib/members/access';
import { addStaffSchema } from '@/lib/members/schema';
import { addStaffMember } from '@/lib/members/service';
import { staffListFor } from '@/lib/staff/service';

/** `GET /api/staff` — the manager's staff list, people who left last. */
export async function GET() {
  const gate = await requireMember({ role: 'manager' });
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ staff: await staffListFor(gate.member.id) });
  } catch (error) {
    console.error('[staff] could not load the staff list', error);
    const message = "We couldn't load your staff list. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** `POST /api/staff` — the manager adds a person with a starting password. */
export async function POST(request: Request) {
  const gate = await requireMember({ role: 'manager' });
  if (!gate.ok) return gate.response;

  const input = await validateBody(request, addStaffSchema);
  if (!input.ok) {
    return NextResponse.json(
      { error: input.message, fieldErrors: input.fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await addStaffMember(input.data);
    if (!result.ok) {
      const fieldErrors = result.field ? { [result.field]: result.message } : {};
      return NextResponse.json({ error: result.message, fieldErrors }, { status: 400 });
    }
    const { id, name } = result.member;
    return NextResponse.json({ member: { id, name }, outcome: result.outcome }, { status: 201 });
  } catch (error) {
    console.error('[staff] could not add a staff member', error);
    const message = "That person wasn't added. Try again; nothing you typed is lost.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
