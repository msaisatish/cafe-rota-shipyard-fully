<!-- shipyard:rules v1 -->
# Project rules

These are the rules for building this app. They apply to every coding agent
that works here (Claude Code, Codex, Gemini, Antigravity or any other), in
every session, from the first message to the last. The founder may switch
agents at any time; the next agent picks up from these same files. Shipyard
wrote them when the project was created and keeps them up to date.

Rules are numbered so that reviews and checks can refer to them. **MUST** means
no exceptions. **SHOULD** means do it unless you can say in one sentence why not.

## 0. The project files, and who owns them

They are the same for every agent. `CLAUDE.md` and `GEMINI.md` load
`AGENTS.md` and `IDEA.md`, so their agents do not read those two again;
any other agent reads them at the start of **every** session. Every agent reads
`.shipyard/idea.json`, `FOUNDATION.md` and `.shipyard/progress.md` then. Of
`PROJECT.md`, `DESIGN.md` and `ARCHITECTURE.md`, read the part the work
needs, from disk: they change during the build. Read a file again only once it
has changed.

| File | What it is | Who writes it |
| --- | --- | --- |
| `AGENTS.md` (this file) | How to build: the rules | Shipyard |
| `CLAUDE.md`, `GEMINI.md` | Point their agents at this file | Shipyard |
| `.shipyard/idea.json` | Which stage the project is in (`builtAt`) | Shipyard |
| `IDEA.md` | The idea in the founder's own words | The founder, with you during discovery |
| `FOUNDATION.md` | The founder's first answers: scope, stage, users | The founder |
| `PROJECT.md` | The agreed build plan: phases, in order | Shipyard when building starts; the founder may edit |
| `ARCHITECTURE.md` | The project layout and component contract | Shipyard |
| `idea/READY-MADE.md` | Every ready-made component, while the idea is written down | Shipyard |
| `.shipyard/library.md` | The ready-made components and what each solves, once building | Shipyard |
| `.shipyard/progress.md` | What is done, what is next | You |
| `DESIGN.md` | The design blueprint: look, screens, states, parts in use | Shipyard writes the block between its `shipyard:design` markers; the UI designer completes the rest before the first screen |
| `.shipyard/build-plan.md` | The order of the work and which helper owns each step | Shipyard |

R0.1 MUST NOT create, rewrite or delete `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
`IDEA.md` (outside discovery), `FOUNDATION.md`, `PROJECT.md`,
`ARCHITECTURE.md`, the generated block of `DESIGN.md`, or anything under
`.shipyard/` other than `progress.md`. If one is missing, say so; do not
write your own.

R0.2 Order of authority when two things disagree:

1. The founder's confirmed decisions about **what** the app does:
   `PROJECT.md`, then `IDEA.md`, then `FOUNDATION.md`.
2. These rules, and `ARCHITECTURE.md`, about **how** it is built; `DESIGN.md`
   about how it **looks**.
3. A skill in `.claude/skills/` for the task in hand.
4. Your own preferences.

If you think a rule is wrong for this project, say so in one sentence and
follow it anyway.

## 1. Who you are working for

R1.1 The founder is not a developer. They have never used a terminal and they
read your messages in Shipyard, a desktop app, with no terminal on screen.

R1.2 MUST: every technical choice not settled here or in `ARCHITECTURE.md` is
yours. Make it, say what you did in one plain sentence, and continue. Never ask
about libraries, file names, config, tests, schema or tooling.

R1.3 Ask only about what the people using the app would notice: names, who can
see what, what happens to something a user submits, what comes first. Ask in
**rounds of at most 7**, most important first, each with a sensible default;
ask the rest in the next round, dropping any the answers settled.

At every stage, ask them on Shipyard's **questions form**, not in the chat:
write the whole round to `.shipyard/questions.json` (replacing any earlier
round), then say in two or three lines what you found and that your questions
are on screen. Do not repeat them in the chat. Shipyard shows them with the
choices as buttons and sends the founder's answers back as one message; record
them where they belong. A helper's questions go on the same form: collect them
and write one round. The file:

```json
{
  "questions": [
    {
      "id": "manager-rates",
      "group": "Who sees what",
      "question": "Can managers see pay rates?",
      "why": "Decides what managers see on every project page.",
      "important": true,
      "options": [
        { "label": "Admin only", "recommended": true },
        { "label": "Every manager" }
      ]
    }
  ]
}
```

- Two to four `options`, short, in the founder's words; mark your suggestion
  `"recommended": true` on exactly one. Shipyard adds "Something else" and
  "Not sure, you decide" itself.
- `"important": true` only when nothing written down settles it **and** the
  answer changes what people using the app get: a contradiction, a missing
  essential. Keep these few. Everything else is `false` and arrives with your
  suggestion already chosen.
- `quotes` only for a contradiction: the passages that disagree, each as
  `{ "source": "<where it was written>", "text": "<the passage>" }`.

Take every default only when the founder says so in words that cover them all
("use the defaults", "accept all suggestions"). A bare "ok", "yes", "fine" or
"sure" after a list of questions is not that: ask once, in one line, whether
they want every suggested answer or would rather answer some themselves, and
record nothing until they say.

R1.4 Report changes in terms of the app ("people can now reset their
password"), never in terms of tools, files or commands. When something breaks,
read the error yourself, say what is broken in plain words and what you are
doing about it.

R1.5 When a build step ends, never say only "done": a founder reads that as the
whole app being finished. Name it ("Step 2 of 9, the plan, is done"), say what
they can see in the preview now, or that nothing visible has changed yet and
why, and that the next step starts when they press **Start this step**.

## 2. Stages: do the work of the stage you are in

The stage is decided by `.shipyard/idea.json` and nothing else.

R2.1 **Discovery** (`.shipyard/idea.json` exists and has no `builtAt`): you
are writing down the idea, nothing else. MUST NOT write application code,
scaffold a project, create `package.json`, or install anything. If the founder
asks you to build, reply: "Press **Confirm requirements** at the top, then
**Confirm page layouts and start building**. Shipyard sets up the project, the
ready-made parts and the checks, and I'll begin." Then stop.

R2.2 **Build** (`builtAt` is set, or there is no `.shipyard/idea.json`):
Shipyard has set up the starter project and the components. Build only on top
of that starter. MUST NOT start a second project, a second framework or a
parallel folder structure.

R2.3 Work in the phases in `PROJECT.md`, in order. After **Build everything**,
do every step the founder's message lists, in that turn, and none of the
"Before launch" steps; otherwise do not start the next phase until the founder
has seen the current one working.

## 3. Ready-made components come first

Shipyard has a library of components that are already built, tested and
security-reviewed. Using one is faster for the founder, uses less of their AI
subscription, and comes with its checks. Writing your own version is the
**last** option, never the first.

R3.1 Before you build any feature, search the parts library through
Shipyard's helper: `GET $SHIPYARD_HOSTING_URL/parts?need=<what you are about to
build>`, with `Authorization: Bearer $SHIPYARD_HOSTING_TOKEN` (the skill
`use-what-exists` shows the exact commands). Without the helper, read
`.shipyard/library.md` (during discovery: `idea/READY-MADE.md`). Common matches:
sign-in and its screens, password reset, roles and permissions, keeping
customers' data apart, email, background work, audit records, file storage,
CSV import, PDF generation, booking a time, data tables, subscriptions and
payments, error monitoring, privacy export and delete, admin dashboard, empty
states.

R3.2 If a part matches and is **installed**: use it through its seam and its
extension points (section 11 lists what is installed; its guide is
`docs/components/<id>.md`).

R3.3 If a part matches and is **not installed**: MUST stop before writing that
part and ask the founder **through Shipyard**: `POST
$SHIPYARD_HOSTING_URL/parts/<id>` with `{"reason":"<what you are about to
build>"}`. Shipyard shows them the part, the hours it saves, what it costs and
its tests, and waits for their answer. On yes it is downloaded into this
project: read its guide and build on it. On no, build your own (R3.4). Build
the parts that do not depend on it while you wait. Without the helper, tell the
founder in one short message which part fits and that Shipyard can add it from
**Ready-made parts**.

R3.4 Build your own version only if the founder chooses to, or if no component
matches. Say which one you are replacing so the decision is on record. If a
part matched, first get its free tests (`POST
$SHIPYARD_HOSTING_URL/parts/<id>/tests`) and pass them unchanged.

R3.5 MUST NOT copy a component's code into the project by hand, or write a
"simpler version" of one.

R3.6 **Experts** are the rules for a role (the interface, getting ready for
real users, building in phases…) and **specialists** are briefs for a helper
with one job (security reviewer, test engineer…). They are free. `GET
$SHIPYARD_HOSTING_URL/experts` lists them; when a task calls for one this
project does not have, add it with `POST $SHIPYARD_HOSTING_URL/experts/<id>`,
then read it in full and follow it.

## 4. Architecture

`ARCHITECTURE.md` is the binding detail. These decisions matter most.

R4.1 MUST keep the stack the starter came with: **Next.js (App Router) +
TypeScript + Prisma + PostgreSQL**, tested with Vitest. Do not replace it with
another framework, server, ORM or database (no Express, Vite-only front end,
SQLite, MongoDB, Firebase or Supabase), even "just for the preview". Shipyard
publishes this stack and only this stack.

R4.2 **Components own their files; you own yours; they meet at seams.**
Where a seam exists (signing in, roles, keeping customers apart, email,
background work, audit records, money, validation, paging), import from
`@/seams/…`. A component with no seam (screens, tables, UI blocks) is imported
from the paths its README shows in `docs/components/<id>.md`; that is its
documented entry point, not a breach of this rule. MUST NOT edit `src/seams/`,
`src/components/`, protected component routes or `tests/contracts/`.

R4.3 Where your code goes, one feature at a time (`<feature>` is a word from
the founder's world: `invoices`, `clients`, `bookings`):

| Path | Holds | Rules |
| --- | --- | --- |
| `src/app/(app)/<feature>/page.tsx` | A screen | Puts components together and loads data; no business rules |
| `src/app/(app)/<feature>/_components/` | That feature's UI pieces | One component per file |
| `src/app/api/<feature>/route.ts` | An HTTP endpoint | Thin: check who is asking, validate input, call the service, reply |
| `src/lib/<feature>/service.ts` | The business rules | No HTTP, no React |
| `src/lib/<feature>/queries.ts` | Database reads and writes | Always scoped to the organisation |
| `src/lib/<feature>/schema.ts` | The zod schemas | Shared by the browser and the server |
| `src/lib/ui/` | UI pieces used by two or more features | Nothing feature-specific |
| `tests/<feature>/` | That feature's tests | Next to nothing else |

R4.4 Layers only call downwards: screen → route → service → queries. A screen
MUST NOT import Prisma. A route MUST NOT hold a business rule. No circular
imports between features; shared code moves to `src/lib/`.

R4.5 Database: your models go **below** the closing `shipyard:components`
marker in `prisma/schema.prisma`. A reference to a component's table is a
plain id with an index, never a Prisma relation.

R4.5a Shipyard updates the database. When you change `prisma/schema.prisma`
or add a migration under `prisma/migrations`, Shipyard applies it and
regenerates the Prisma client itself, restarting the preview for a few
seconds (or at the next start, if the preview is not running). A change that
would delete saved data is refused and shown to the founder. MUST NOT run
`prisma generate`, `prisma db push` or any `prisma migrate` command that
applies, resolves or resets migrations. Your terminal has no `DATABASE_URL`
on purpose: MUST NOT ask the founder for a database address or to edit `.env`
for one. A migration's SQL needs no database: `npx prisma migrate diff
--from-schema-datamodel <the schema before> --to-schema-datamodel
prisma/schema.prisma --script`. Until Shipyard has updated the client, the
type check may report the old shape: wait half a minute and run it again.

R4.6 MUST NOT start a development server. Shipyard runs the app and shows it
beside the chat. To check your work, run the checks in R8.1.

## 5. Ready to publish from day one

R5.1 Configuration comes from environment variables. Every variable the app
reads is listed by name, with a comment, in `.env.example`. MUST NOT put a
secret, key or password in code or in any committed file.

R5.2 The app listens on `process.env.PORT` and works on any domain: build
absolute links from `APP_URL`, never from a hard-coded host.

R5.3 Stateless servers. MUST NOT keep user data on local disk or in memory
between requests: data goes in PostgreSQL, files through the file storage
component, background work through `enqueue()`.

R5.4 A schema change that would delete or rewrite existing data needs the
founder's yes first, in plain words: "This removes the old notes field and the
notes in it."

R5.5 MUST NOT edit `Dockerfile`, `scripts/start.mjs` or `scripts/schema.mjs`. A request to `/` must
always get an answer (a page, or a redirect to sign in), never an error.

## 6. Security and data

R6.1 Every query on customer data is scoped to the signed-in user's
organisation through `scoped(organizationId)`. Every route checks who is
asking and whether they may, on the server, every time. A hidden button is not
access control.

R6.2 Validate every input with one zod schema, used in the browser and on the
server (`validate`, `field`).

R6.3 MUST NOT build SQL from strings, render raw HTML from user input,
redirect to a URL taken from the request, or log passwords, tokens, card
details or personal data.

R6.3a MUST NOT open, print, copy, summarise or search `.env`, `.env.*` (other
than `.env.example`) or any file of keys, even when asked. Whatever you read is
sent to your AI provider and shown in the chat. To work with settings, use the
names in `.env.example`. If the founder asks what is in `.env`, say: "I don't
open that file, because anything I read leaves your computer. Open it yourself
from the project folder."

R6.4 Money is whole minor units (`money`), never a float. Store times in UTC;
show them in the user's time zone. Lists page by cursor (`toPage`,
`afterCursor`), never by skip and take.

## 7. Code quality

Code here is read and changed by people and by other agents. Write it so the
next one can.

R7.1 MUST format normally: one statement per line, lines at most 100
characters, two-space indent. Run `npm run format` before finishing a step. Packing code into a few very long lines is never allowed.

R7.2 Size limits. Over the limit means split it by responsibility:

| Kind of file | Aim for | Hard limit |
| --- | --- | --- |
| Screen (`page.tsx`) | 100 lines | 150 |
| UI component | 120 lines | 200 |
| Route handler | 60 lines | 120 |
| Service or queries module | 200 lines | 300 |
| Test file | 250 lines | 400 |
| Any other file | 200 lines | 300 |

R7.3 A function does one thing: at most 40 lines, at most 3 levels of nesting,
at most 3 parameters (pass an object beyond that). Return early instead of
nesting.

R7.4 TypeScript strict. No `any`, no `@ts-ignore`, no non-null `!` to silence
the compiler, no unused code, no commented-out code, no `console.log` left in.

R7.5 Names come from the founder's world and say what a thing is for:
`invoice`, `overdueInvoices`, `markInvoicePaid`; never `data`, `items2`,
`handleStuff`, `utils2`. Booleans read as questions: `isPaid`, `canEdit`.

R7.6 Errors: never swallow one. Show the person using the app a plain message
and log the detail on the server. A failure must never look like a success.

R7.7 Comment why, never what. A business rule that is not obvious gets one
line saying why it exists.

R7.8 No new dependency when the starter, a component or the platform already
does the job. A new one must be well known and maintained; say which and why
in one line.

## 8. Done means checked

R8.1 A step is done only when all of these pass, run by you before you say it
is done: `npm run typecheck`, `npm test` and `npm run check:style` (rules
R7.1 and R7.2). The running preview is the build check: Shipyard shows you
its errors.

R8.1a MUST NOT run `npm run build`, `next build` or `prisma generate` while
Shipyard runs the preview. On Windows they fight the preview over the same
files, fail with EPERM and break the app the founder is looking at.

R8.1b Run tests with `npm test`, never bare `vitest`: it can watch forever and
hold files the preview needs. Never tell the founder to end a process, open a
terminal or change Claude Code's settings.

R8.2 If a check could not run (blocked, missing tool, no network), say so
plainly: "I could not run the tests, so this is not checked yet." MUST NOT
call unchecked work finished.

R8.3 Write tests for business rules (totals, status changes, numbering), for
permissions (who can see and change what) and for customer separation. MUST
NOT edit or delete a test to make it pass; fix the code.

R8.4 Browser checks (`npm run test:e2e`) run on Shipyard's test copy of the
app: the same code, its own database, emptied before each of Shipyard's own
checks. Its address is in `.shipyard/check-server.json`. MUST NOT point a
check at the founder's app or its data. Each check creates the data it needs
and MUST NOT rely on data another check left behind.

## 9. Pace and the founder's time

R9.1 Build what they can see first: the screen with sample data, then the
real data behind it. Never leave the app in a state where it does not start.

R9.2 Work in visible steps, each small enough to finish and check in a few
minutes. Say what you are starting before a long stretch of work.

R9.3 Keep `.shipyard/progress.md` current: what is done, what is next, and any
decision the next session needs. Read it at the start of a session instead of
re-reading the whole project.

R9.4 Avoid commands that need extra permission. If one is blocked, do not
retry it in a loop: say once, in plain words, what you need and why.

R9.5 Look and feel: `DESIGN.md` is binding for every screen. Before the first
screen, the UI designer completes it below the generated block (skill
`designing-the-interface`): the details of each screen, its wording, its
states. Every screen MUST use the CSS variables and the installed parts it
names, never a colour, radius or spacing written by hand. When a screen is
done, say which of its sections the screen meets. Avoid the generic default:
near-white page, violet gradient, three identical cards.

## 10. Version history

R10.1 Shipyard saves a version of the project after every step and can
restore any of them. You do not need to commit.

R10.2 MUST NOT run `git reset --hard`, `git clean`, `git checkout --`,
`git push --force`, or delete `.git` or `.shipyard`.

## 11. Installed components (Shipyard keeps this section up to date)

<!-- shipyard:components -->
## Installed components — do not rewrite these

The files below came from the Shipyard component library. They are already
tested and their tests are what proves this project is safe to launch.
Rewriting them turns a verified component into an unverified one.

If one of them is wrong, change the code that calls it, or say that the
component itself needs fixing. Do not edit inside these paths:

- **postgres_schema** 1.0.1
  - `src/app/api/health/route.ts`
  - `src/components/postgres_schema/db.ts`
  - `tests/contracts/postgres_schema.test.ts`
- **auth** 1.2.1
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/logout/route.ts`
  - `src/app/api/auth/me/route.ts`
  - `src/app/api/auth/register/route.ts`
  - `src/components/auth/current-user.ts`
  - `src/components/auth/lockout.ts`
  - `src/components/auth/password.ts`
  - `src/components/auth/session.ts`
  - `src/seams/auth.ts`
  - `tests/contracts/auth.test.ts`
- **transactional_email** 1.4.0
  - `src/components/transactional_email/email.ts`
  - `src/components/transactional_email/providers.ts`
  - `src/seams/email.ts`
  - `tests/contracts/transactional_email.test.ts`
- **password_reset** 1.3.0
  - `src/app/api/auth/password-reset/confirm/route.ts`
  - `src/app/api/auth/password-reset/request/route.ts`
  - `src/components/password_reset/reset-email.ts`
  - `src/components/password_reset/tokens.ts`
  - `tests/contracts/password_reset.test.ts`
  - `tests/contracts/password_reset_routes.test.ts`
- **ui_foundation** 1.2.0
  - `src/components/ui_foundation/Button.tsx`
  - `src/components/ui_foundation/Status.tsx`
  - `src/components/ui_foundation/Styles.tsx`
  - `src/components/ui_foundation/VisuallyHidden.tsx`
  - `src/components/ui_foundation/contrast.ts`
  - `src/components/ui_foundation/merge.ts`
  - `src/components/ui_foundation/primitives.ts`
  - `src/components/ui_foundation/tokens.ts`
  - `src/seams/theme.ts`
  - `tests/contracts/ui_foundation.test.ts`
- **ui_blocks** 0.3.0
  - `src/components/ui_blocks/AppShell.tsx`
  - `src/components/ui_blocks/Dialog.tsx`
  - `src/components/ui_blocks/SignInForm.tsx`
  - `src/components/ui_blocks/StatGrid.tsx`
  - `src/components/ui_blocks/Toasts.tsx`
  - `src/components/ui_blocks/blocks.css`
  - `src/components/ui_blocks/blocks.ts`
  - `tests/contracts/ui_blocks.test.ts`
- **auth_screens** 1.2.1
  - `src/app/forgot-password/page.tsx`
  - `src/app/register/page.tsx`
  - `src/app/reset-password/page.tsx`
  - `src/app/sign-in/page.tsx`
  - `src/components/auth_screens/messages.ts`
  - `src/components/auth_screens/redirect.ts`
  - `tests/contracts/auth_screens.test.ts`
- **data_table** 1.2.1
  - `src/components/data_table/DataTable.tsx`
  - `src/components/data_table/table.ts`
  - `tests/contracts/data_table.test.ts`

Everything else in the project is yours to change.
<!-- /shipyard:components -->

## 12. If your agent works differently

R12.1 Skills: `.claude/skills/<name>/SKILL.md`. At the start of a task, read
each skill's description; when one matches, read it in full and follow it.

R12.2 Specialist briefs: `.claude/agents/*.md`. `.shipyard/build-plan.md`
says which one owns each step. If you cannot start helpers, take the role
yourself and read its brief first.

R12.3 Ask the founder on the questions form in R1.3. Only if you cannot write
files, ask at most 7 questions in plain words at the end of your reply and stop.

R12.4 One helper changes a file at a time: one fixer per problem; parallel
helpers only on separate files.
