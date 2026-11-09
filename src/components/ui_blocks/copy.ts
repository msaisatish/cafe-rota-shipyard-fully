/**
 * The words and the class names. This file is yours.
 *
 * Change any of it. Shipyard will never overwrite this file, including when the
 * ui_blocks component is upgraded.
 *
 * What is **not** here, on purpose: which navigation item is current, what a
 * failed sign-in is allowed to reveal, whether a percentage can be calculated,
 * whether a dialog closes on a click outside it, and how long a message stays.
 * Those live in `blocks.ts`, they are the parts that are subtly wrong when
 * written from scratch, and they are protected. If you need one of them to
 * behave differently, say so rather than editing it — that file is replaced on
 * upgrade and your change would disappear with it.
 */
import type { SignInReason } from './blocks';

export const shellCopy = {
  /** The first thing a keyboard user reaches on every page. */
  skipToContent: 'Skip to the content',
  /** Read by a screen reader instead of the word "navigation". */
  navigationLabel: 'Sections',
  menuOpen: 'Menu',
  menuClose: 'Close the menu',
};

export const signInCopy = {
  heading: 'Sign in to Café rota',
  email: 'Email address',
  password: 'Password',
  submit: 'Sign in',
  submitting: 'Signing you in',
  forgot: 'I have forgotten my password',
  /** Shown when a box is empty or obviously malformed, before anything is sent. */
  local: {
    email: 'Enter the email address you sign in with.',
    password: 'Enter your password.',
  },
  /**
   * What a refusal from the server says.
   *
   * `credentials` covers both "no such account" and "wrong password" and has to
   * keep covering both. Splitting it into two friendlier messages is how a
   * product tells a stranger which email addresses are registered with it.
   */
  refused: {
    credentials: 'That email address and password do not go together.',
    locked: 'This account is locked. Check your email for how to unlock it.',
    // Only when the server gave no wait of its own (refusalText): no promise of a minute.
    'rate-limited': 'Too many attempts. Please wait before you try again.',
    server: 'Something went wrong at our end. Nothing about your account has changed.',
  } satisfies Record<SignInReason, string>,
};

export const statCopy = {
  /** Prefixed to the period so the caption reads as a sentence. */
  over: (period: string): string => `over ${period}`,
  change: (word: string, percent: number, period: string): string =>
    `${percent}% ${word} on ${period}`,
  notMeasured: 'Not measured yet',
};

export const dialogCopy = {
  close: 'Close',
  cancel: 'Cancel',
};

export const toastCopy = {
  /** The label on the dismiss button. Every message has one. */
  dismiss: 'Dismiss this message',
  regionLabel: 'Messages',
};

export const blockClasses = {
  shell: 'blk-shell',
  shellNav: 'blk-shell-nav',
  shellMain: 'blk-shell-main',
  skip: 'blk-skip',
  navLink: 'blk-nav-link',
  navLinkCurrent: 'is-current',
  form: 'blk-form',
  field: 'blk-field',
  fieldError: 'blk-field-error',
  formNotice: 'blk-form-notice',
  statGrid: 'blk-stat-grid',
  stat: 'blk-stat',
  statValue: 'blk-stat-value',
  statCaption: 'blk-stat-caption',
  statChange: 'blk-stat-change',
  backdrop: 'blk-backdrop',
  dialog: 'blk-dialog',
  dialogActions: 'blk-dialog-actions',
  toastRegion: 'blk-toasts',
  toast: 'blk-toast',
};
