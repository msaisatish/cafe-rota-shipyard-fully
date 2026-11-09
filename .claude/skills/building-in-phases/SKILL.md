---
name: Building in phases
description: Finish one visible stage at a time and always leave the app running
version: 1.1.0
trust: verified
reviewedAt: 2026-09-26
---

# Building in phases

PROJECT.md contains a numbered plan. Work through it in order. Do not start the
next phase until the owner has seen the current one and said to continue.

## A phase is finished when they can see it

Not when the code is written. A phase ends with something on screen that was not
there before, because that is the only kind of progress the owner can verify for
themselves.

When you finish one, say so explicitly, in one short paragraph:

> Phase 1 is done. Press **Run my app** and you will see all five screens with
> example products in them. Nothing saves yet — that is Phase 2. Have a click
> around and tell me what is wrong.

Then stop and wait. Unless the founder sent **Build everything**: then mark
the step done in `.shipyard/plan-progress.json` and go straight on to the next
one in that turn, stopping only for a check that still fails after two fixes,
a decision only they can make, or a change to what `IDEA.md` asks for.

## The app must run at the end of every session

Not "it will work once the next bit is done". The owner checks your work by
looking at the running app, so an app that will not start reads as total
failure regardless of how much was accomplished.

If you have to leave something incomplete, leave it behind a placeholder screen
that says what is coming, never a crash.

## Small steps, in the order they can be seen

Prefer three changes they can watch land over one large change they cannot. If a
piece of work would leave the app broken for more than a few minutes, find a
smaller first step.

## Do not run ahead

Building Phase 3 because it is obvious how to is the most expensive mistake
available here. The owner will change their mind after seeing Phase 1 — that is
what the phases are for — and everything built past that point gets thrown away.
**Build everything** is the owner asking for every step of the plan in one go;
going past the steps the plan lists is still running ahead.

## Keep `.shipyard/progress.md` current

Two short lists, `## Done` and `## Next`, in plain sentences the owner would
recognise. Update it **as you finish each thing**, not at the end of the
session — the whole point is the sessions that do not get an end.

A session can stop without warning. The owner hits a usage limit, closes the
laptop, or loses their connection mid-turn. When they press **Resume**,
Shipyard reads this file and tells you what was already finished and what you
were about to do. Without it, "carry on" reaches a session that remembers
nothing, and the reasonable thing to do — re-read the project and start the
step again — means the owner watches you rebuild a screen that already worked
and concludes the tool is broken.

Write what you actually did, not what the plan said. "Sign-up screen built, but
the email field accepts anything" is worth ten times "Phase 2 complete", because
the next session inherits it.
