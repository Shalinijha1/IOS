// Unit tests for prototype/search-engine.js. Run: node tests/search.test.js
const S = require("../prototype/search-engine.js");
let fails = 0;
const check = (name, ok, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`); if (!ok) fails++; };

const idx = S.createIndex();
idx.add([
  { id: "app:notes", type: "app", title: "Notes" },
  { id: "app:settings", type: "app", title: "Settings" },
  { id: "app:weather", type: "app", title: "Weather" },
  { id: "note:dentist", type: "note", title: "Dr. Patel", body: "Cleaning on Tuesday at 3 pm, bring insurance card" },
  { id: "note:trip", type: "note", title: "Trip checklist", body: "Passport, chargers, the blue jacket" },
  { id: "note:groceries", type: "note", title: "Groceries", body: "Oats, lemons, coffee beans" },
  { id: "set:dark", type: "setting", title: "Dark Mode", keys: ["Appearance", "Display"] },
  { id: "set:glass", type: "setting", title: "Glass material", keys: ["Tint", "Clear"] },
  { id: "act:newnote", type: "action", title: "New note", keys: ["create", "write"] },
]);
const ids = q => idx.search(q).results.map(r => r.entity.id);
const first = q => ids(q)[0];

check("prefix while typing finds the app", first("no") === "app:notes", ids("no").join());
check("exact title wins", first("settings") === "app:settings");
check("meaning: 'dentist' finds a note that never says it", ids("dentist").includes("note:dentist"), ids("dentist").join());
check("meaning result is labelled as such", idx.search("dentist").results.find(r => r.entity.id === "note:dentist").why.join() === "meaning");
check("meaning: 'vacation' finds the trip checklist", first("vacation") === "note:trip");
check("meaning: 'night theme' finds Dark Mode", first("night theme") === "set:dark", ids("night theme").join());
check("typo: 'wether' finds Weather", first("wether") === "app:weather", ids("wether").join());
check("typo: 'grocceries' finds Groceries", first("grocceries") === "note:groceries");
check("keyword in body", first("passport") === "note:trip");
check("indexingKey fields are searchable", first("appearance") === "set:dark");
check("plural and stem folding", first("lemon") === "note:groceries");
check("stop words alone return nothing", ids("the of").length === 0);
check("unrelated query returns nothing", ids("zebra").length === 0, ids("zebra").join());

// index maintenance
idx.add({ id: "note:new", type: "note", title: "Tent repair", body: "Patch kit in the garage" });
check("newly indexed entity is searchable at once", first("tent") === "note:new");
idx.add({ id: "note:new", type: "note", title: "Bike repair", body: "Patch kit in the garage" });
check("re-adding an id updates it", first("tent") !== "note:new" && first("bike") === "note:new");
idx.remove("note:new");
check("removed entity disappears", !ids("bike").includes("note:new"));
const n = idx.size;
idx.reindex([{ id: "x", type: "note", title: "Only" }]);
check("reindex replaces the index", idx.size === 1 && first("only") === "x", `${n} → ${idx.size}`);

// grouping and highlight
idx.reindex([
  { id: "a", type: "app", title: "Music" }, { id: "b", type: "note", title: "Music practice" }, { id: "c", type: "setting", title: "Music volume" },
]);
const g = idx.group(idx.search("music").results, { labels: { note: "Notes" } });
check("group picks a top hit and sections", g.top && g.top.entity.id === "a" && g.sections.length === 2, g.sections.map(s => s.label).join());
check("highlight marks matched words and escapes html", S.highlight("Music <b> practice", ["music"]) === "<mark>Music</mark> &lt;b&gt; practice");

// providers (EntityStringQuery analogue)
idx.addProvider({ name: "Contacts", query: async q => q.startsWith("ma") ? [{ id: "p1", type: "contact", title: "Mara Lind" }] : [] });
idx.addProvider({ name: "Broken", query: async () => { throw new Error("offline"); } });
idx.searchProviders("mara").then(r => {
  check("provider results arrive asynchronously and a failing provider is ignored", r.length === 1 && r[0].provider === "Contacts");
  // speed: 2,000 entities
  const big = S.createIndex();
  big.add(Array.from({ length: 2000 }, (_, i) => ({ id: "n" + i, type: "note", title: `Note ${i} about ${["travel", "food", "music", "money"][i % 4]}`, body: "lorem ".repeat(10) + i })));
  const t = Date.now(); for (let i = 0; i < 20; i++) big.search("music " + i); const per = (Date.now() - t) / 20;
  check("searching 2,000 entities stays under 50 ms per keystroke", per < 50, per.toFixed(1) + " ms");
  console.log(fails ? `\n${fails} failure(s)` : "\nall checks passed"); process.exit(fails ? 1 : 0);
});
