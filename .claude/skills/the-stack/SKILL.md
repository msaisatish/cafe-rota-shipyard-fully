---
name: The stack
description: Next.js, Prisma and PostgreSQL — what this project is built with, and what will not run here
version: 1.1.0
trust: verified
asserts: node=24, postgres=18
reviewedAt: 2026-10-22
---

# The stack

This project runs inside Shipyard, on the owner's own computer. Shipyard ships
its own **Node 24** and **PostgreSQL 18**, so neither needs installing. What is
here is here; what is not, is not.

The stack is the one the starter project came with, and `AGENTS.md` rule R4.1
makes it binding. This skill only adds the detail.

## Use

- **Next.js (App Router)** with **TypeScript**, for the screens and the API routes
- **Prisma** for talking to the database
- **PostgreSQL** for anything that has to be remembered
- **Vitest** for tests, and **Playwright** (`npm run test:e2e`) for the browser check, when the project has it
- **zod** for validating input, in the browser and on the server

Do not add a second framework, server or database next to these: no Express,
no Vite-only front end, no SQLite, MongoDB, Firebase or Supabase, not even
"just for the preview".

## The database

Shipyard runs PostgreSQL and gives the app its address when it starts the
preview. Your terminal deliberately has **no `DATABASE_URL`**. Do not ask the
founder for one, do not edit `.env` for one, and do not run `prisma generate`,
`prisma db push` or `prisma migrate`: Shipyard applies schema changes itself
(rule R4.5a). Your models go below the components' block in
`prisma/schema.prisma` (rule R4.5).

## Running the app

Do not start a development server (rule R4.6). Shipyard runs the app and
shows it beside the chat, on a port it chooses. To check your work, run the
checks in rule R8.1. Do not run `npm run build` while the preview is running
(rule R8.1a).

## Do not use

| Not this | Because | Use instead |
| --- | --- | --- |
| Docker, docker-compose | Not installed, needs admin rights the owner may not have | Nothing — Postgres runs directly |
| MySQL, MongoDB, SQLite | Only Postgres is provided | PostgreSQL through Prisma |
| Redis | No official Windows build | Postgres tables, or the background jobs component |
| Anything needing a system package manager | The owner has no compiler and cannot install one | A dependency with prebuilt binaries |

## Native dependencies

Anything that compiles C++ on install (`node-gyp` in the output) will fail on a
machine with no build tools, which is most of them. Before adding a dependency,
prefer a pure-JavaScript one. `bcrypt` → `bcryptjs`. `sharp` is usually fine
because it ships prebuilt binaries; check that it does before relying on it.

## Secrets

There is no secrets manager. Read configuration from `process.env`, keep
`.env.example` listing what is needed, and never commit real keys. Never open
`.env` (rule R6.3a). If the app needs a key the owner has not got yet, make
that a visible message on screen, not a crash at startup.
