<!-- shipyard:design -->

# project: design blueprint

*Shipyard writes the part between the `shipyard:design` markers from the approved pages, the theme and the installed parts, and rewrites it when they change. Add your decisions below the closing marker: they are kept.*

## Purpose

Plan a small cafe's weekly shifts, show each person their own shifts, and handle swap requests.

Used by: The café manager, who plans the week, and the staff, who need to know their own shifts and sometimes swap one.

## Flows

1. The manager signs in, adds staff members (name and email, with a starting password the staff member changes when they first sign in), and removes someone who ha
2. The manager plans a week: adds shifts (day, start time, end time, who is working), and publishes the week when it is ready. Staff cannot see a week until it is 
3. A staff member signs in and sees only their own published shifts, soonest first.
4. A staff member asks to swap one of their shifts with a named colleague. The manager approves or turns down the request, and the rota changes only when it is app

## Screens

1. **Sign in** (form) — Manager and staff sign in; a staff member changes their starting password the first time.
   One task, top to bottom: labels above fields, one primary button, errors next to the field. Buttons and messages from `ui_foundation`.
2. **Plan the week** (table) — The manager adds shifts for a week and publishes it.
   A list people scan, sort and filter. Use the data table if it is installed. Built with `data_table`.
3. **Staff** (table) — The manager adds and removes staff members.
   A list people scan, sort and filter. Use the data table if it is installed. Built with `data_table`.
4. **My shifts** (cards) — A staff member's own published shifts, soonest first, with a button to ask for a swap.
   A small number of items people compare at a glance, one card each.
5. **Swap requests** (table) — The manager approves or turns down swap requests.
   A list people scan, sort and filter. Use the data table if it is installed. Built with `data_table`.

## Frame and density

- Frame: a top bar with the app's name and one link per screen above (`ui_blocks` AppShell). No sidebar for this few screens.
- Each screen starts with its title and at most one primary action; other actions are quiet buttons.
- Lists are compact: one line per record, the columns people scan first on the left, actions at the end of the row.
- Forms are one column, labels above fields, the primary button at the end; errors sit next to their field.

## Tokens

Theme: **Calm** — The default. Quiet, high contrast, no personality — it gets out of the way.

Use these values through their CSS variables. Never write a colour, a radius or a spacing step by hand.

| Role | CSS variable | Light value |
| --- | --- | --- |
| bg | `var(--bg)` | `#ffffff` |
| surface | `var(--surface)` | `#f7f8fa` |
| fg | `var(--fg)` | `#14181f` |
| muted | `var(--muted)` | `#5b6472` |
| line | `var(--line)` | `#e3e7ec` |
| accent | `var(--accent)` | `#1f5fd0` |
| accentFg | `var(--accent-fg)` | `#ffffff` |
| focus | `var(--focus)` | `#1f5fd0` |
| ok | `var(--ok)` | `#e6f4ea` |
| okFg | `var(--ok-fg)` | `#1b5e34` |
| warn | `var(--warn)` | `#fdf3e0` |
| warnFg | `var(--warn-fg)` | `#7a4f0c` |
| danger | `var(--danger)` | `#fdecec` |
| dangerFg | `var(--danger-fg)` | `#96201f` |
| radius | `var(--radius)` | from the theme |
| space | `var(--space)` | from the theme |
| fontFamily | `var(--font-family)` | from the theme |
| fontSize | `var(--font-size)` | from the theme |
| lineHeight | `var(--line-height)` | from the theme |

The theme decides light and dark (dark follows the computer's setting, with the same variables). The page is `var(--bg)`; panels, cards and quiet buttons are `var(--surface)`. Those are the pairs the theme's contrast is checked on.

## Components in use

- **How the app looks** (`ui_foundation`): import as `docs/components/ui_foundation.md` shows; do not copy or edit its files. Use it for every button (`ui-button`), status message and focus ring. Adapt it through `src/theme.ts`.
- **The screens every app starts with** (`ui_blocks`): import as `docs/components/ui_blocks.md` shows; do not copy or edit its files. Use it for the frame (AppShell), every confirm or create dialog (Dialog), and number tiles (StatGrid) only on an approved dashboard screen. Adapt it through `src/components/ui_blocks/copy.ts`.
- **The screens people sign in on** (`auth_screens`): import as `docs/components/auth_screens.md` shows; do not copy or edit its files. It ships `/sign-in`, `/register`, `/forgot-password`, `/reset-password`: link to it only if a screen above needs it. Adapt it through `src/components/auth_screens/copy.ts`, `src/components/auth_screens/auth-screens.css`.
- **A list people can sort and search** (`data_table`): import as `docs/components/data_table.md` shows; do not copy or edit its files. Use it for every list of records: sorting, paging and its own empty state; never a hand-written `<table>`. Adapt it through `src/components/data_table/presentation.tsx`, `src/components/data_table/table.css`.

## States every screen has

- **Empty**: what this is for and what to do first; never a blank panel.
- **Loading**: say what is loading; never a frozen screen.
- **Some data**: the ordinary view.
- **Too much data**: a sixty-character name and a hundred rows still read; lists page or scroll.
- **Broken**: a plain sentence and a way to try again; never a stack trace or a dead end.

## Not in this version

- pay and hours totals
- text or email reminders
- clocking in
- more than one café.

No screen, field or action beyond the flows and screens above without asking the founder first.

## Accessibility

- Text contrast at least 4.5:1 and controls at least 3:1, in both light and dark.
- Everything works with the keyboard, and the focus is always visible (`var(--focus)`).
- Every field has a label; every icon-only button has a name.
- Meaning is never carried by colour alone; respect reduced motion.

## Rules for building screens

- Build each screen in the order above, sample data first, then the real data behind it.
- One look across the app: the variables above, the installed parts, nothing else.
- Avoid the generic AI look: gradients, glows, rows of identical cards, big number tiles nobody asked for.
- Before calling a screen done, check it against this file and say which section it meets.

<!-- /shipyard:design -->

## Decisions made while building

The UI designer adds what the generated part cannot know: the details of each screen, wording, and anything decided with the founder.

### The scene

A barista checking their phone on the bus or behind the counter between
orders, one thumb, glare from the café window, ten seconds to find "when am I
on next?". The manager plans on a laptop at a back table after closing, tired,
wanting the week done in five minutes and then to go home.

So: staff screens are phone-first, one column, the next shift biggest and
first. Manager screens are laptop-first but must still work on a phone (a
swap request gets approved from the bar). Quiet everywhere; the only loud
thing on a screen is the one action that matters there.

### What this must not look like

- **Not an enterprise rostering suite** (Deputy, a payroll system): no
  sidebar, no dashboard of numbers, no colour-coded calendar grid of every
  person. Eight people and one week; plain lists read faster.
- **Not a group-chat or social app**: no avatars, no chat bubbles, no
  emoji, no "feed". A shift is a fact (day, time, person), shown as one.

### Colour

Restrained. Keep the **Calm** theme as it is; no change to `src/theme.ts`.

- `var(--bg)` page, `var(--surface)` for cards, dialogs and quiet buttons,
  `var(--line)` for every divider and table rule, `var(--fg)` text,
  `var(--muted)` for secondary text only (times' end, "Added 3 Nov").
- `var(--accent)` only on: the one primary button per screen, the current
  nav link (which also gets `aria-current` and an underline), and the
  "Next shift" card's border. Under 10% of any screen.
- Meaning, always with a word via `Status` (never a coloured row or dot alone):
  - `ok` — **Published**, **Approved**
  - `warn` — **Draft – staff can't see this yet**, **Waiting for you** /
    **Waiting for the manager**
  - `neutral` — **Turned down**, **Removed** (turned down is a normal answer,
    not an error, so it is not red)
  - `danger` — only for failures and the "Remove" confirmation button.

### Type

One family, the theme's `var(--font-family)`. Steps of at least 1.25:
screen title about 1.5× body, the next-shift day/time about 1.25×, body at
`var(--font-size)`. Times are tabular figures (`font-variant-numeric:
tabular-nums`) so columns of times line up. Day names written out ("Tuesday
12 Nov"), times in 24-hour form as the café's region expects, shown in the
café's time zone. No uppercase labels; sentence case everywhere.

### Motion

Almost none. Dialogs and toasts fade/slide in at 150–200 ms ease-out (the
`ui_blocks` defaults); nothing loops except the loading indicator, which
under `prefers-reduced-motion: reduce` becomes static text "Loading…".
No animation on publish or approve: the status word changing is the signal.

### Frame

`ui_blocks` **AppShell**, app name **Café rota**, a "Sign out" quiet button
at the end of the top bar. On a phone the links wrap to a second row below
the name; never a hamburger for two or three links.

- Manager links: **Plan the week**, **Staff**, **Swap requests** (with the
  count of waiting requests in the link text: "Swap requests (2)").
- Staff link: **My shifts**.
- After sign-in the manager lands on Plan the week, staff on My shifts.

Every create/confirm step uses `ui_blocks` **Dialog** (no closing on an
outside click while it holds typed input). Every success also shows a
`ui_blocks` **Toast**, but the page itself must change too (the row appears,
the status word changes): a toast is never the only place it is said.
Lists use `data_table` **DataTable** with a real caption; row actions are
`ui_foundation` **Button**s passed as cell values, column not sortable.

### 1. Sign in (and the two screens after it)

Uses the component-owned `/sign-in`, `/forgot-password`, `/reset-password`
and `/register` as they are; only their words change, in
`src/components/auth_screens/copy.ts`. Sign-in heading: **Sign in to Café
rota**. Sign-in refusal stays the component's single message (it never says
which half was wrong).

**Choose your own password** (shown after the first sign-in with a starting
password; nothing else is reachable until it is done). One card, centred,
max width about 28rem, full width on a phone.
- Heading **Choose your own password**. Text: "Your manager gave you a
  starting password. Pick one only you know; you'll use it from now on."
- Fields: **New password**, **Type it again**. Button **Save my password**.
- Errors under the field: "Use at least 12 characters." / "The two passwords
  don't match." Broken: "We couldn't save your password. Try again; your
  starting password still works until this succeeds."
- Busy: button reads **Saving…** with `aria-busy`.

**Not on the staff list yet** (someone registered themselves but the manager
has not added them). Same centred card, no nav links except Sign out.
- Heading **Ask your manager to add you**. Text: "You've made an account,
  but you're not on this café's staff list yet. Once your manager adds
  {email}, sign in again and your shifts will be here."
- Button **Sign out**. Long emails wrap (`overflow-wrap: anywhere`).

### 2. Plan the week (manager)

Purpose: build one week's shifts and publish it.
- Header row: title **Plan the week**; under it a week switcher: quiet
  buttons **Previous week** / **Next week** (icon arrows with those names)
  around the label "Week of Monday 11 Nov". Next to the label a `Status`:
  `warn` **Draft – staff can't see this yet** or `ok` **Published**.
- Primary action (one): **Add a shift**. Secondary, beside it: **Publish
  this week** (primary style only once the week has at least one shift and
  is a draft; hidden once published).
- Table caption "Shifts for the week of 11 Nov". Columns: **Day**,
  **Start**, **End**, **Who**, then the action **Remove** (quiet button,
  accessible name "Remove Sam's Tuesday shift"). Sorted by day then start.
- Phone: the table scrolls sideways inside its own box; the header and the
  buttons do not. Desktop: content max width about 60rem.
- **Add a shift** dialog: **Day** (select of the seven days of this week),
  **Start time**, **End time**, **Who is working** (select of current staff,
  names in full). Buttons **Add shift** / **Cancel**. Errors: "The end time
  must be after the start time." / "Choose who is working."
- **Publish** dialog: "Publish the week of 11 Nov? Everyone on it will see
  their shifts straight away." Buttons **Publish week** / **Not yet**.
- **Remove shift** dialog: "Remove Sam's shift on Tuesday 08:00–14:00?"
  Buttons **Remove shift** (danger) / **Keep it**.
- Empty: "No shifts this week yet. Add the first one; staff won't see
  anything until you publish." with **Add a shift**.
- No staff at all: "Add your staff first, then plan their shifts." with a
  link **Go to Staff**.
- Loading: "Loading the week…". Broken: "We couldn't load this week. Check
  your connection and try again." with **Try again**. Save failed (in the
  dialog, form kept): "That shift wasn't saved. Try again; nothing you typed
  was lost."

### 3. Staff (manager)

Purpose: who works here, add and remove people.
- Title **Staff**, primary **Add a staff member**.
- Caption "Everyone who works at the café". Columns **Name**, **Email**,
  **Status** (`Status` neutral **Removed** for removed people, ok **Active**
  otherwise; removed people sorted last), action **Remove** (accessible
  name "Remove {name}"). The manager's own row says **You** in place of the
  action.
- Long names and emails truncate with an ellipsis in the cell and the full
  text in a `title`; nothing pushes the action column off screen.
- **Add a staff member** dialog: **Name**, **Email**, **Starting
  password**, with the hint "Tell them this password yourself. They'll
  choose their own the first time they sign in." Buttons **Add staff
  member** / **Cancel**. Errors: "That email is already on your staff
  list." / "Use at least 12 characters."
- **Remove** dialog: "Remove {name}? They won't be able to sign in. Their
  past shifts stay on the rota." Buttons **Remove {name}** (danger) /
  **Keep them**.
- Empty (only the manager): "It's just you so far. Add the people who work
  here, then plan their shifts." with **Add a staff member**.
- Loading "Loading your staff…"; broken as on Plan the week.

### 4. My shifts (staff)

Purpose: "when am I on next?" in one glance, phone first.
- Title **My shifts**. Only published shifts, soonest first, past ones not
  listed.
- First card, larger, `var(--accent)` border, label **Your next shift**:
  "Tuesday 12 Nov", "08:00 – 14:00" big. Then one compact card per shift,
  grouped under week headings ("Week of 11 Nov"). Cards are full width,
  stacked; on desktop the column stays at most about 36rem, not a grid.
- Each card: day, times, and a quiet button **Ask to swap** (accessible
  name "Ask to swap your Tuesday 12 Nov shift"). If that shift already has
  a waiting request, the button is replaced by `Status` warn **Swap asked –
  waiting for the manager**.
- **Ask to swap** dialog: "Who would take your Tuesday 12 Nov, 08:00–14:00
  shift?" **Colleague** select (active staff except themselves). Text:
  "Your manager decides. Until then, this shift is still yours." Buttons
  **Send swap request** / **Cancel**.
- Below the shifts, section **My swap requests**: a plain list, newest
  first: "Tuesday 12 Nov 08:00–14:00 → Alex" with `Status`: warn **Waiting
  for the manager**, ok **Approved – Alex has this shift now**, neutral
  **Turned down – this shift is still yours**. Empty: the section is hidden.
- Empty (no published shifts): "No shifts for you yet. When your manager
  publishes a week, your shifts appear here."
- Loading "Loading your shifts…". Broken: "We couldn't load your shifts.
  Try again, or ask your manager if you're about to start."
  with **Try again**.

### 5. Swap requests (manager)

Purpose: decide swaps so the rota is always true.
- Title **Swap requests**. Waiting requests first, then decided ones.
- Caption "Swap requests from your staff". Columns **Shift** ("Tue 12 Nov
  08:00–14:00"), **From**, **To**, **Status** (`Status`: warn **Waiting
  for you**, ok **Approved**, neutral **Turned down**), actions **Approve**
  (primary) and **Turn down** (quiet), named "Approve Sam's swap to Alex".
  Decided rows show no buttons.
- Approve dialog: "Approve? Alex will work Tuesday 12 Nov 08:00–14:00
  instead of Sam." Buttons **Approve swap** / **Cancel**. Turn down dialog:
  "Turn down Sam's request? Sam keeps the shift." Buttons **Turn down** /
  **Cancel**. After either, the row's status changes in place.
- Empty: "No swap requests. When someone asks to swap a shift, it shows
  up here for you to approve or turn down."
- Loading "Loading swap requests…". Broken as above; a failed decision:
  "That didn't go through, so nothing changed on the rota. Try again."

### Open questions for the founder (build the default until answered)

- Can a published week still be changed? Default: yes, Add and Remove stay
  available, and the Publish dialog's line becomes "Staff see changes
  straight away" under the week status.
- Can staff cancel a swap request they sent? Default: no (not in the idea).
