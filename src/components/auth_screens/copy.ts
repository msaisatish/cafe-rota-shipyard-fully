/**
 * The words on the sign-in, register and password screens. This file is yours.
 *
 * Change all of it. Shipyard will never overwrite this file, including when
 * auth_screens is upgraded.
 *
 * What is **not** here, on purpose: what a refusal is allowed to say. That
 * lives in `messages.ts` and is protected, because the difference between "that
 * email and password do not match" and "no account with that email" is the
 * difference between a login screen and a tool for finding out who your
 * customers are. It is a security rule wearing the clothes of a wording choice,
 * which is exactly why it must not sit in the file people edit freely.
 */

export const authCopy = {
  signIn: {
    noAccount: 'New to Café rota?',
    registerLink: 'Create an account',
    goingThere: 'Signed in. Opening your rota…',
  },

  register: {
    heading: 'Create your Café rota account',
    email: 'Email address',
    password: 'Choose a password',
    submit: 'Create account',
    submitting: 'Creating your account',
    haveAccount: 'Already have an account?',
    signInLink: 'Sign in',
    /** Said before they type, not after they fail. */
    passwordHint: 'At least 12 characters, mixing three of: small letters, capitals, numbers, symbols.',
  },

  forgot: {
    heading: 'Reset your password',
    lede: 'Type the email address you sign in with and we will send you a link.',
    email: 'Email address',
    submit: 'Send the link',
    submitting: 'Sending',
    backToSignIn: 'Back to sign in',
  },

  /** The page the emailed link lands on. */
  reset: {
    heading: 'Choose a new password',
    lede: 'This link works once. Pick something you will remember.',
    password: 'New password',
    /** Asked twice on purpose: the link is spent by the first attempt, so a typo costs it. */
    confirm: 'Type it again',
    submit: 'Save the new password',
    submitting: 'Saving',
    backToSignIn: 'Back to sign in',
    passwordHint: 'At least 12 characters, mixing three of: small letters, capitals, numbers, symbols.',
    noToken:
      'This link is not complete. Mail programs sometimes cut long links in half, so it is worth asking for a new one.',
    requestAnother: 'Send me a new link',
    done: 'Your password is changed, and everything that was signed in has been signed out. Sign in with the new one.',
    signInLink: 'Sign in',
    mismatch: 'Those two do not match.',
  },

  /** Shown when a field is empty or obviously malformed, before anything is sent. */
  local: {
    email: 'Enter an email address.',
    password: 'Enter a password.',
    short: 'Use at least 12 characters.',
  },
};
