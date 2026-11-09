'use client';

import { useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui_blocks/Dialog';
import { Button } from '@/components/ui_foundation/Button';
import { buttonProps } from '@/components/ui_foundation/primitives';
import { validate } from '@/seams/validate';
import { addStaffSchema } from '@/lib/members/schema';
import type { AddStaffOutcome } from '@/lib/members/service';
import { StaffField } from './StaffField';

type FieldErrors = Record<string, string>;
export interface AddedStaff {
  name: string;
  outcome: AddStaffOutcome;
}
type SaveResult = { kind: 'added'; added: AddedStaff } | { kind: 'refused'; errors: FieldErrors };

const FORM_ID = 'add-staff-form';
const BROKEN = "That person wasn't added. Try again; nothing you typed is lost.";
const PASSWORD_HINT = [
  "Tell them this password yourself. They'll choose their own the first time they sign in.",
  'Use at least 12 characters, mixing three of: small letters, capitals, numbers, symbols.',
].join(' ');

async function saveStaff(form: HTMLFormElement): Promise<SaveResult | 'broken'> {
  const values = new FormData(form);
  const checked = validate(addStaffSchema, {
    name: values.get('name'),
    email: values.get('email'),
    startingPassword: values.get('startingPassword'),
  });
  if (!checked.ok) return { kind: 'refused', errors: checked.fieldErrors };

  const response = await fetch('/api/staff', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(checked.data),
  }).catch(() => null);
  if (!response || (!response.ok && response.status !== 400)) return 'broken';
  const reply = (await response.json().catch(() => null)) as {
    member?: { name: string };
    outcome?: AddStaffOutcome;
    error?: string;
    fieldErrors?: FieldErrors;
  } | null;
  if (response.ok && reply?.member && reply.outcome) {
    return { kind: 'added', added: { name: reply.member.name, outcome: reply.outcome } };
  }
  if (!reply?.error) return 'broken';
  const errors =
    reply.fieldErrors && Object.keys(reply.fieldErrors).length > 0
      ? reply.fieldErrors
      : { _: reply.error };
  return { kind: 'refused', errors };
}

/** The "Add a staff member" dialog. Stays open, with what was typed, until it works. */
export function AddStaffDialog({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (added: AddedStaff) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const result = await saveStaff(event.currentTarget);
    setIsSaving(false);
    if (result === 'broken') return setErrors({ _: BROKEN });
    if (result.kind === 'refused') return setErrors(result.errors);
    onAdded(result.added);
  }

  const actions = (
    <>
      <button {...buttonProps({ tone: 'primary', busy: isSaving })} type="submit" form={FORM_ID}>
        {isSaving ? 'Adding…' : 'Add staff member'}
      </button>
      <Button tone="quiet" onClick={onClose}>
        Cancel
      </Button>
    </>
  );

  return (
    <Dialog kind="form" title="Add a staff member" onClose={onClose} actions={actions}>
      <form id={FORM_ID} className="staff-form" onSubmit={submit} noValidate>
        {errors._ ? (
          <p className="staff-error" role="alert">
            {errors._}
          </p>
        ) : null}
        <StaffField name="name" label="Name" type="text" problem={errors.name} />
        <StaffField name="email" label="Email" type="email" problem={errors.email} />
        <StaffField
          name="startingPassword"
          label="Starting password"
          type="password"
          hint={PASSWORD_HINT}
          problem={errors.startingPassword}
        />
      </form>
    </Dialog>
  );
}
