# Store Run

A weekly grocery list "preflight" checklist. Review a generated list, edit or switch off
items, then copy the result into Google Keep.

Static app — plain HTML/CSS/JS, no server or database. `index.html` is the whole app.

## Running it locally

Opening `index.html` directly (`file://`) won't load the sample data, because the browser
blocks `fetch()` on local files. Serve the folder instead:

```
python -m http.server 8420
```

Then open http://localhost:8420/. Or just double-click `start-server.bat` — it starts the
server in the background and opens your browser to it. No terminal or Claude Code needed,
so this works from a plain claude.ai chat too: ask it for this week's list there, save what
it gives you, double-click the launcher, and import.

### Faster: the `weekly-list` skill

In a Claude Code session with this repo open, invoke `/weekly-list` (or just ask to start
this week's list). It checks whether the server's already up and starts it if not, asks
what's being cooked, builds the week's JSON from `/private`, and hands back the exact
`?list=` URL to open — see `.claude/skills/weekly-list/SKILL.md`.

## How it works

- **The weekly list** is a JSON file you import with the "Import list" button (data model
  below). Export writes the current list back out as JSON.
- **Edits autosave** to the browser's localStorage, so a refresh never loses your work. This
  is per-browser, not synced anywhere — export if you want a durable copy.
- **Copy for Keep** formats only the items you've kept (checked) into the plain-text format
  Google Keep expects, store by store. There's a whole-list copy button and a per-store copy
  button next to each store heading (Keep has choked on very long single pastes before).

## Opening this week's list fast

Add `?list=<path>` to the URL and the app fetches that JSON on load instead of waiting for
an Import click — e.g. `http://localhost:8420/?list=private/weeks/2026-10-09.json`. It also
saves what it loads to localStorage, so a plain refresh afterward keeps showing it. This is
the fast path for a weekly Claude session: Claude writes the week file, hands you the exact
URL, you open it and start reviewing.

## Data model

Each week is:
```json
{
  "week": "Week of Sept 28, 2026",
  "recipeNotes": [ { "title": "Recipe name", "text": "scaling/substitution note" } ],
  "items": [
    { "id": "it01", "name": "Chuck roast", "qty": "3.5-4 lbs", "note": "for shawarma",
      "store": "Lidl", "section": "MEAT & SEAFOOD", "flag": false, "include": true }
  ]
}
```

- `store` is one of: Lidl, Trader Joe's, Aldi, H Mart, Giant / Safeway (shopping order).
- `section` is the aisle/category label; the app ships with a default list and lets you add
  your own from the item editor (remembered in localStorage).
- `flag` is the "check pantry" marker.
- `include` is whether the item is still on the list — `false` items stay visible, struck
  through, but are left out of the Keep copy.

## /data — public

Generic, household-agnostic reference material: aisle layouts, the Keep paste format, and
the fake sample week the app loads by default. See [data/README.md](data/README.md). This
is the only data folder in version control — safe for a public repo.

## /private — gitignored, not in version control

The real recipe library, staples list, store routing, and the original seed handoff files
(prototype HTML, the grocery-list skill, Richard's rules) — all household-specific, kept out
of git entirely. `CLAUDE.md` explains how a Claude session uses `/private` to build each
week's JSON. If you're cloning this repo fresh, `/private` won't exist until you create it.

## Deployment

Deploys to GitHub Pages via `.github/workflows/deploy-pages.yml` on every push to `main`.
The app is published at the site root; a separate Jekyll-built docs site (see below) is
published alongside it at `/docs/`.

One-time setup (not scriptable without an authenticated `gh`): in the repo's **Settings →
Pages**, set **Build and deployment → Source** to **GitHub Actions**. After that, every push
to `main` redeploys automatically — check the **Actions** tab for status and the deployed
URL.

## /docs — documentation site (Jekyll)

A separate Jekyll site, independent of the app, for longer-form documentation. Currently
just a placeholder (`docs/index.md`) — add Markdown pages with front matter as needed and
the workflow builds and publishes them on the next push, at `<pages-url>/docs/`.

- `docs/_config.yml` — Jekyll config (uses the `minima` theme).
- `docs/Gemfile` — pins the Jekyll/theme gem versions the workflow installs.
- `docs/index.md` — the docs site's home page.

To preview locally, you need Ruby and Bundler installed:
```
cd docs
bundle install
bundle exec jekyll serve
```
Then open http://localhost:4000/.
