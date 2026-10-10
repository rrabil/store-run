/* Store Run list engine.
 *
 * Turns the recipe library (data/library/*.json or private/data/*.json) plus this
 * week's picks into the same week-list shape the app already displays:
 *   { week, recipeNotes: [{title, text}], items: [{id, name, qty, note, store,
 *     section, flag, include}] }
 *
 * Pure logic, no page access, no network: it runs in the browser and in Node, which
 * is how tests/engine.test.js exercises it. Plain ES5 to match index.html.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.StoreRunEngine = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- units ---------- */

  var VOL = { tsp: 1, tbsp: 3, cup: 48 };     /* in teaspoons */
  var WGT = { oz: 1, lb: 16 };                /* in ounces */

  /* Whole-item units: a merged 1.5 limes or 2.5 cans is bought as 2 / 3. */
  var ROUND_UP = { "": 1, bunch: 1, head: 1, can: 1, jar: 1, box: 1, pack: 1, "family pack": 1,
    packet: 1, package: 1, loaf: 1, carton: 1, container: 1, sprig: 1 };

  var PLURALS = {
    lb: ["lb", "lbs"], cup: ["cup", "cups"], clove: ["clove", "cloves"], can: ["can", "cans"],
    jar: ["jar", "jars"], box: ["box", "boxes"], pack: ["pack", "packs"],
    "family pack": ["family pack", "family packs"], bunch: ["bunch", "bunches"],
    head: ["head", "heads"], packet: ["packet", "packets"], sprig: ["sprig", "sprigs"],
    loaf: ["loaf", "loaves"], carton: ["carton", "cartons"],
    container: ["container", "containers"], package: ["package", "packages"],
    inch: ["inch", "inches"], pinch: ["pinch", "pinches"], handful: ["handful", "handfuls"]
  };

  function unitLabel(unit, n) {
    var p = PLURALS[unit];
    if (!p) return unit;
    return n > 1 + 1e-9 ? p[1] : p[0];
  }

  /* 0.333 -> "1/3", 1.5 -> "1 1/2", 2 -> "2". Falls back to a 2-place decimal. */
  function fmtNum(n) {
    var whole = Math.floor(n + 1e-9);
    var frac = n - whole;
    if (frac < 0.02) return String(whole);
    if (frac > 0.98) return String(whole + 1);
    var dens = [2, 3, 4, 6, 8];
    for (var i = 0; i < dens.length; i++) {
      for (var k = 1; k < dens[i]; k++) {
        if (Math.abs(frac - k / dens[i]) < 0.02) {
          return (whole ? whole + " " : "") + k + "/" + dens[i];
        }
      }
    }
    return String(Math.round(n * 100) / 100);
  }

  function rangeStr(a, b, unit) {
    var u = function (n) { return unit ? " " + unitLabel(unit, n) : ""; };
    if (Math.abs(a - b) < 1e-9) return fmtNum(a) + u(a);
    return fmtNum(a) + "-" + fmtNum(b) + u(b);
  }

  /* "1/4 cup + 2 tbsp" style, from a teaspoon total (used when units were mixed). */
  function fmtVolumeMixed(tsp) {
    var parts = [];
    var quarters = Math.floor(tsp / 12 + 1e-9);
    var rem = tsp - quarters * 12;
    if (quarters) { var c = quarters / 4; parts.push(fmtNum(c) + " " + unitLabel("cup", c)); }
    var tbsp = Math.floor(rem / 3 + 1e-9);
    var t = rem - tbsp * 3;
    if (tbsp) parts.push(fmtNum(tbsp) + " tbsp");
    if (t > 1e-9) parts.push(fmtNum(t) + " tsp");
    return parts.join(" + ");
  }

  /* ---------- dates ---------- */

  /* Fourth Thursday of November. */
  function thanksgiving(year) {
    var firstDow = new Date(year, 10, 1).getDay();
    var firstThu = 1 + ((4 - firstDow + 7) % 7);
    return firstThu + 21;
  }

  function monthDayOrd(m, d) { return m * 100 + d; }

  function inSeason(season, date) {
    var year = date.getFullYear();
    var from = monthDayOrd(season.from.month, season.from.day);
    var until;
    if (season.until === "us-thanksgiving") until = monthDayOrd(11, thanksgiving(year));
    else until = monthDayOrd(season.until.month, season.until.day);
    var today = monthDayOrd(date.getMonth() + 1, date.getDate());
    if (from <= until) return today >= from && today <= until;
    return today >= from || today <= until;   /* window wraps over New Year */
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

  function weekTitle(date) {
    return "Week of " + MONTHS[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
  }

  /* ---------- merging ---------- */

  function nameKey(name, store) {
    return name.toLowerCase().trim().replace(/(es|s)$/, "") + "|" + store;
  }

  function dimOf(unit) {
    if (VOL[unit]) return "vol";
    if (WGT[unit]) return "wgt";
    return "u:" + (unit || "");
  }

  function newEntry(line) {
    return { name: line.name, store: line.store, section: line.section, lines: [],
      groups: {}, groupOrder: [] };
  }

  function addToEntry(entry, line, label) {
    entry.lines.push({ label: label, flag: !!line.flag, optional: !!line.optional, note: line.note || "" });
    if (line.quantity == null) return;
    var dim = dimOf(line.unit);
    var g = entry.groups[dim];
    if (!g) {
      g = entry.groups[dim] = { dim: dim, unit: line.unit || null, min: 0, max: 0, units: {} };
      entry.groupOrder.push(dim);
    }
    var factor = dim === "vol" ? VOL[line.unit] : dim === "wgt" ? WGT[line.unit] : 1;
    var qmax = line.quantityMax != null ? line.quantityMax : line.quantity;
    g.min += line.quantity * factor;
    g.max += qmax * factor;
    g.units[line.unit || ""] = true;
  }

  function renderGroup(g) {
    var units = Object.keys(g.units);
    if (g.dim === "vol") {
      if (units.length === 1) { var f = VOL[units[0]]; return rangeStr(g.min / f, g.max / f, units[0]); }
      if (Math.abs(g.min - g.max) < 1e-9) return fmtVolumeMixed(g.min);
      var u = g.max >= 12 ? "cup" : g.max >= 3 ? "tbsp" : "tsp";
      return rangeStr(g.min / VOL[u], g.max / VOL[u], u);
    }
    if (g.dim === "wgt") {
      if (units.length === 1) { var w = WGT[units[0]]; return rangeStr(g.min / w, g.max / w, units[0]); }
      if (g.max >= 16) return rangeStr(Math.round(g.min / 4) / 4, Math.round(g.max / 4) / 4, "lb");
      return rangeStr(g.min, g.max, "oz");
    }
    var min = g.min, max = g.max;
    if (ROUND_UP[g.unit || ""]) { min = Math.ceil(min - 1e-9); max = Math.ceil(max - 1e-9); }
    return rangeStr(min, max, g.unit);
  }

  function renderQty(entry) {
    var order = [];
    ["vol", "wgt"].forEach(function (d) { if (entry.groups[d]) order.push(d); });
    entry.groupOrder.forEach(function (d) { if (d !== "vol" && d !== "wgt") order.push(d); });
    return order.map(function (d) { return renderGroup(entry.groups[d]); }).join(" + ");
  }

  function entryNote(entry, stockNote) {
    var labels = [];
    entry.lines.forEach(function (l) { if (l.label && labels.indexOf(l.label) === -1) labels.push(l.label); });
    var note;
    if (entry.lines.length === 1) {
      var l = entry.lines[0];
      if (l.label === "staple") note = l.note;
      else note = l.label + (l.note ? " — " + l.note : "");
    } else {
      note = labels.join(", ");
    }
    var allOptional = entry.lines.every(function (l) { return l.optional; });
    if (allOptional) note = "optional" + (note ? " — " + note : "");
    if (stockNote) note = (note ? note + "; " : "") + stockNote;
    return note;
  }

  /* ---------- sorting ---------- */

  function sortItems(items, routing) {
    var storeOrder = routing.storeOrder || [];
    var globalSections = routing.sections || [];
    var perStore = routing.sectionOrderByStore || {};
    function storeIdx(s) { var i = storeOrder.indexOf(s); return i === -1 ? storeOrder.length : i; }
    function secIdx(store, sec) {
      var order = perStore[store] || globalSections;
      var i = order.indexOf(sec);
      return i === -1 ? order.length + globalSections.indexOf(sec) + 1 : i;
    }
    return items.slice().sort(function (a, b) {
      return (storeIdx(a.store) - storeIdx(b.store)) ||
        (secIdx(a.store, a.section) - secIdx(b.store, b.section)) ||
        a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }

  /* ---------- staples ---------- */

  function shortName(name) {
    return name.replace(/\s*\([^)]*\)/g, "").trim();
  }

  /* Questions the picker should ask before generating (biweekly "on" weeks, seasonal). */
  function stapleQuestions(library, date) {
    var out = [];
    (library.staples.staples || []).forEach(function (s) {
      if (s.frequency === "biweekly") {
        out.push({ name: s.name, type: "biweekly", note: s.note || "" });
      } else if (s.season) {
        out.push({ name: s.name, type: "seasonal", inSeason: inSeason(s.season, date), note: s.note || "" });
      }
    });
    return out;
  }

  function selectStaples(staples, date, options) {
    var chosen = [], skipped = [];
    var skip = options.skipStaples || [];
    var onWeek = options.onWeek || {};
    var seasonOverride = options.seasonOverride || {};
    (staples.staples || []).forEach(function (s) {
      var reason = null;
      if (skip.indexOf(s.name) !== -1) reason = "skipped this week";
      else if (s.frequency === "biweekly" && !onWeek[s.name]) reason = "off week";
      else if (s.season) {
        var on = seasonOverride.hasOwnProperty(s.name) ? seasonOverride[s.name] : inSeason(s.season, date);
        if (!on) reason = "out of season";
      }
      if (reason) skipped.push({ name: s.name, reason: reason });
      else chosen.push(s);
    });
    return { chosen: chosen, skipped: skipped };
  }

  /* ---------- generate ---------- */

  /* picks:   [{ id, batch (default 1), includeOptional (default true) }]
   * options: { date, weekTitle, onWeek: {name: bool}, skipStaples: [name],
   *            seasonOverride: {name: bool} }
   */
  function generate(library, picks, options) {
    options = options || {};
    var date = options.date || new Date();
    var routing = library.routing || {};
    var byId = {};
    library.recipes.recipes.forEach(function (r) { byId[r.id] = r; });

    var entries = {}, order = [];
    function put(line, label) {
      var key = nameKey(line.name, line.store);
      if (!entries[key]) { entries[key] = newEntry(line); order.push(key); }
      addToEntry(entries[key], line, label);
    }

    var notes = [];
    (picks || []).forEach(function (pick) {
      var r = byId[pick.id];
      if (!r) throw new Error("Unknown recipe id: " + pick.id);
      var batch = pick.batch || 1;
      var includeOptional = pick.includeOptional !== false;
      var label = shortName(r.name);
      var onHand = [];
      r.ingredients.forEach(function (g) {
        if (g.onHand) { onHand.push(g.name); return; }
        if (g.optional && !includeOptional) return;
        var scale = g.scales && batch !== 1 ? batch : 1;
        put({
          name: g.name,
          quantity: g.quantity == null ? null : g.quantity * scale,
          quantityMax: g.quantityMax == null ? null : g.quantityMax * scale,
          unit: g.unit, store: g.store, section: g.section,
          flag: g.flag, optional: g.optional, note: g.note
        }, label);
      });

      var bits = [];
      if (batch !== 1) bits.push("Batch " + fmtNum(batch) + "x.");
      if (typeof r.servings === "number") {
        bits.push("Buying for " + fmtNum(r.servings * batch) + " servings.");
      } else if (r.servingsText) {
        bits.push("Servings: " + r.servingsText + ".");
      }
      if (r.exclusions && r.exclusions.length) bits.push("Skipping: " + r.exclusions.join("; ") + ".");
      if (r.substitutions && r.substitutions.length) {
        bits.push("Swaps: " + r.substitutions.map(function (s) { return s.from + " → " + s.to; }).join("; ") + ".");
      }
      if (onHand.length) bits.push("On hand, not listed: " + onHand.join(", ") + ".");
      (r.notes || []).forEach(function (n) { bits.push(n); });
      notes.push({ title: label, text: bits.join(" ") });
    });

    var sel = selectStaples(library.staples, date, options);
    sel.chosen.forEach(function (s) {
      put({
        name: s.name, quantity: s.quantity == null ? null : s.quantity,
        quantityMax: s.quantityMax == null ? null : s.quantityMax, unit: s.unit || null,
        store: s.store, section: s.section, flag: !!s.checkPantry, optional: false, note: s.note || ""
      }, "staple");
    });

    var stock = {};
    Object.keys(routing.checkStockNotes || {}).forEach(function (k) {
      stock[k.toLowerCase()] = routing.checkStockNotes[k];
    });

    var items = order.map(function (key) {
      var e = entries[key];
      var stockNote = stock[e.name.toLowerCase()] || "";
      var flag = e.lines.every(function (l) { return l.flag; }) || !!stockNote;
      return { id: "", name: e.name, qty: renderQty(e), note: entryNote(e, stockNote),
        store: e.store, section: e.section, flag: flag, include: true };
    });
    items = sortItems(items, routing);
    items.forEach(function (it, i) { it.id = "g" + (i < 9 ? "0" : "") + (i + 1); });

    var staplesNote = [];
    sel.chosen.forEach(function (s) {
      if (s.frequency === "biweekly") staplesNote.push(s.name + ": on week");
      else if (s.season) staplesNote.push(s.name + ": included (in season)");
      else if (s.checkPantry) staplesNote.push(s.name + ": check pantry");
    });
    sel.skipped.forEach(function (s) { staplesNote.push(s.name + ": " + s.reason); });
    if (staplesNote.length) notes.push({ title: "Staples", text: staplesNote.join(". ") + "." });

    return {
      week: options.weekTitle || weekTitle(date),
      recipeNotes: notes,
      items: items
    };
  }

  return {
    generate: generate,
    stapleQuestions: stapleQuestions,
    thanksgiving: thanksgiving,
    inSeason: inSeason,
    weekTitle: weekTitle,
    fmtNum: fmtNum
  };
});
