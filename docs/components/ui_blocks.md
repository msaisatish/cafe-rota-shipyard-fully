# The screens every app starts with

Five blocks: a frame with navigation, a sign-in form, the numbers along the top
of a dashboard, a dialog, and the messages that appear in the corner.

They are a **sample**. The full set is about thirty and does not exist yet —
there is no settings screen, no billing screen, no upload, no kanban, no wizard.
What is here is five, finished, and the library page says so rather than
implying the rest are coming.

## Why these five

Each one is a screen every application has, and each one is wrong in the same
way every time it is written from scratch. The mistakes have something in
common: **the person who wrote the screen cannot see any of them.** They show up
only for somebody using a keyboard, somebody using a screen reader, somebody who
cannot tell two colours apart, or somebody typing email addresses into your form
to find out who your customers are.

| Block | What usually goes wrong |
| --- | --- |
| `AppShell` | `/admin` highlighted while you are on `/administrators`; every ancestor highlighted at once; no skip link, so a keyboard user tabs through the whole menu on every page; "you are here" carried by a colour. |
| `SignInForm` | "No account with that email" — which tells a stranger which addresses are registered. Errors not attached to their field. A submit button that disables itself and goes silent. Autocomplete tokens that stop a password manager offering to fill it. |
| `StatGrid` | A number with no period. "Never measured" shown as zero. A percentage against zero. A fall painted red when the falling thing is churn. |
| `Dialog` | Focus never enters, or never comes back. Tab leaves out of the back. Escape does nothing. A click outside throws away a filled-in form. |
| `Toasts` | An error that fades before it is read. Three seconds for a two-line sentence. Forty copies of the same retry failure. Movement for somebody who has asked for none. |

## Where the decisions live

All of them are in `blocks.ts`, as pure functions, checked without a browser.
The `.tsx` files are thin wrappers that call them, so a wrapper cannot quietly
disagree with a rule — the rule is the only place its props come from.

`blocks.ts` is protected. `copy.ts` is yours: the words, the class names, and
nothing that can be got dangerously wrong.

## The two rules worth arguing about

**A sign-in refusal never says which half was wrong.** Not when the email is
unknown, not when the password is wrong, and never attached to one of the two
boxes — because putting it under the password says the email was fine, which
leaks the same fact more quietly. This makes the form slightly less helpful to
the person who mistyped their address. It is the trade every product that has
thought about it makes, and if you change it, change it knowingly.

**A dialog holding typed input does not close when the page behind it is
clicked.** Most component libraries close on outside click by default. It is
also the commonest way people lose work in a web application, and they do not
report it as "the dialog closed" — they report it as the app losing what they
typed.

**No "I have forgotten my password" link unless you say where it goes.**
`SignInForm` shows the link only when you pass `forgotHref`. Until 0.2.0 it
pointed at `/password/forgot` by default, a page nothing installs, so every app
built on it offered a reset it did not have. Pass `forgotHref="/forgot-password"`
once `password_reset` and `auth_screens` are installed (`auth_screens` does this
for you), and leave it off until then.

## What this will not do for you

- **It is five blocks, not thirty.** Everything else on a screen is still
  written from scratch.
- **A toast must never be the only place something is said.** It is gone once it
  has gone, invisible to somebody looking elsewhere on the screen, and absent
  for anybody who arrives a moment later. Anything that matters belongs on the
  page as well. The component cannot enforce this and does not pretend to.
- **The focus trap is the standard one and is not a security boundary.** It
  keeps Tab inside the dialog. It does not stop anything reaching the page
  behind by other means.
- **Nothing here is a substitute for an accessibility audit.** These are the
  known mistakes, prevented. That is not the same as the screen being usable by
  everybody, and only somebody using it can tell you that.

## Where the code came from

Written for Shipyard. Not adapted from anything, and the reason is worth
recording, because the obvious move was to adapt
[shadcn/ui](https://github.com/shadcn-ui/ui) (MIT) and it does not work:

- its blocks are Tailwind class strings, and this project has no Tailwind;
- they are built on its own `ui/*` primitive layer, which is Radix underneath —
  a second set of buttons and dialogs beside `ui_foundation`, with a second set
  of design tokens;
- adopting it would mean pulling in Tailwind, `tailwind-merge`, `clsx` and
  Radix, plus a PostCSS step, to get five screens.

What was worth taking from it was the **inventory** — which blocks an
application actually needs — and even that is thinner than it looks: of the 32
blocks in its registry, 16 are variations on a sidebar.

The two libraries with the right shape for this project were both ruled out on
their own terms. [modui](https://github.com/mod-ui/modui) (MIT) is CSS Modules
and custom properties, which is exactly right, and its README says it is not
ready to be used. [Astryx](https://github.com/facebook/astryx) (MIT, Meta) ships
150+ components and pre-built CSS, but as a package dependency with its own
theme system — which would compete with `ui_foundation`'s tokens rather than
build on them.

So: authored, against this project's own tokens, with no new dependencies at
all.
