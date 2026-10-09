# Google Keep paste format

Verified against real pastes — this overrides the format shown in
`grocery-list-skill/SKILL.md`'s Step 7 (that version used plain store names and markdown
headers, which doesn't match what Richard actually confirmed works).

## Rules
- One item per line. No checkboxes, no brackets like `[ ]`, no blank lines, no indentation —
  Keep adds its own checkbox to every pasted line, and indentation never survives a paste.
- Blank lines between stores become empty checklist items — never include them.
- Each store name is on its own line, wrapped in four hyphens on each side:
  `----LIDL----`
- Every store is listed, even when it has no items that week.
- Only items with `include = true` go in the output. Dropped (struck-through) items are
  left out entirely.
- Store order matches the shopping order: Lidl, Trader Joe's, Aldi, H Mart, Giant / Safeway.

## Known issue
A paste of the full list once hit a character limit in Keep and landed as a single
checklist item instead of one item per line. Unresolved on Keep's end. Workaround: paste
into a plain text note first, then turn on "Show checkboxes" — or copy and paste one store
at a time. The app's "Copy for Keep" panel offers both a copy-everything button and a
per-store copy button for this reason.

## Example output
```
----LIDL----
Chuck roast
Ground beef, leanest
----TRADER JOE'S----
Avocados
Bananas
----ALDI----
----H MART----
Sesame oil
----GIANT / SAFEWAY----
```
