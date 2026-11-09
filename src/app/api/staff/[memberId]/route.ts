import { NextResponse } from 'next/server';

import { validate } from '@/seams/validate';
import { requireMember } from '@/lib/members/access';
import { removeMemberSchema } from '@/lib/members/schema';
import { removeMember } from '@/lib/members/service';

/** `DELETE /api/staff/{memberId}` — the manager takes someone off the staff list. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ memberId: string }> },
) {
  const gate = await requireMember({ role: 'manager' });
  if (!gate.ok) return gate.response;

  const input = validate(removeMemberSchema, await context.params);
  if (!input.ok) return NextResponse.json({ error: input.message }, { status: 400 });

  try {
    const result = await removeMember({ memberId: input.data.memberId, removedBy: gate.member });
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
    return NextResponse.json({ member: { id: result.member.id, name: result.member.name } });
  } catch (error) {
    console.error('[staff] could not remove a staff member', error);
    const message = "That person wasn't removed. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
