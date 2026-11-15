# Dart Party

A desktop party game for a group of friends around one dartboard. Autodarts
detects the darts; this app runs a party of randomly drawn mini-games on top
of that, with a running scoreboard and a winner at the end.

Unofficial. Not affiliated with Autodarts.

## Start here

1. Read `docs/PLAN.md`. It holds the goal, every decision already made with the
   owner, the rules of each mini-game, and the build steps with their status.
   The first unchecked step is what to do next.
2. Read `docs/autodarts-local-api.md` before touching anything that talks to
   Autodarts. It records how the local API really behaves, including traps.
3. `fixtures/` holds real recordings of that API. Use them as test data.

## Working agreements

- Talk to the owner (Tom) in Dutch. Everything in the repo is English: code,
  comments, docs, UI text, commit messages.
- The decisions in `docs/PLAN.md` were settled in a long interview. Do not
  reopen them unprompted. If one turns out to be wrong in practice, say so and
  ask.
- Rules for mini-games not yet specified (see the plan) are put to the owner
  when that game is about to be built, not invented silently.
- Keep `docs/PLAN.md` current: tick steps when done, add decisions when made.
- Commit or push only when the owner asks.
- Windows cannot be tested from the development machine (Linux). The owner
  installs each test release on a Surface Pro 9 and reports back. Say plainly
  when something is untested on Windows.

## Autodarts safety

- The only state-changing Autodarts call ever used is `POST /api/reset`.
  `/api/start`, `/api/stop`, `/api/restart` and config writes are untested; ask
  before calling them.
- `GET /api/config` returns the board's cloud API key and board id without any
  login. Never store, log or commit its output. The app does not need it.
- Do not use the Autodarts name or logo in the app name or icon.

## Background

An earlier Python prototype of the same idea lives in
`/home/tom/dev/autodarts-detectie-hergebruik` (X01 and Around the Clock, web
UI). It is reference only and is not being ported line by line. It may be
deleted once this app can do the same.
