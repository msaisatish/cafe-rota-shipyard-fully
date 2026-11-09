'use client';

import { useState, type FormEvent } from 'react';

import { buttonProps } from '@/components/ui_foundation/primitives';
import { validate } from '@/seams/validate';
import { choosePasswordSchema } from '@/lib/members/schema';
import { PasswordField } from './PasswordField';

type FieldErrors = Record<string, string>;

const BROKEN = [
  "We couldn't save your password.",
  'Try again; your starting password still works until this succeeds.',
].join(' ');

async function savePassword(form: HTMLFormElement): Promise<FieldErrors | 'saved' | 'broken'> {
  const values = new FormData(form);
  const input = {
    password: values.get('password'),
    confirmPassword: values.get('confirmPassword'),
  };
  const checked = validate(choosePasswordSchema, input);
  if (!checked.ok) return checked.fieldErrors;

  const response = await fetch('/api/my-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(checked.data),
  }).catch(() => null);
  if (response?.ok) return 'saved';
  if (response?.status !== 400) return 'broken';
  const reply = (await response.json().catch(() => null)) as { fieldErrors?: FieldErrors } | null;
  return reply?.fieldErrors ?? 'broken';
}

export function ChoosePasswordForm() {
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isBroken, setIsBroken] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setIsBroken(false);
    const outcome = await savePassword(event.currentTarget);
    if (outcome === 'saved') {
      window.location.assign('/');
      return;
    }
    setIsSaving(false);
    setIsBroken(outcome === 'broken');
    setErrors(outcome === 'broken' ? {} : outcome);
  }

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <h1>Choose your own password</h1>
      <p className="auth-lede">
        Your manager gave you a starting password. Pick one only you know; you&apos;ll use it from
        now on.
      </p>
      {isBroken ? (
        <p className="auth-notice" role="alert">
          {BROKEN}
        </p>
      ) : null}
      <PasswordField name="password" label="New password" problem={errors.password} />
      <PasswordField
        name="confirmPassword"
        label="Type it again"
        problem={errors.confirmPassword}
      />
      <button {...buttonProps({ tone: 'primary', busy: isSaving })} type="submit">
        {isSaving ? 'Saving…' : 'Save my password'}
      </button>
    </form>
  );
}
