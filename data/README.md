# /data

Generic, public-safe reference material — nothing here is specific to one household.

- `store-layouts.md` — generic supermarket aisle-flow maps and the default section list the
  app's section dropdown offers.
- `keep-format.md` — the mechanics of pasting a plain-text list into Google Keep (checkbox
  behavior, line limits). Not personal, just how Keep works.
- `sample-week.json` — the fake week the app loads before any real list has been imported.

None of these are read by the app at runtime except `sample-week.json`. The `.md` files are
reference material for whoever (you, or Claude) is assembling a week's JSON — see the root
[CLAUDE.md](../CLAUDE.md).

## library/ — structured recipe, staples and routing data

`library/` holds a **fictional starter library** (recipes, staples, store routing) as JSON,
plus [library/README.md](library/README.md) explaining the format. A real household keeps
the same three files in `private/data/`. Check either with `python scripts/check_data.py`.
Nothing reads these files at runtime yet; the recipe picker and list generator (roadmap
Phase 2) will.

## Your own recipes/staples/routing

This repo's actual recipe library, staples list, and store routing live in `/private`,
which is gitignored and never committed — they're specific to one household and don't
belong in a public app. If you're standing this up for yourself, create your own
`/private/recipes.md`, `/private/staples.md`, and `/private/store-routing.md` (same shape as
described in `CLAUDE.md`), or just hand your recipes straight to Claude each week without
a saved library at all.
