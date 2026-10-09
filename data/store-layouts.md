# Store aisle layouts and sections

From `grocery-list-skill/references/store-layouts.md`. Richard's rules don't correct this
file, but add H Mart (not covered by the skill) and the full default section list the app
offers in its section dropdown.

## Trader Joe's — typical flow
PRODUCE → BAKERY & BREAD → DELI & SPECIALTY → MEAT & SEAFOOD → DAIRY & EGGS → FROZEN →
PASTA & GRAINS / CANNED & JARRED / OILS, SAUCES & CONDIMENTS (center aisles) → SNACKS & NUTS
→ BEVERAGES → HOUSEHOLD

## Giant / Safeway — typical flow
PRODUCE → BAKERY → DELI & SPECIALTY → MEAT & SEAFOOD → DAIRY & EGGS → FROZEN → BAKING →
PASTA & GRAINS → CANNED & JARRED → OILS, SAUCES & CONDIMENTS → SNACKS & NUTS → BEVERAGES →
BREAD & PACKAGED BAKERY → HOUSEHOLD

## Lidl — typical flow
PRODUCE → BAKERY & BREAD → DELI & SPECIALTY → MEAT & SEAFOOD → DAIRY & EGGS → FROZEN →
BREAKFAST → BAKING → PASTA & GRAINS → CANNED & JARRED → OILS, SAUCES & CONDIMENTS →
SNACKS & NUTS → BEVERAGES → HOUSEHOLD

## Aldi — flow
No aisle map on file. Group items together in one section (usually just "OTHER") — not
worth sorting for the handful of items that go here.

## H Mart — flow
**(addition, not in the skill)** No aisle map on file. Use "ASIAN PANTRY" as the default
section for H Mart items and don't bother sub-sorting.

## Default section list (used by the app's section dropdown)
PRODUCE, BAKERY & BREAD, DELI & SPECIALTY, MEAT & SEAFOOD, DAIRY & EGGS, FROZEN, BREAKFAST,
BAKING, PASTA & GRAINS, CANNED & JARRED, OILS, SAUCES & CONDIMENTS, SPICES & SEASONINGS,
SNACKS & NUTS, BEVERAGES, BREAD & PACKAGED BAKERY, ASIAN PANTRY, HOUSEHOLD, OTHER

Richard can add his own sections from the item editor; those are remembered in the browser
(localStorage) and offered alongside this default list on future edits.

Within each section, sort alphabetically.
