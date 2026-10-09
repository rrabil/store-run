---
name: weekly-list
description: "Starts this week's Store Run grocery list end to end: makes sure the local app server is running, asks what's being cooked this week, builds the week's JSON from private/recipes.md + private/staples.md + private/store-routing.md, and hands back the exact URL to open and review. Use when the user wants to start, build, or generate this week's grocery list, or invokes /weekly-list."
---

# Weekly list

Runs the Store Run weekly workflow (see `CLAUDE.md` for the full reference) without making
the user remember the steps. Do these in order.

## 1. Make sure the server is running

Check `http://localhost:8420/` (e.g. `curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:8420/`).
If it doesn't respond with `200`, start it in the background from the repo root:

```
python -m http.server 8420
```

Use a background-capable run so it keeps serving after this step finishes — don't block on
it. Confirm it came up before moving on (retry the curl check once or twice).

## 2. Ask what's being cooked

Don't dump the whole recipe library as a multiple-choice menu — it's too long for that and
grows over time. Just ask conversationally, something like:

> "What's on the menu this week? Name any saved recipes (or paste/link new ones), and flag
> anything to skip, swap, or scale differently."

Then, if relevant this week, also check the standing judgment calls from `private/staples.md`:
- Is this an "on" week for Dave's Killer bread (`[2wk]`)?
- Is it currently Sep 1–Thanksgiving, i.e. should pumpkin spice brioche be proposed
  (`[seasonal]`)?

These two are quick yes/no calls — fine to ask with `AskUserQuestion` if you want a crisper
UI, or just ask in plain chat.

## 3. Build the list

Follow `CLAUDE.md`'s weekly workflow exactly:
- Pull each named recipe's ingredients (scaling, exclusions, substitutions) from
  `private/recipes.md`. If the user names something not in there, ask for it and offer to
  save it to the library afterward.
- Merge duplicate ingredients across recipes.
- Append staples from `private/staples.md`, respecting seasonal/biweekly/check-pantry notes.
- Route each item to a store via `private/store-routing.md` (store exceptions override the
  general logic).
- Assign a section using `data/store-layouts.md`'s default list, in aisle-flow order.
- Flag common pantry items (`flag: true`) rather than omitting them.
- Write a `recipeNotes` entry per recipe used, summarizing this week's scaling/substitution
  calls.

## 4. Save and hand back the link

Save the result as `private/weeks/<date>.json` (e.g. `private/weeks/2026-10-16.json`,
matching the `week` title's date). Then tell the user the exact URL to open:

```
http://localhost:8420/?list=private/weeks/<date>.json
```

Remind them this auto-loads the list — no Import click needed — and that they review/edit
there before using Copy for Keep.

## 5. Update the library if needed

If a new recipe came up, add it to `private/recipes.md` now (with scaling, exclusions,
substitutions worked out) so it doesn't need re-explaining next time.
