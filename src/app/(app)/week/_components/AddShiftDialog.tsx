'use client';

import { useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui_blocks/Dialog';
import { Button } from '@/components/ui_foundation/Button';
import { buttonProps } from '@/components/ui_foundation/primitives';
import { validate } from '@/seams/validate';
import type { WeekPlan } from '@/lib/rota/plan';
import { addShiftSchema } from '@/lib/rota/schema';
import { ShiftField } from './ShiftField';

type FieldErrors = Record<string, string>;

const FORM_ID = 'add-shift-form';
const BROKEN = "That shift wasn't saved. Try again; nothing you typed was lost.";

/** Sends the form; returns null when the shift was added, otherwise what to show. */
async function saveShift(form: HTMLFormElement): Promise<FieldErrors | null> {
  const values = new FormData(form);
  const checked = validate(addShiftSchema, {
    day: values.get('day'),
    startTime: values.get('startTime'),
    endTime: values.get('endTime'),
    memberId: values.get('memberId'),
  });
  if (!checked.ok) return checked.fieldErrors;

  const response = await fetch('/api/shifts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(checked.data),
  }).catch(() => null);
  if (response?.ok) return null;
  if (response?.status !== 400) return { _: BROKEN };
  const reply = (await response.json().catch(() => null)) as {
    error?: string;
    fieldErrors?: FieldErrors;
  } | null;
  if (reply?.fieldErrors && Object.keys(reply.fieldErrors).length > 0) return reply.fieldErrors;
  return { _: reply?.error ?? BROKEN };
}

/** The "Add a shift" dialog. Stays open, with what was typed, until it works. */
export function AddShiftDialog({
  plan,
  onClose,
  onAdded,
}: {
  plan: WeekPlan;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const problems = await saveShift(event.currentTarget);
    setIsSaving(false);
    if (problems) return setErrors(problems);
    onAdded();
  }

  const actions = (
    <>
      <button {...buttonProps({ tone: 'primary', busy: isSaving })} type="submit" form={FORM_ID}>
        {isSaving ? 'Adding…' : 'Add shift'}
      </button>
      <Button tone="quiet" onClick={onClose}>
        Cancel
      </Button>
    </>
  );

  const days = plan.days.map((day) => ({ value: day.date, label: day.label }));
  const staff = plan.staff.map((person) => ({ value: person.id, label: person.name }));

  return (
    <Dialog kind="form" title="Add a shift" onClose={onClose} actions={actions}>
      <form id={FORM_ID} className="week-form" onSubmit={submit} noValidate>
        {errors._ ? (
          <p className="week-error" role="alert">
            {errors._}
          </p>
        ) : null}
        <ShiftField name="day" label="Day" options={days} problem={errors.day} />
        <ShiftField name="startTime" label="Start time" problem={errors.startTime} />
        <ShiftField name="endTime" label="End time" problem={errors.endTime} />
        <ShiftField
          name="memberId"
          label="Who is working"
          options={staff}
          prompt="Choose a person"
          problem={errors.memberId}
        />
      </form>
    </Dialog>
  );
}
