# How this project is built

<!-- shipyard:path -->
## How far this project is going: a small working version
The one or two things your product actually does, working for real, with a real database behind them.
**Target mode:** `functional_prototype`. Everything Shipyard requires of this project follows from it.
**What this path builds:**
- Data: The PostgreSQL that Anycreo runs for you, with your real tables.
- Signing in: The real sign-in component.
- Other services: Test mode only, and only if a flow needs one.
- Testing: Browser screenshots, plus end-to-end checks on the core flows.
- Security check: Run, and reported to you. It does not block anything at this stage.
- Where it is shown: A private preview link, hidden from search engines.
**Deliberately not in this path:**
- The rest of the app. Only the core flows are built
- Backups. If the database goes, it is gone
- Anything an outsider deliberately attacking it would meet
- Real payments or real email — test mode only, if at all
Moving up to "The real app" later is a planned step, not a rewrite. Build behind the seams so that it stays one.
<!-- /shipyard:path -->

This is the shape of the project. It is not a style guide and it is not
advisory — it is the set of rules that lets a tested component be dropped into
this codebase and work, without anybody reading its source first.

Read it before writing code. If you are about to do something this document
does not cover, the convention it implies is usually the right one; if it
genuinely does not reach, prefer the choice that keeps a component's files and
your files apart.

## The one idea

**Components own their files. You own yours. They meet at named seams.**

Everything below follows from that. A component is code that was installed and
tested somewhere else, so the moment your code and its code become hard to tell
apart, nobody can upgrade it, re-verify it, or say whether it still does what
its tests proved. The seams are what keep that possible.

## The layout

| Path | Who owns it | May you edit it |
| --- | --- | --- |
| `src/seams/` | The template | **No.** Import from here; see below. |
| `src/components/<id>/` | An installed component | **No.** Protected. |
| `src/app/api/<component routes>/` | An installed component | **No.** Protected. |
| `tests/contracts/` | Installed components | **No.** These are the proof. |
| `src/app/` | You | Yes — this is where the product lives |
| `src/lib/` | You | Yes — shared helpers, plus `prisma.ts` |
| `prisma/schema.prisma` | Shared, by markers | Below the closing marker only |
| `docs/components/` | Installed components | No — generated from their manifests |
| `.env` | The founder | Never commit it |

`src/components/` is not a folder for your React components. It is where
installed components put their implementation. Your own UI goes under
`src/app/`, next to the route that uses it, or in `src/lib/` if genuinely
shared.

## The seams

`src/seams/` holds the signatures the rest of the app is written against. They
exist from the first day, **before** the components that implement them are
installed. Where a seam exists, import from `@/seams/…`, never from the
component behind it. A component with no seam (screens, tables, UI blocks)
is imported from the paths its README shows in `docs/components/<id>.md`.

That is what makes a component an install rather than a rewrite: installing
sign-in replaces the implementation behind `getCurrentUser()`, and every caller
stays exactly as it was.

Two kinds live there, and the difference matters:

**Stubs** — they throw until their component is installed, and the error names
the component to install:

| Seam | Needs |
| --- | --- |
| `getCurrentUser()`, `requireUser()` | Signing in (`auth`) |
| `requireRole()` | Who is allowed to do what (`rbac`) |
| `scoped(organizationId)` | Keeping customers separate (`organization_tenancy`) |
| `sendEmail()` | Emailing your users (`transactional_email`) |
| `enqueue()` | Work in the background (`background_job_runner`) |
| `logAudit()` | A record of who did what (`audit_logging`) |
| `<ThemeStyles />` | How the app looks (`ui_foundation`). Renders nothing until then, rather than throwing: every page uses it. Already in `src/app/layout.tsx`. |

A stub throws rather than quietly doing nothing, on purpose. An audit log that
silently discards everything is indistinguishable from one that works, and you
find out on the day you need the record.

**Conventions** — fully implemented, with no component coming:

| Seam | Rule |
| --- | --- |
| `money`, `fromDecimal`, `allocate` | Money is whole minor units. Never a float. |
| `validate`, `field` | One zod schema, checked in the browser *and* on the server. |
| `pageSize`, `toPage`, `afterCursor` | Lists page by cursor, never by `skip`/`take`. |

Write against a stub before its component exists. The error tells you what to
install; it does not invite you to write your own.

## Protected, and what to do instead

Every `source` and `test` file a component installs is protected, and the list
is written into this project's `CLAUDE.md` between markers. It is also hashed at
install time, so a file that gets rewritten is **detected** even when the
instruction is ignored.

A protected file is not a feature you are forbidden to change. It means: change
it somewhere else. Each component declares **extension points** — the paths it
expects you to write. `docs/components/<id>.md` lists them.

When a component does almost what you need:

1. Write your own code in the extension point and call into the component.
2. If that is not enough, wrap it — a new module in `src/lib/` that imports the
   component and adds what is missing.
3. Only if neither works, say so plainly rather than editing the file. A
   component that no longer matches its tests is worse than one that never fit.

## Data

### The schema has three regions

```prisma
// your generator/datasource blocks

// >>> shipyard:components
// --- auth ---
model User { ... }
// --- password_reset ---
model PasswordResetToken { ... }
// <<< shipyard:components

// your own models go here
```

The installer writes between the markers, one `// --- <id> ---` block per
component, and removes a component by deleting its block. Editing inside the
markers means the next install or upgrade silently disagrees with you. **Your
models go below the closing marker.**

### Never relate across components

This is the rule that catches everybody, because Prisma makes the wrong thing
look natural.

A Prisma relation needs a field on **both** models. Component schemas are
concatenated as separate blocks, so a component physically cannot add a
back-relation field to another component's model — and if it could, removing it
would break the other one.

So a reference to a table you do not own is a **scalar id with an index**, not a
relation:

```prisma
// Right — password_reset referring to auth's User
model PasswordResetToken {
  userId String
  @@index([userId])
}

// Wrong — needs `passwordResetTokens` on User, which password_reset does not own
model PasswordResetToken {
  user User @relation(fields: [userId], references: [id])
}
```

Inside one component, relations are correct and expected — `auth` owns both
`User` and `Session`, so `Session.user` is a relation.

What you give up is the database's cascade delete. Pay for it explicitly: when
you delete a row other tables point at, delete those rows in the same
transaction, and say so in the code. A dangling `userId` is a bug the database
will no longer catch for you.

Your own models may relate to a component's model, because you can edit both
sides — yours. Expect to fix it if that component is ever uninstalled.

### Reaching the database

One client, imported from `@/lib/prisma`. Never construct a `PrismaClient`
anywhere else: in development Next.js reloads modules constantly and a new
client per reload exhausts the connection pool within minutes.

## Server code

### Route handlers

API routes live at `src/app/api/<area>/<name>/route.ts` and export the HTTP verb
by name. Every handler:

1. **Validates its input with zod** before touching anything. Parse, do not
   trust — a body is whatever the caller sent.
2. **Returns JSON with `NextResponse.json`**, with a status that means
   something. `{ ok: true }` or `{ error: '<a sentence a person can read>' }`.
3. **Never returns a stack trace, a query, or a database error.** Log the
   detail; return the sentence.

```ts
const Body = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'That request was not valid.' }, { status: 400 });
  }
  ...
}
```

`.catch(() => null)` matters: a malformed body throws inside `request.json()`,
and an unhandled throw there is a 500 where a 400 was correct.

### Who is signed in

If `auth` is installed, there is exactly one way to ask, and it is not reading
the cookie yourself:

- **In a route handler:** `requireUser()` from `@/components/auth/current-user`.
  It returns `{ ok: true, user }` or `{ ok: false, response }`, so a forgotten
  `if` cannot let an unauthenticated request through.
- **In a page or server component:** `currentUser()` from the same module,
  which returns the user or `null`.

Do not read the session cookie, do not verify a token by hand, and do not cache
the user in a module-level variable.

### Error messages must not answer questions nobody asked

A sign-in failure says the same thing whether the address is unknown or the
password is wrong. A password reset request says the same thing whether the
address exists or not. This is not politeness — a form that distinguishes them
is a way of finding out who has an account, which for plenty of products is
information worth protecting.

When you add a flow that takes an email address and does something only for
existing users, the response must not vary. Vary what you *do*, never what you
*say*.

## Secrets and configuration

Anything environment-specific is an environment variable, declared in
`.env.example` with a comment saying what it is and where to get it, and read
through `process.env` at the point of use.

- **A secret never gets a default value.** A working fallback is how a
  development key reaches production.
- **`.env.example` is committed. `.env` is not.**
- Do not read `process.env` at module top level for anything that must change
  between environments — it freezes the value at import time, which is a
  confusing bug in tests.

## Tests

| | |
| --- | --- |
| `tests/contracts/` | Came with components. Do not edit. `npm run test:contracts` |
| `tests/` (elsewhere) | Yours. Same runner: `npm run test` |

A contract test failing means an installed component is no longer doing what it
was verified to do — usually because something edited a protected file, or a
shared dependency changed under it. Fix that; do not adjust the test.

Tests that need a live database are opt-in behind an environment flag, because a
suite that fails on every machine without a server running teaches people that
red means nothing.

## Before you build anything

Check whether it already exists. `.shipyard/library.md` lists every available
component by the problem it solves, in plain language, and it works offline.

Jobs like signing in, sending email, taking payment, uploading files, importing
a spreadsheet, keeping an audit log, or exporting someone's data are almost
certainly there, tested, with provenance. Installing one is faster than writing
it and very much safer than inventing it.

If you are about to write something that sounds like a job many products need,
say so and check first. If it is not in the library, build it in `src/app/` or
`src/lib/` following everything above — and keep it self-contained enough that it
could become a component later.

## The rules, in short

1. Never edit a protected file or a seam. Use the extension point.
2. Import from `@/seams/…` where a seam exists; otherwise from the paths a component's README shows.
3. Your models go below the closing schema marker.
4. Reference another component's table by scalar id, never a Prisma relation.
5. Money is whole minor units through `@/seams/money`. Never a float.
6. Reach the database through `scoped()` in anything customer-facing.
7. Validate every request body with zod through `@/seams/validate`.
8. Page lists by cursor through `@/seams/paginate`, never `skip`/`take`.
9. Never leak a stack trace, a query, or a database error to a caller.
10. Ask `requireUser()` who is signed in. Never read the cookie.
11. Never let an error message reveal whether an account exists.
12. Secrets have no defaults, and `.env` is never committed.
13. Do not edit contract tests.
14. Check the library before building anything a product commonly needs.

These are not only advice. Shipyard checks the project against them after
changes and before launch, and reports where the code has drifted — see
`docs/COMPONENT-LIBRARY.md` and the conformance checker.
