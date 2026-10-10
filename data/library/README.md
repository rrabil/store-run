# Recipe library format

Store Run's recipes, staples and store routing are kept as plain data files so that
editing a recipe is an ordinary, reviewable change. This folder holds a **fictional
starter library** (safe for a public repo). A real household keeps the same three files,
in the same format, in a private folder that is never committed (`private/data/` in this
project).

| File | What it holds |
|---|---|
| `recipes.json` | Every saved recipe, with its ingredients, scaling rules, exclusions and swaps |
| `staples.json` | Items that go on every list: always-on, check-pantry, every-other-week, seasonal |
| `routing.json` | The store shopping order, the section (aisle) list, and which store carries what |

To check any library for mistakes, run:

```
python scripts/check_data.py                    # this starter library + private/data if present
python scripts/check_data.py private/data       # one specific folder
```

## recipes.json

```json
{
  "version": 1,
  "categories": ["Chicken", "Turkey", "Beef & lamb", "Pork", "Fish & seafood", "Vegetarian"],
  "recipes": [ { ...one recipe... } ]
}
```

### One recipe

| Field | Meaning |
|---|---|
| `id` | Short unique name made of lowercase words and hyphens |
| `name` | Display name |
| `aliases` | Other names it goes by (for search) |
| `category` | One of the `categories` above (grouped by main protein for now) |
| `source` | Where it came from (cookbook, site), or empty |
| `servings` | The batch size the quantities below are for, or `null` if not stated |
| `originalServings` | What the source recipe makes before scaling, or `null` |
| `servingsText` | Free-text servings note such as `"4-6"`, or empty |
| `exclusions` | Parts of the source recipe that are skipped |
| `substitutions` | Swaps, as `{ "from": "...", "to": "..." }` |
| `notes` | Anything else worth remembering |
| `ingredients` | The shopping lines (below) |

### One ingredient

| Field | Meaning |
|---|---|
| `name` | What to buy |
| `quantity` | The amount to **buy** for the recipe's `servings`, as a number, or `null` ("to taste") |
| `quantityMax` | Top of a range, when the amount is a range (`3` to `4` lb) |
| `unit` | `lb`, `oz`, `cup`, `tbsp`, `tsp`, `clove`, `can`, `jar`, `box`, `pack`, `family pack`, `bunch`, `head`... or `null` for a plain count |
| `scales` | `true` if the amount changes when servings change; `false` if fixed (for example, "always one family pack of chicken") |
| `store` | Which store, from `routing.json`'s `storeOrder` |
| `section` | Which aisle section, from `routing.json`'s `sections` |
| `flag` | `true` = pantry-check item: shown, but the shopper decides whether to buy |
| `optional` | `true` = ask, or include by default |
| `onHand` | `true` = kept on hand, left off the list |
| `note` | Short note shown with the item |
| `group` | The recipe's own heading for this ingredient ("Sauce", "Marinade"), or empty |

Notes on the numbers:

- `quantity` is already the amount to buy. If a source recipe says "4 servings, scale
  to 8", the file holds the doubled amounts and `servings` is `8`.
- Fractions are stored as decimals (`1/3` cup is `0.333`). The app will turn them back
  into fractions when it displays them.
- When scaling gives a count that isn't a whole item (for example 1.5 limes), the list
  generator (Phase 2) will round up for whole-item units.

## staples.json

Each staple has `name`, `store` and `section`, plus any of:
`quantity`, `unit`, `note`, `mustAlwaysAppear`, `checkPantry`, `frequency`
(`weekly`, the default, or `biweekly`), `askIfOnWeek`, and `season`
(`{ "from": {"month": 9, "day": 1}, "until": "us-thanksgiving" }`, where `until` may also be
a `{month, day}`). `keptOnHand` lists things never to propose.

## routing.json

`storeOrder` is the shopping order. `sections` is the aisle list the app offers.
`stores` describes what each store carries (human-readable). `exceptions` are items that
always go to one store, overriding the general rules.
