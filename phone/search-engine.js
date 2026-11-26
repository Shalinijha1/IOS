/*
 * Glassline search engine: a small model of the iOS 27 search pipeline.
 *
 *   iOS 27 concept (WWDC26 sessions 240 / 343)      This module
 *   -------------------------------------------     ------------------------------------------
 *   IndexedEntity + indexingKey properties          index.add(entity) with `keys` = searchable fields
 *   CSSearchableIndex.indexAppEntities([...])       index.add([...]); index.remove(ids)
 *   IndexedEntityQuery (reindex on request)         index.reindex(source)
 *   Semantic index ("match based on meaning")       concept vectors from a built-in lexicon (stand-in
 *                                                   for a learned embedding model; deterministic)
 *   EntityStringQuery (app does its own matching)   index.addProvider({ name, query: async q => [...] })
 *   App intents surfacing in Spotlight              entities of type "action"
 *   DisplayRepresentation / attribution             every result carries title, subtitle, source
 *
 * Retrieval is hybrid: three independent rankers (keyword, meaning, typo-tolerant) are merged with
 * Reciprocal Rank Fusion. Every result records which rankers found it, so the ranking is explainable.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GlasslineSearch = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- text processing ---------- */
  const STOP = new Set("a an the of to for in on at and or my me i is are was be with from by it this that what whats where when how do does can you your our any show find search".split(" "));
  function fold(s) { return String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function stem(t) {
    if (t.length > 5 && t.endsWith("ing")) return t.slice(0, -3);
    if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
    if (t.length > 4 && t.endsWith("es") && /(sh|ch|x|z|ss)es$/.test(t)) return t.slice(0, -2);
    if (t.length > 4 && t.endsWith("ed") && !t.endsWith("eed")) return t.slice(0, -2);
    if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
    return t;
  }
  function tokens(s, { keepStop = false } = {}) {
    return fold(s).split(/[^a-z0-9]+/).filter(t => t && (keepStop || !STOP.has(t))).map(stem);
  }
  function trigrams(t) { const s = `  ${t} `; const out = new Set(); for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3)); return out; }
  function dice(a, b) { let n = 0; for (const g of a) if (b.has(g)) n++; return (2 * n) / (a.size + b.size || 1); }

  /* ---------- meaning: concept lexicon ---------- */
  // Each line is one concept: words that people use interchangeably when searching. A real system learns
  // this from data (an embedding model); a lexicon keeps the behaviour inspectable and testable.
  const CONCEPTS = {
    dental: "dentist dental tooth teeth hygienist orthodontist cleaning filling",
    medical: "doctor clinic appointment checkup gp physician prescription pharmacy health",
    travel: "trip travel flight passport vacation holiday packing luggage suitcase airport hotel boarding",
    food: "grocery groceries recipe dinner lunch breakfast cook cooking meal eat restaurant food soup oats coffee",
    money: "budget rent pay payment invoice bank money expense receipt bill ledger cost",
    fitness: "workout run running gym exercise interval training fitness cardio",
    music: "song music playlist speaker audio album track listen",
    weather: "rain umbrella forecast storm weather temperature sunny wind",
    appearance: "dark light appearance theme mode night brightness display screen",
    network: "wifi wi fi internet network bluetooth connection wireless airplane",
    meeting: "meeting review standup call agenda sync design minutes",
    gift: "gift present birthday anniversary wishlist",
    reading: "book books essay article read reading library novel",
    outdoors: "tent stove headlamp hike hiking camping camp outdoors trail",
    photo: "photo picture gallery image camera selfie album",
    motion: "animation spring motion transition curve damping response",
    files: "file upload document download folder pdf mov",
    time: "clock alarm timer stopwatch",
    message: "message text chat sms reply conversation",
    glass: "glass material blur tint translucent transparency clear frosted",
    accessibility: "accessibility reduce motion larger text contrast",
    notification: "notification alert summary summarize",
    map: "map maps direction route navigate location",
  };
  const conceptOf = new Map();
  for (const [c, words] of Object.entries(CONCEPTS)) for (const w of tokens(words, { keepStop: true })) {
    if (!conceptOf.has(w)) conceptOf.set(w, new Set());
    conceptOf.get(w).add(c);
  }
  function concepts(toks) { const out = new Set(); for (const t of toks) for (const c of conceptOf.get(t) || []) out.add(c); return out; }

  /* ---------- the index ---------- */
  const FIELD_WEIGHT = { title: 3, keys: 1.5, body: 1 };
  const TYPE_PRIOR = { app: 0.012, action: 0.006, setting: 0.004, note: 0.002, notification: 0, contact: 0 };

  function createIndex() {
    const docs = new Map();     // id -> prepared document
    const df = new Map();       // token -> document frequency
    const providers = [];
    let generation = 0;

    function prepare(e) {
      const f = { title: tokens(e.title), keys: tokens((e.keys || []).join(" ")), body: tokens(e.body) };
      const all = [...f.title, ...f.keys, ...f.body];
      return {
        entity: e, fields: f, tokenSet: new Set(all),
        grams: [...new Set([...f.title, ...f.keys])].filter(t => t.length >= 3).map(t => ({ t, g: trigrams(t) })),
        concepts: concepts(all), titleFold: fold(e.title),
      };
    }
    function add(list) {
      for (const e of [].concat(list)) {
        if (!e || !e.id) throw new Error("entity needs an id");
        if (docs.has(e.id)) remove(e.id);
        const d = prepare(e); docs.set(e.id, d);
        for (const t of d.tokenSet) df.set(t, (df.get(t) || 0) + 1);
      }
      generation++;
    }
    function remove(ids) {
      for (const id of [].concat(ids)) {
        const d = docs.get(id); if (!d) continue;
        for (const t of d.tokenSet) { const n = df.get(t) - 1; if (n > 0) df.set(t, n); else df.delete(t); }
        docs.delete(id);
      }
      generation++;
    }
    function reindex(entities) { docs.clear(); df.clear(); add(entities); }
    function idf(t) { return Math.log(1 + (docs.size + 1) / ((df.get(t) || 0) + 0.5)); }

    /* ranker 1: keywords (field-weighted, prefix-aware on the token being typed) */
    function keyword(q, d) {
      if (!q.toks.length) return 0;
      let score = 0, hit = 0;
      q.toks.forEach((qt, i) => {
        const last = i === q.toks.length - 1;
        let best = 0;
        for (const [field, w] of Object.entries(FIELD_WEIGHT)) for (const t of d.fields[field]) {
          let s = 0;
          if (t === qt) s = 1;
          else if ((last || qt.length >= 3) && qt.length >= 1 && t.startsWith(qt)) s = 0.75 * Math.min(1, qt.length / t.length + 0.3);
          if (s) best = Math.max(best, s * w * idf(t));
        }
        if (best) { hit++; score += best; }
      });
      const coverage = hit / q.toks.length;
      if (d.titleFold.startsWith(q.fold)) score += 2;
      return coverage < 1 ? score * coverage * coverage * 0.5 : score;
    }
    /* ranker 2: meaning (cosine between concept sets) */
    function meaning(q, d) {
      if (!q.concepts.size || !d.concepts.size) return 0;
      let n = 0; for (const c of q.concepts) if (d.concepts.has(c)) n++;
      return n / Math.sqrt(q.concepts.size * d.concepts.size);
    }
    /* ranker 3: typos (trigram similarity of each query word to the closest title/key word) */
    function typo(q, d) {
      const qs = q.grams; if (!qs.length) return 0;
      let total = 0;
      for (const { t: qt, g } of qs) {
        let best = 0;
        for (const { t, g: dg } of d.grams) if (t !== qt) best = Math.max(best, dice(g, dg));
        if (best < 0.45) return 0; // every typed word must be close to something
        total += best;
      }
      return total / qs.length;
    }

    function prepareQuery(text) {
      const toks = tokens(text);
      return { text, fold: fold(text).trim(), toks, concepts: concepts(toks),
        grams: toks.filter(t => t.length >= 4).map(t => ({ t, g: trigrams(t) })) };
    }

    function search(text, { limit = 30, k = 10 } = {}) {
      const t0 = (typeof performance !== "undefined" ? performance : Date).now();
      const q = prepareQuery(text);
      if (!q.fold) return { query: text, results: [], ms: 0, generation };
      const rankers = { keyword, meaning, typo };
      const lists = {};
      for (const [name, fn] of Object.entries(rankers)) {
        lists[name] = [];
        for (const d of docs.values()) { const s = fn(q, d); if (s > 0) lists[name].push([d, s]); }
        lists[name].sort((a, b) => b[1] - a[1]);
      }
      // Reciprocal Rank Fusion: each ranker votes 1/(k + rank). Keyword hits are trusted most.
      const W = { keyword: 1, meaning: 0.8, typo: 0.6 };
      const fused = new Map();
      for (const [name, list] of Object.entries(lists)) list.forEach(([d, s], rank) => {
        const r = fused.get(d.entity.id) || { entity: d.entity, score: TYPE_PRIOR[d.entity.type] || 0, why: [], scores: {} };
        r.score += W[name] / (k + rank + 1);
        r.why.push(name); r.scores[name] = +s.toFixed(4); r.ranks = { ...(r.ranks || {}), [name]: rank + 1 };
        fused.set(d.entity.id, r);
      });
      const results = [...fused.values()].sort((a, b) => b.score - a.score).slice(0, limit);
      results.forEach(r => { r.score = +r.score.toFixed(5); r.highlight = q.toks; });
      const ms = (typeof performance !== "undefined" ? performance : Date).now() - t0;
      return { query: text, results, ms, generation, concepts: [...q.concepts] };
    }

    /* EntityStringQuery analogue: content that is not indexed ahead of time; the provider does its own matching. */
    function addProvider(p) { providers.push(p); }
    async function searchProviders(text) {
      const out = await Promise.all(providers.map(async p => {
        try { return (await p.query(text)).map(e => ({ entity: e, score: 0, why: ["provider"], provider: p.name })); }
        catch (err) { return []; }
      }));
      return out.flat();
    }

    /* Group for display: a top hit, then sections ordered by their best result. */
    function group(results, { labels = {} } = {}) {
      if (!results.length) return { top: null, sections: [] };
      const [first, second] = results;
      const top = (!second || first.score >= second.score * 1.15 || first.why.includes("keyword")) ? first : null;
      const sections = new Map();
      for (const r of results) {
        if (r === top) continue;
        const key = r.entity.type;
        if (!sections.has(key)) sections.set(key, { type: key, label: labels[key] || key, best: r.score, items: [] });
        sections.get(key).items.push(r);
      }
      return { top, sections: [...sections.values()].sort((a, b) => b.best - a.best) };
    }

    return {
      add, remove, reindex, search, group, addProvider, searchProviders,
      get size() { return docs.size; }, get terms() { return df.size; }, get generation() { return generation; },
    };
  }

  /* Wrap matched words in <mark>; input is escaped first. */
  function highlight(text, qtoks) {
    const esc = String(text).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    if (!qtoks || !qtoks.length) return esc;
    return esc.replace(/[A-Za-z0-9À-ɏ]+/g, w => {
      const t = stem(fold(w));
      return qtoks.some(q => q.length >= 1 && (t === q || t.startsWith(q))) ? `<mark>${w}</mark>` : w;
    });
  }

  return { createIndex, tokens, concepts, highlight, CONCEPTS };
});
