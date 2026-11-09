---
name: Check the library before building
description: Before building a common job (sign-in, payments, uploads, email, roles…), search Shipyard's parts library; when a part fits, ask the founder through Shipyard and build on it if they say yes
version: 2.2.0
trust: verified
reviewedAt: 2026-11-04
---

# Check the library before building

The rules for ready-made parts and experts are in AGENTS.md section 3 (R3.1 to
R3.6), already in front of you: check before building, ask the founder through
Shipyard when a part fits, never copy or rewrite one. This skill adds only how
to call Shipyard's helper and what its answers mean.

## How to reach the library

Your environment has `SHIPYARD_HOSTING_URL` and `SHIPYARD_HOSTING_TOKEN`: Shipyard's
helper on this computer, for this project only. Every call sends the token:

```bash
curl -s -H "Authorization: Bearer $SHIPYARD_HOSTING_TOKEN" "$SHIPYARD_HOSTING_URL/parts?need=let+customers+sign+in"
```

To send something, add
`-X POST -H "Content-Type: application/json" -d '{"reason":"..."}'`.
In PowerShell use `curl.exe`, `$env:SHIPYARD_HOSTING_TOKEN` and
`$env:SHIPYARD_HOSTING_URL`; PowerShell mangles quotes inside `-d`, so write the
JSON to a file in `$env:TEMP` and send it with `-d "@$file"`.

| Call | What it gives you |
| --- | --- |
| `GET /parts?need=<what you are about to build>` | The parts that fit, best first: what each does, whether it is installed, what it costs, the hours it saves, its test count |
| `GET /parts` | Every part |
| `GET /parts/<id>` | One part's page: what it does, what it comes with, what it needs, its tests and security, what it does not do |
| `POST /parts/<id>` with `{"reason":"what you are about to build"}` | Asks the founder in Shipyard's window whether to use it. Waits for their answer |
| `GET /questions/<id>` | Keep waiting, when the answer above was `202` (still waiting) |
| `POST /parts/<id>/tests` | The part's contract tests, free, written to `tests/contracts/` without adding the part. For when the founder chose to build their own (R3.4) |
| `GET /experts`, `POST /experts/<id>` | The experts and specialists (R3.6). Experts land in `.claude/skills/<id>/SKILL.md`, specialists in `.claude/agents/<id>.md` |

If the two variables are missing, this session was not started with the helper:
follow what R3.1 and R3.3 say for that case.

## When to check

The signal is the **shape of the request**, not the technology: a job many
products need (the list in R3.1). If you are about to write a file called
something like `auth.ts`, `upload.ts`, `invoice.ts`, `csv.ts` or
`permissions.ts`, that is the moment to stop and look.

## What the answer to `POST /parts/<id>` means

Give a short reason in the founder's words ("sign-in for the customer portal").
While you wait, carry on with work that does not depend on it, then
`GET /questions/<id>` until it is answered.

- **`200`, `"added": true`**: the part is in the project. Read its guide at
  `docs/components/<id>.md` and build on it (R3.2). Tell the founder in one
  sentence what it gave them.
- **`409`, `founder_said_no`**: build your own (R3.4) and say which part you
  replaced. Do not offer it again. First `POST /parts/<id>/tests`: your version
  goes in `src/components/<id>/`, where the tests import it from, and must pass
  them with `npm run test:contracts`.
- **`409`, `not_added`** (for example not enough credits): tell the founder the
  reason in their words, and ask whether to build your own instead.

If nothing fits, build it: not finding something is the normal case. If what you
built felt like it *should* have been in the library, say so at the end.

If an installed part genuinely needs changing, change the code that calls it,
or say that the part itself needs fixing (R3.5, R4.2).
