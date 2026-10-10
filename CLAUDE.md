# CLAUDE.md

Guidance for a Claude session generating Richard's weekly grocery list for Store Run.

## What this repo is

Store Run is a static web app (`index.html`) that shows Richard a draft weekly grocery list
for review: he switches off what he doesn't need, edits names/quantities, adds what's
missing, then uses the app's "Copy for Keep" button to get a paste-ready version for the
Google Keep note he shares with his wife — the actual shopping list. The app never talks to
a server; everything lives in a JSON file he imports and in his browser's localStorage.

**Your job most weeks: produce that JSON file.**

The public parts of this repo (`/data`, `index.html`) are generic — no household data.
Richard's actual recipe library, staples list, and store routing live in `/private`, which
is gitignored and never committed. Read and write there freely; never put real weekly data
or the personal reference files under `/data`.

## Weekly workflow

1. Richard gives you this week's recipes (new or by name from `private/recipes.md`), notes
   servings/substitutions/skips.
2. Build the week's item list:
   - Pull ingredients for each recipe from `private/recipes.md` (scaling, exclusions, and
     substitutions are already worked out there — use them as-is unless he says to change
     something this week).
   - Merge duplicate ingredients across recipes.
   - Append the staples from `private/staples.md`, respecting the seasonal/biweekly/
     check-pantry notes in that file (e.g. ask if it's an "on" week for Dave's Killer bread;
     only propose pumpkin spice brioche Sep 1–Thanksgiving).
   - Route each item to a store using `private/store-routing.md`. Store exceptions (Aldi
     brisket, TJ's pesto, Lidl salmon) override the general quality-first logic.
   - Assign a section/aisle using `data/store-layouts.md`'s default list, in store aisle-flow
     order.
   - Flag pantry-staple ingredients (oils, spices, condiments, canned goods, etc.) with
     `flag: true` rather than omitting them — Richard decides whether to strike them.
3. Write the result as a week JSON file (schema in [README.md](README.md)) with a `week`
   title like "Week of Sept 28, 2026" and a `recipeNotes` array summarizing this week's
   scaling/substitution calls (this becomes the "Recipes this week" panel at the top of the
   app). Save it to `private/weeks/<date>.json` (e.g. `private/weeks/2026-10-09.json`) —
   that folder is gitignored, so it's fine to keep every week there.
4. Tell Richard the exact URL to open: the running local server plus
   `?list=private/weeks/<date>.json` (see README — this auto-loads the file instead of
   making him click Import). He reviews/edits there — you don't need to simulate that step.
5. If he gives a new recipe that isn't in `private/recipes.md` yet, add it there (with
   scaling/exclusions/substitutions) so it doesn't need re-explaining next time.
6. If he corrects something durable (a recipe detail, a staple, a routing rule, a Keep
   formatting quirk), update the relevant file in `/private` (or `data/keep-format.md` /
   `data/store-layouts.md` if it's genuinely generic, not household-specific) — don't just
   remember it for this session.

## The /private files (gitignored — create if missing)

- `private/recipes.md` — saved recipe library: scaling defaults, exclusions, substitutions,
  store/brand quirks.
- `private/staples.md` — the standing weekly staples list, with seasonal/biweekly/dropped
  items noted.
- `private/store-routing.md` — which store each kind of item goes to, store exceptions.
- `private/weeks/*.json` — past and current week files, in the app's JSON schema.
- `private/seed/` — the original handoff files this app was built from (historical
  reference only — `/private/recipes.md` etc. are already the merged, current source of
  truth, so you shouldn't need to re-read `seed/` for routine weeks).

- `private/data/` — the same recipes, staples and routing as structured JSON
  (`recipes.json`, `staples.json`, `routing.json`; format in `data/library/README.md`).
  When you change `private/recipes.md`, `staples.md` or `store-routing.md`, keep the JSON
  in step, then run `python scripts/check_data.py`. `data/library/` is the fictional public
  starter set; never copy real data into it.

If `/private` doesn't exist yet (e.g. a fresh clone), these files need to be created —
ask Richard for his recipes/staples/routing rather than assuming defaults.

## The /data files (public, generic — safe to read on a public repo)

- `data/store-layouts.md` — aisle flow per store, and the default section list the app's
  section dropdown offers.
- `data/keep-format.md` — the exact plain-text format for the Google Keep paste. Follow it
  precisely if you're ever asked to produce Keep text directly instead of (or in addition
  to) the JSON.
- `data/sample-week.json` — fake placeholder data only, used by the app before any real list
  is imported. Never overwrite this with real data.

## Keep format, in brief

One item per line, no checkboxes/brackets/blank lines. Each store name on its own line
wrapped in four hyphens (`----LIDL----`). Every store listed even if empty. Only items the
user kept (`include: true`). Full detail and a worked example in `data/keep-format.md`.
