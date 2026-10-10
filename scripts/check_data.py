#!/usr/bin/env python3
"""Check Store Run's recipe, staples and routing data files for mistakes.

Usage:
    python scripts/check_data.py                 # checks data/library and, if present, private/data
    python scripts/check_data.py path/to/folder  # checks one folder

Each folder must hold recipes.json, staples.json and routing.json (see
data/library/README.md for the format). Exits with code 1 if anything is wrong.
"""
import json
import os
import re
import sys

errors = []
warnings = []


def err(where, msg):
    errors.append("%s: %s" % (where, msg))


def load(folder, name):
    path = os.path.join(folder, name)
    try:
        with open(path, encoding="utf-8-sig") as fh:  # -sig: tolerate Notepad's invisible BOM
            return json.load(fh)
    except FileNotFoundError:
        err(path, "file is missing")
    except ValueError as e:
        err(path, "not valid JSON (%s)" % e)
    return None


def is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def check_routing(folder, r):
    where = os.path.join(folder, "routing.json")
    if r is None:
        return set(), set()
    stores = r.get("storeOrder")
    secs = r.get("sections")
    if not isinstance(stores, list) or not stores:
        err(where, "storeOrder must be a non-empty list")
        stores = []
    elif len(set(stores)) != len(stores):
        err(where, "storeOrder has duplicate stores")
    if not isinstance(secs, list) or not secs:
        err(where, "sections must be a non-empty list")
        secs = []
    elif len(set(secs)) != len(secs):
        err(where, "sections has duplicates")
    for s in r.get("fallbackStores", []):
        if s not in stores:
            err(where, "fallback store %r is not in storeOrder" % s)
    for s, sec in r.get("defaultSectionByStore", {}).items():
        if s not in stores:
            err(where, "defaultSectionByStore: unknown store %r" % s)
        if sec not in secs:
            err(where, "defaultSectionByStore: unknown section %r" % sec)
    for s, order in r.get("sectionOrderByStore", {}).items():
        if s not in stores:
            err(where, "sectionOrderByStore: unknown store %r" % s)
        if not isinstance(order, list):
            err(where, "sectionOrderByStore[%r] must be a list" % s)
            continue
        for sec in order:
            if sec not in secs:
                err(where, "sectionOrderByStore[%r]: unknown section %r" % (s, sec))
        if len(set(order)) != len(order):
            err(where, "sectionOrderByStore[%r] has duplicate sections" % s)
    if not isinstance(r.get("checkStockNotes", {}), dict):
        err(where, "checkStockNotes must be a name -> note mapping")
    for ex in r.get("exceptions", []):
        if ex.get("store") not in stores:
            err(where, "exception %r: unknown store %r" % (ex.get("item"), ex.get("store")))
    for st in r.get("stores", []):
        if st.get("name") not in stores:
            err(where, "stores[]: %r is not in storeOrder" % st.get("name"))
    return set(stores), set(secs)


def check_recipes(folder, doc, stores, sections):
    where = os.path.join(folder, "recipes.json")
    if doc is None:
        return
    cats = doc.get("categories")
    if not isinstance(cats, list) or not cats:
        err(where, "categories must be a non-empty list")
        cats = []
    seen = set()
    for r in doc.get("recipes", []):
        rid = r.get("id")
        w = "%s [%s]" % (where, rid or r.get("name"))
        if not rid or not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", rid):
            err(w, "id must be lowercase words joined by hyphens")
        elif rid in seen:
            err(w, "duplicate id")
        seen.add(rid)
        if not r.get("name"):
            err(w, "missing name")
        if r.get("category") not in cats:
            err(w, "category %r is not in the categories list" % r.get("category"))
        sv = r.get("servings")
        if sv is not None and not (is_num(sv) and sv > 0):
            err(w, "servings must be a positive number or null")
        for k in ("aliases", "exclusions", "notes"):
            if not isinstance(r.get(k, []), list):
                err(w, "%s must be a list" % k)
        for s in r.get("substitutions", []):
            if not (s.get("from") and s.get("to")):
                err(w, "each substitution needs from and to")
        ings = r.get("ingredients")
        if not isinstance(ings, list) or not ings:
            err(w, "needs at least one ingredient")
            continue
        for i, g in enumerate(ings):
            iw = "%s ingredient %d (%s)" % (w, i + 1, g.get("name"))
            if not g.get("name"):
                err(iw, "missing name")
            q, qm = g.get("quantity"), g.get("quantityMax")
            if q is not None and not (is_num(q) and q > 0):
                err(iw, "quantity must be a positive number or null")
            if qm is not None:
                if q is None or not is_num(qm) or qm <= q:
                    err(iw, "quantityMax needs a quantity and must be larger than it")
            if g.get("unit") is not None and not isinstance(g.get("unit"), str):
                err(iw, "unit must be text or null")
            if g.get("store") not in stores:
                err(iw, "unknown store %r" % g.get("store"))
            if g.get("section") not in sections:
                err(iw, "unknown section %r" % g.get("section"))
            for k in ("scales", "flag", "optional", "onHand"):
                if not isinstance(g.get(k), bool):
                    err(iw, "%s must be true or false" % k)


def check_staples(folder, doc, stores, sections):
    where = os.path.join(folder, "staples.json")
    if doc is None:
        return
    for s in doc.get("staples", []):
        w = "%s [%s]" % (where, s.get("name"))
        if not s.get("name"):
            err(where, "a staple is missing its name")
        if s.get("store") not in stores:
            err(w, "unknown store %r" % s.get("store"))
        if s.get("section") not in sections:
            err(w, "unknown section %r" % s.get("section"))
        if s.get("frequency", "weekly") not in ("weekly", "biweekly"):
            err(w, "frequency must be weekly or biweekly")
        se = s.get("season")
        if se is not None:
            f = se.get("from", {})
            if not (isinstance(f.get("month"), int) and 1 <= f["month"] <= 12 and
                    isinstance(f.get("day"), int) and 1 <= f["day"] <= 31):
                err(w, "season.from needs a month (1-12) and day (1-31)")
            if se.get("until") != "us-thanksgiving":
                u = se.get("until")
                if not (isinstance(u, dict) and isinstance(u.get("month"), int) and isinstance(u.get("day"), int)):
                    err(w, "season.until must be \"us-thanksgiving\" or a month/day")


def name_key(n):
    k = re.sub(r"[,(].*$", "", n.lower().strip()).strip()
    return re.sub(r"(es|s)$", "", k)


def warn_similar_names(folder, recipes, staples):
    """Warn (not fail) when two spellings probably mean the same item.

    The list generator merges items by exact name, so 'Lemon' and 'Lemons' would
    show up as two separate lines instead of one combined line.
    """
    seen = {}
    for r in (recipes or {}).get("recipes", []):
        for g in r.get("ingredients", []):
            seen.setdefault(name_key(g.get("name", "")), set()).add(g.get("name", ""))
    for s in (staples or {}).get("staples", []):
        seen.setdefault(name_key(s.get("name", "")), set()).add(s.get("name", ""))
    for k, names in sorted(seen.items()):
        if len(names) > 1:
            warnings.append("%s: similar names will NOT merge on the list: %s"
                            % (folder, " / ".join(sorted(names))))


def check_folder(folder):
    print("Checking %s ..." % folder)
    routing = load(folder, "routing.json")
    stores, sections = check_routing(folder, routing)
    recipes = load(folder, "recipes.json")
    staples = load(folder, "staples.json")
    check_recipes(folder, recipes, stores, sections)
    check_staples(folder, staples, stores, sections)
    warn_similar_names(folder, recipes, staples)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if len(sys.argv) > 1:
        folders = sys.argv[1:]
    else:
        folders = [os.path.join(root, "data", "library")]
        priv = os.path.join(root, "private", "data")
        if os.path.isdir(priv):
            folders.append(priv)
    for f in folders:
        check_folder(f)
    if warnings:
        print("\n%d warning(s) (not failures; confirm these really are different items):" % len(warnings))
        for w in warnings:
            print("  - " + w)
    if errors:
        print("\n%d problem(s) found:" % len(errors))
        for e in errors:
            print("  - " + e)
        return 1
    print("All good: no problems found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
