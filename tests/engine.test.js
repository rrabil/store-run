/* Tests for js/list-engine.js.
 *
 * Run in a terminal:   node tests/engine.test.js
 * Or in a browser:     open tests/index.html via the local server.
 *
 * The core cases use tiny made-up libraries so they run anywhere. When run under Node
 * it also generates a list from the fictional starter library and, if a private
 * library is present, regenerates the Oct 9 2026 week as a real-world comparison.
 */
(function (root) {
  "use strict";

  var Engine = (typeof module === "object" && module.exports && typeof require === "function")
    ? require("../js/list-engine.js") : root.StoreRunEngine;

  var results = [];
  function check(name, cond, detail) {
    results.push({ name: name, ok: !!cond, detail: cond ? "" : (detail || "") });
  }
  function eq(name, actual, expected) {
    check(name, actual === expected, "expected " + JSON.stringify(expected) + " but got " + JSON.stringify(actual));
  }

  /* ---- tiny library builders ---- */
  var ROUTING = {
    storeOrder: ["Lidl", "Trader Joe's", "Aldi"],
    sections: ["PRODUCE", "MEAT & SEAFOOD", "DAIRY & EGGS", "OILS, SAUCES & CONDIMENTS", "SPICES & SEASONINGS", "OTHER"],
    sectionOrderByStore: {
      "Lidl": ["MEAT & SEAFOOD", "PRODUCE", "OILS, SAUCES & CONDIMENTS", "SPICES & SEASONINGS"]
    },
    checkStockNotes: { "Garlic": "check how much is left; buy a head of garlic if needed" }
  };

  function ing(name, q, unit, o) {
    o = o || {};
    return {
      name: name, quantity: q, quantityMax: o.max == null ? undefined : o.max, unit: unit || null,
      scales: o.scales !== false, store: o.store || "Lidl", section: o.section || "PRODUCE",
      flag: !!o.flag, optional: !!o.optional, onHand: !!o.onHand, note: o.note || "", group: ""
    };
  }
  function rec(id, name, ings, extra) {
    var r = { id: id, name: name, aliases: [], category: "Chicken", servings: null, originalServings: null,
      servingsText: "", exclusions: [], substitutions: [], notes: [], ingredients: ings };
    for (var k in (extra || {})) r[k] = extra[k];
    return r;
  }
  function lib(recipes, staples) {
    return { routing: ROUTING, recipes: { recipes: recipes }, staples: { staples: staples || [] } };
  }
  function qtyOf(list, name) {
    var f = list.items.filter(function (i) { return i.name === name; })[0];
    return f ? f.qty : undefined;
  }
  function itemOf(list, name) {
    return list.items.filter(function (i) { return i.name === name; })[0];
  }
  var D = new Date(2026, 9, 9);   /* Oct 9, 2026 */

  /* ---- number and unit formatting ---- */
  eq("1/3 cup shows as a fraction", qtyOf(Engine.generate(lib([rec("a", "A", [ing("Milk", 0.333, "cup")])]), [{ id: "a" }], { date: D }), "Milk"), "1/3 cup");
  eq("1.5 tbsp shows as 1 1/2 tbsp", qtyOf(Engine.generate(lib([rec("a", "A", [ing("Honey", 1.5, "tbsp")])]), [{ id: "a" }], { date: D }), "Honey"), "1 1/2 tbsp");
  eq("range keeps its range", qtyOf(Engine.generate(lib([rec("a", "A", [ing("Beef roast", 3.5, "lb", { max: 4, scales: false })])]), [{ id: "a" }], { date: D }), "Beef roast"), "3 1/2-4 lbs");
  eq("1 lb is singular", qtyOf(Engine.generate(lib([rec("a", "A", [ing("Beef", 1, "lb")])]), [{ id: "a" }], { date: D }), "Beef"), "1 lb");
  eq("plain count has no unit", qtyOf(Engine.generate(lib([rec("a", "A", [ing("Red onions", 2, null)])]), [{ id: "a" }], { date: D }), "Red onions"), "2");
  eq("no quantity gives empty qty", qtyOf(Engine.generate(lib([rec("a", "A", [ing("Kosher salt", null, null, { note: "to taste" })])]), [{ id: "a" }], { date: D }), "Kosher salt"), "");

  /* ---- batch multiplier ---- */
  var scaled = lib([rec("a", "A", [
    ing("Oil", 2, "tbsp"), ing("Chicken", 1, "family pack", { scales: false }), ing("Garlic", 10, "clove", { scales: false })
  ])]);
  eq("2x doubles things that scale", qtyOf(Engine.generate(scaled, [{ id: "a", batch: 2 }], { date: D }), "Oil"), "4 tbsp");
  eq("2x leaves fixed items alone", qtyOf(Engine.generate(scaled, [{ id: "a", batch: 2 }], { date: D }), "Chicken"), "1 family pack");
  eq("0.5x halves", qtyOf(Engine.generate(scaled, [{ id: "a", batch: 0.5 }], { date: D }), "Oil"), "1 tbsp");
  check("2x batch is noted on the recipe", /Batch 2x/.test(Engine.generate(scaled, [{ id: "a", batch: 2 }], { date: D }).recipeNotes[0].text));

  /* ---- merging ---- */
  var two = lib([
    rec("a", "Recipe A", [ing("Olive oil", 0.25, "cup", { store: "Lidl", section: "OILS, SAUCES & CONDIMENTS", flag: true })]),
    rec("b", "Recipe B", [ing("Olive oil", 2, "tbsp", { store: "Lidl", section: "OILS, SAUCES & CONDIMENTS", flag: true })])
  ]);
  var m = Engine.generate(two, [{ id: "a" }, { id: "b" }], { date: D });
  eq("mixed cup + tbsp merge into one line", m.items.length, 1);
  eq("mixed units become cup + tbsp", m.items[0].qty, "1/4 cup + 2 tbsp");
  eq("merged note lists both recipes", m.items[0].note, "Recipe A, Recipe B");

  var sameUnit = lib([
    rec("a", "A", [ing("Honey", 2, "tbsp")]), rec("b", "B", [ing("Honey", 4, "tbsp")])
  ]);
  eq("same unit stays in that unit", qtyOf(Engine.generate(sameUnit, [{ id: "a" }, { id: "b" }], { date: D }), "Honey"), "6 tbsp");

  var tspOnly = lib([rec("a", "A", [ing("Garam masala", 8, "tsp")])]);
  eq("8 tsp stays 8 tsp (not rewritten as tbsp)", qtyOf(Engine.generate(tspOnly, [{ id: "a" }], { date: D }), "Garam masala"), "8 tsp");

  var rangeMerge = lib([
    rec("a", "A", [ing("Garlic", 12, "clove")]), rec("b", "B", [ing("Garlic", 6, "clove", { max: 8 })])
  ]);
  eq("range plus fixed amount adds both ends", qtyOf(Engine.generate(rangeMerge, [{ id: "a" }, { id: "b" }], { date: D }), "Garlic"), "18-20 cloves");

  var singPlural = lib([
    rec("a", "A", [ing("Red onion", 1, null)]), rec("b", "B", [ing("Red onions", 2, null)])
  ]);
  eq("singular and plural spellings merge", Engine.generate(singPlural, [{ id: "a" }, { id: "b" }], { date: D }).items.length, 1);

  var otherStore = lib([
    rec("a", "A", [ing("Rice", 1, "box", { store: "Lidl" })]), rec("b", "B", [ing("Rice", 1, "box", { store: "Aldi" })])
  ]);
  eq("same name at different stores is not merged", Engine.generate(otherStore, [{ id: "a" }, { id: "b" }], { date: D }).items.length, 2);

  var roundUp = lib([rec("a", "A", [ing("Limes", 1, null)]), rec("b", "B", [ing("Limes", 0.5, null)])]);
  eq("whole items round up after merging", qtyOf(Engine.generate(roundUp, [{ id: "a" }, { id: "b" }], { date: D }), "Limes"), "2");

  var incompatible = lib([rec("a", "A", [ing("Coconut milk", 2, "can")]), rec("b", "B", [ing("Coconut milk", 1, "cup")])]);
  eq("cups and cans stay as separate parts", qtyOf(Engine.generate(incompatible, [{ id: "a" }, { id: "b" }], { date: D }), "Coconut milk"), "1 cup + 2 cans");

  /* ---- flags, optional, on hand, check-stock ---- */
  var flags = lib([
    rec("a", "A", [ing("Paprika", 1, "tsp", { flag: true }), ing("Cilantro", 1, "bunch", { optional: true }),
      ing("Sumac", 1, "tsp", { onHand: true }), ing("Garlic", 4, "clove")]),
    rec("b", "B", [ing("Paprika", 1, "tsp", { flag: false })])
  ]);
  var f = Engine.generate(flags, [{ id: "a" }, { id: "b" }], { date: D });
  eq("flag only if every source line is flagged", itemOf(f, "Paprika").flag, false);
  check("optional item is labeled optional", /^optional/.test(itemOf(f, "Cilantro").note));
  eq("on-hand ingredient is left off", itemOf(f, "Sumac"), undefined);
  check("on-hand ingredient is mentioned in notes", /Sumac/.test(f.recipeNotes[0].text));
  eq("garlic gets the check-stock flag", itemOf(f, "Garlic").flag, true);
  check("garlic gets the check-stock note", /buy a head of garlic/.test(itemOf(f, "Garlic").note));
  var noOpt = Engine.generate(flags, [{ id: "a", includeOptional: false }], { date: D });
  eq("optional items can be dropped", itemOf(noOpt, "Cilantro"), undefined);

  /* ---- staples ---- */
  var st = [
    { name: "Bananas", store: "Trader Joe's", section: "PRODUCE", quantity: 3, quantityMax: 4 },
    { name: "Sample bread", store: "Lidl", section: "PRODUCE", frequency: "biweekly", quantity: 1, unit: "loaf" },
    { name: "Seasonal bread", store: "Trader Joe's", section: "PRODUCE", season: { from: { month: 9, day: 1 }, until: "us-thanksgiving" } },
    { name: "Fruit medley", store: "Trader Joe's", section: "PRODUCE", checkPantry: true }
  ];
  var sl = lib([], st);
  var s1 = Engine.generate(sl, [], { date: D });
  eq("weekly staple is included", qtyOf(s1, "Bananas"), "3-4");
  eq("biweekly staple is off by default", itemOf(s1, "Sample bread"), undefined);
  eq("seasonal staple is in during the window", !!itemOf(s1, "Seasonal bread"), true);
  eq("check-pantry staple is flagged", itemOf(s1, "Fruit medley").flag, true);
  var s2 = Engine.generate(sl, [], { date: D, onWeek: { "Sample bread": true } });
  eq("biweekly staple appears on an on week", qtyOf(s2, "Sample bread"), "1 loaf");
  var s3 = Engine.generate(sl, [], { date: new Date(2026, 11, 1) });
  eq("seasonal staple is gone after Thanksgiving", itemOf(s3, "Seasonal bread"), undefined);
  var s4 = Engine.generate(sl, [], { date: D, skipStaples: ["Bananas"] });
  eq("a staple can be skipped for one week", itemOf(s4, "Bananas"), undefined);
  var s5 = Engine.generate(sl, [], { date: D, seasonOverride: { "Seasonal bread": false } });
  eq("season can be overridden", itemOf(s5, "Seasonal bread"), undefined);
  eq("Thanksgiving 2026 is Nov 26", Engine.thanksgiving(2026), 26);
  eq("Thanksgiving 2025 is Nov 27", Engine.thanksgiving(2025), 27);
  eq("Thanksgiving day itself is still in season", Engine.inSeason(st[2].season, new Date(2026, 10, 26)), true);
  eq("day after Thanksgiving is out", Engine.inSeason(st[2].season, new Date(2026, 10, 27)), false);
  eq("staple questions name the biweekly item", Engine.stapleQuestions(sl, D).filter(function (q) { return q.type === "biweekly"; })[0].name, "Sample bread");

  /* ---- sorting ---- */
  var sortLib = lib([rec("a", "A", [
    ing("Zucchini", 1, null, { store: "Lidl", section: "PRODUCE" }),
    ing("Apples", 1, null, { store: "Lidl", section: "PRODUCE" }),
    ing("Beef", 1, "lb", { store: "Lidl", section: "MEAT & SEAFOOD" }),
    ing("Eggs", 1, "carton", { store: "Aldi", section: "OTHER" }),
    ing("Yogurt", 1, null, { store: "Trader Joe's", section: "DAIRY & EGGS" })
  ])]);
  var order = Engine.generate(sortLib, [{ id: "a" }], { date: D }).items.map(function (i) { return i.name; });
  eq("sorted by store, then that store's aisle order, then A-Z", order.join(","), "Beef,Apples,Zucchini,Yogurt,Eggs");

  /* ---- week title ---- */
  eq("week title from date", Engine.weekTitle(D), "Week of Oct 9, 2026");

  /* ---- output shape the existing app understands ---- */
  var shape = Engine.generate(two, [{ id: "a" }], { date: D });
  var it = shape.items[0];
  check("items have the app's fields", ["id", "name", "qty", "note", "store", "section", "flag", "include"].every(function (k) { return k in it; }));
  eq("items start included", it.include, true);

  /* ---- Node-only: real libraries ---- */
  if (typeof require === "function" && typeof process !== "undefined") {
    var fs = require("fs"), path = require("path");
    var rootDir = path.join(__dirname, "..");
    var load = function (dir) {
      var rd = function (f) { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8").replace(/^﻿/, "")); };
      return { recipes: rd("recipes.json"), staples: rd("staples.json"), routing: rd("routing.json") };
    };

    var pub = load(path.join(rootDir, "data", "library"));
    var allIds = pub.recipes.recipes.map(function (r) { return { id: r.id }; });
    var pubList = Engine.generate(pub, allIds, { date: D });
    check("starter library: generates a non-empty list", pubList.items.length > 10);
    check("starter library: every item has a store and section", pubList.items.every(function (i) { return i.store && i.section; }));

  }

  /* ---- report ---- */
  var failed = results.filter(function (r) { return !r.ok; });
  var report = {
    results: results, passed: results.length - failed.length, failed: failed.length,
    text: function () {
      return results.map(function (r) {
        return (r.info ? "INFO " : r.ok ? "PASS " : "FAIL ") + r.name + (r.detail ? "\n    " + r.detail : "");
      }).join("\n") + "\n\n" + (results.length - failed.length) + " passed, " + failed.length + " failed";
    }
  };

  if (typeof module === "object" && module.exports) {
    if (require.main === module) {
      console.log(report.text());
      process.exit(failed.length ? 1 : 0);
    }
    module.exports = report;
  } else {
    root.StoreRunTestReport = report;
  }
})(typeof self !== "undefined" ? self : this);
