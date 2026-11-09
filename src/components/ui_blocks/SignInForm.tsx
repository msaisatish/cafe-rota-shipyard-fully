'use client';

import { useState, type FormEvent } from 'react';

import { buttonProps } from '@/components/ui_foundation/primitives';

import {
  SIGN_IN_FIELDS,
  errorId,
  fieldAttributes,
  refusalText,
  type FieldName,
  type SignInFailure,
  type SignInRefusal,
} from './blocks';
import { blockClasses, signInCopy } from './copy';

import './blocks.css';

/**
 * The sign-in screen.
 *
 * What it will not do matters more than what it does. A refusal from the server
 * never says which half was wrong and never attaches itself to a field — both
 * of those tell a stranger which email addresses are registered here. The rule
 * is in `signInNotice`, the wording in `copy.ts`, and the two credential
 * failures deliberately share one sentence.
 *
 * Local validation — an empty box — *is* per field, because the browser already
 * knows and nothing is revealed by saying so.
 *
 * The button stays enabled while it is working. A disabled button leaves the
 * tab order and announces nothing, so somebody using a screen reader gets
 * silence at the exact moment they need to know something is happening.
 *
 * There is no "I have forgotten my password" link unless `forgotHref` is
 * given. It used to default to `/password/forgot`, a page nothing installs, so
 * every app built on this form offered a password reset it did not have (pilot
 * 02, 2026-10-15). Pass the page only when the app can actually reset a
 * password: with `password_reset` and `auth_screens` installed, that is
 * `/forgot-password`.
 */
export function SignInForm({
  onSubmit,
  forgotHref,
}: {
  /**
   * Returns the failure, or `null` when the person is in. A lockout may come
   * with the server's own sentence, which knows how long the wait really is.
   */
  onSubmit: (values: Record<FieldName, string>) => Promise<SignInFailure | SignInRefusal | null>;
  /** The "I have forgotten my password" page. No link at all when absent. */
  forgotHref?: string;
}) {
  const [local, setLocal] = useState<Partial<Record<FieldName, string>>>({});
  const [refused, setRefused] = useState<SignInFailure | SignInRefusal | null>(null);
  const [busy, setBusy] = useState(false);

  const notice = refused === null ? null : refusalText(refused);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = {
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
    };

    const problems: Partial<Record<FieldName, string>> = {};
    if (!values.email.trim()) problems.email = signInCopy.local.email;
    if (!values.password) problems.password = signInCopy.local.password;
    setLocal(problems);
    if (Object.keys(problems).length > 0) return;

    setBusy(true);
    setRefused(null);
    try {
      setRefused(await onSubmit(values));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={blockClasses.form} onSubmit={submit} noValidate>
      <h1>{signInCopy.heading}</h1>

      {notice ? (
        // `alert` because it appeared in answer to something they just did, and
        // they are almost certainly still looking at the password box.
        <p className={blockClasses.formNotice} role="alert">
          {notice}
        </p>
      ) : null}

      {SIGN_IN_FIELDS.map((field) => {
        const problem = local[field.name];
        return (
          <div className={blockClasses.field} key={field.name}>
            <label htmlFor={field.id}>{signInCopy[field.name]}</label>
            <input {...fieldAttributes(field, problem)} />
            {problem ? (
              <p className={blockClasses.fieldError} id={errorId(field.name)}>
                {problem}
              </p>
            ) : null}
          </div>
        );
      })}

      {/*
        `ui_foundation`'s Button always renders `type="button"`, on purpose: the
        HTML default is `submit`, and a button inside a form that forgets it
        reloads the page and looks like the app losing your work. A sign-in form
        is the one case where submitting *is* the intention, so the override is
        written here in the open rather than hidden inside the primitive.
        Everything else — busy is not disabled, the aria — still comes from
        `buttonProps`, so those rules cannot drift.
      */}
      <button {...buttonProps({ tone: 'primary', busy })} type="submit">
        {busy ? signInCopy.submitting : signInCopy.submit}
      </button>

      {forgotHref ? <a href={forgotHref}>{signInCopy.forgot}</a> : null}
    </form>
  );
}
