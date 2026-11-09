<!-- shipyard:rules v1 -->
# Instructions for Claude Code

The rules for this project are in AGENTS.md, shared by every coding agent the
founder may use. They are loaded in full here:

@AGENTS.md

The founder's decisions, loaded every session so they are never paraphrased
away:

@IDEA.md

`PROJECT.md` (the plan) and `DESIGN.md` (the design blueprint) are not loaded
here: they change while the app is built, and every helper would carry the
whole of both. Read the part your work needs, from disk.

## Claude-only notes

- Ask the founder's questions on the questions form in rule R1.3, at most 7
  a round, not with the question tool.
- Specialist briefs in `.claude/agents/` are subagents you can start. Start
  one fixer per problem and wait for it (R12.4); start helpers together only
  when each works on different files. Two fixers on one failure edited the
  same files at once and undid each other's work.

Shipyard wrote this file. Leave it in place.
