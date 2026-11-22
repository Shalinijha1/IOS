/* Glassline OS: more built-in apps. Shortcuts, Screen Time, Journal, Freeform, Find My, Home. Original code. */
(function () {
"use strict";
const O = window.GOS, { h, sys, esc, track } = O, T = O.tools;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/* ======================================================================== */
/* Shortcuts: each shortcut is a list of plain-language steps that the      */
/* assistant's intent parser runs in order, so they do real things.         */
/* ======================================================================== */
const SC = O.appStore("shortcuts");
const DEFAULT_SHORTCUTS = [
  { id: "s1", name: "Good Morning", color: "#ff9f0a", steps: ["turn on light mode", "set brightness to 90%", "what's the weather", "play music"] },
  { id: "s2", name: "Focus Sprint", color: "#5e5ce6", steps: ["turn on do not disturb", "set a timer for 25 minutes"] },
  { id: "s3", name: "Bedtime", color: "#30b0c7", steps: ["turn on dark mode", "set brightness to 30%", "pause music", "standby"] },
  { id: "s4", name: "Quick Note", color: "#ffd60a", steps: ["new note"] },
];
const shortcuts = () => SC.get("list", DEFAULT_SHORTCUTS);
async function runShortcut(sc) {
  O.toast(`Running ${sc.name}…`);
  const log = [];
  for (const step of sc.steps) {
    const it = O.matchIntent(step);
    if (!it) { log.push(`✕ ${step}: not understood`); continue; }
    try { O.runIntent(it); log.push(`✓ ${it.describe}`); } catch (e) { log.push(`✕ ${step}: ${e.message}`); }
    await O.sleep(350);
  }
  const runs = SC.get("runs", []); runs.unshift({ id: sc.id, name: sc.name, t: Date.now(), log }); SC.set("runs", runs.slice(0, 30));
  return log;
}
O.on("run-shortcut", name => { const sc = shortcuts().find(s => s.name.toLowerCase() === String(name).toLowerCase().trim()); if (sc) runShortcut(sc); else O.toast(`No shortcut named “${name}”`); });
O.registerApp({ id: "shortcuts", name: "Shortcuts", bg: "linear-gradient(135deg,#ff5e7e,#5e5ce6 55%,#30b0c7)", glyph: '<path d="M6 9.5 12 6l6 3.5-6 3.5z" fill="#fff" stroke="none" opacity=".95"/><path d="M6 14.5 12 11l6 3.5-6 3.5z" fill="#fff" stroke="none" opacity=".65"/>', category: "Productivity", keywords: "automation workflow routine macro",
  render(ctx) {
    const stack = ctx.stack();
    const grid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "0 16px 120px" } });
    const draw = () => { grid.innerHTML = ""; shortcuts().forEach(sc => {
      const tile = h("button", { dataset: { entity: "shortcut", title: sc.name }, "aria-label": "Run " + sc.name, style: { background: sc.color, color: "#fff", borderRadius: "18px", padding: "14px", minHeight: "110px", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "space-between" },
        onclick: async () => { tile.style.transform = "scale(.95)"; const log = await runShortcut(sc); tile.style.transform = ""; O.toast(`${sc.name}: ${log.filter(l => l[0] === "✓").length}/${sc.steps.length} steps done`); } },
        h("span", { html: sys("sparkle"), style: { width: "22px", height: "22px" } }), h("div", h("div", { style: { fontWeight: 600, fontSize: "17px" } }, sc.name), h("div", { style: { fontSize: "13px", opacity: .85 } }, `${sc.steps.length} action${sc.steps.length > 1 ? "s" : ""}`)));
      let lt; tile.addEventListener("pointerdown", () => { lt = setTimeout(() => detail(sc), 550); }); ["pointerup", "pointerleave"].forEach(ev => tile.addEventListener(ev, () => clearTimeout(lt)));
      grid.append(tile); }); };
    function detail(sc) {
      stack.push(() => ({ title: sc.name, back: "Shortcuts", right: h("button.btn", { onclick: () => runShortcut(sc) }, "Run"),
        body: h("div", T.hdr("Actions"), T.list(...sc.steps.map((s, i) => T.row({ title: s, sub: (O.matchIntent(s) || { describe: "Not understood: rephrase it" }).describe, val: String(i + 1) }))),
          T.list(T.row({ title: "Edit Actions", onclick: () => edit(sc) }), T.row({ title: h("span", { style: { color: "var(--red)" } }, "Delete Shortcut"), onclick: () => { SC.set("list", shortcuts().filter(x => x.id !== sc.id)); draw(); stack.pop(); } }))) }));
    }
    async function edit(sc) {
      const fresh = !sc; sc = sc || { id: T.uid(), name: "", color: ["#ff9f0a", "#5e5ce6", "#30d158", "#ff375f", "#0066cc"][shortcuts().length % 5], steps: [] };
      const name = await O.prompt("Shortcut name", sc.name, "e.g. Leaving Home"); if (!name) return;
      const steps = await O.prompt("Actions, separated by semicolons", sc.steps.join("; "), "turn off wifi; set a timer for 10 minutes"); if (!steps) return;
      sc.name = name.trim(); sc.steps = steps.split(";").map(s => s.trim()).filter(Boolean);
      const list = shortcuts().filter(x => x.id !== sc.id); list.push(sc); SC.set("list", list); draw(); if (!fresh) { stack.pop(); }
    }
    draw();
    stack.push(() => ({ title: "Shortcuts", right: T.plusBtn(() => edit(null), "plus", "New Shortcut"), body: h("div", h("p.sub", { style: { padding: "0 16px", color: "var(--ink3)", margin: "0 0 12px" } }, "Tap to run. Press and hold to see or edit the actions. Actions are plain sentences, the same ones the assistant understands."), grid) }));
  } });

/* ======================================================================== */
/* Screen Time: measured from real use of this phone (seconds per app)      */
/* ======================================================================== */
const ST = O.appStore("screentime");
const usage = ST.get("usage", {});
let pending = 0;
O.on("tick", () => {
  if (!O.state.awake || O.state.locked) return;
  const k = dayKey(), app = O.state.front || "home";
  usage[k] = usage[k] || {}; usage[k][app] = (usage[k][app] || 0) + 1;
  if (++pending >= 15) { pending = 0; ST.set("usage", usage); }
});
const bump = key => { const c = ST.get("counts", {}); const k = dayKey(); c[k] = c[k] || { pickups: 0, notifications: 0 }; c[k][key]++; ST.set("counts", c); };
O.on("unlock", () => bump("pickups"));
O.on("notification", () => bump("notifications"));
const fmtMin = s => s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${Math.floor(s / 3600)}h ${Math.round(s % 3600 / 60)}m`;
O.registerApp({ id: "screentime", name: "Screen Time", bg: "linear-gradient(#7d7aff,#5e5ce6)", glyph: '<path d="M12 4a8 8 0 1 0 8 8" stroke-width="2" stroke-linecap="round"/><path d="M12 4a8 8 0 0 1 8 8h-8z" fill="#fff" stroke="none"/>', category: "Utilities", keywords: "usage time apps limits digital wellbeing",
  render(ctx) {
    const body = h("div");
    const draw = () => {
      ST.set("usage", usage); pending = 0;
      const k = dayKey(), today = usage[k] || {}, total = Object.values(today).reduce((a, b) => a + b, 0);
      const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const u = usage[dayKey(d)] || {}; return { d, s: Object.values(u).reduce((a, b) => a + b, 0) }; });
      const max = Math.max(60, ...days.map(x => x.s)); const c = (ST.get("counts", {})[k]) || { pickups: 0, notifications: 0 };
      const limits = ST.get("limits", {});
      body.innerHTML = "";
      body.append(T.hdr("Today"), h("div.list", { style: { padding: "14px 16px" } },
        h("div", { style: { fontSize: "34px", fontWeight: 600, letterSpacing: "-0.374px" }, dataset: { entity: "metric", title: "Screen time today " + fmtMin(total) } }, fmtMin(total)),
        h("div.sub", { style: { color: "var(--ink3)" } }, "Measured while this phone is unlocked and open"),
        h("div", { style: { display: "flex", alignItems: "flex-end", gap: "8px", height: "110px", marginTop: "14px" } }, ...days.map(x => h("div", { style: { flex: 1, textAlign: "center", fontSize: "11px", color: "var(--ink3)" } },
          h("div", { style: { height: Math.max(2, x.s / max * 86) + "px", background: x.d.toDateString() === new Date().toDateString() ? "var(--accent)" : "var(--fill)", borderRadius: "5px", marginBottom: "4px" } }), x.d.toLocaleDateString(undefined, { weekday: "narrow" }))))),
        T.list(T.row({ title: "Pickups (unlocks)", val: String(c.pickups) }), T.row({ title: "Notifications", val: String(c.notifications) })),
        T.hdr("Most Used Today"),
        Object.keys(today).length ? T.list(...Object.entries(today).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id, s]) => { const a = O.apps[id];
          const r = T.row({ title: a ? a.name : "Home Screen", sub: limits[id] ? `Limit ${limits[id]} min` : null, val: fmtMin(s), entity: "usage", onclick: () => a && setLimit(id) });
          r.prepend(a ? O.iconEl(a, { size: 30 }) : h("div.sicon", { style: { background: "#8e8e93" }, html: sys("home") })); return r; })) : h("div.empty", "No usage yet today. Open a few apps and come back."),
        h("div.list-f", { style: { marginTop: "0" } }, "Tap an app to set a daily limit. When you reach it, you get a notification."));
    };
    async function setLimit(id) { const v = await O.prompt(`Daily limit for ${O.apps[id].name} (minutes, empty to remove)`, String(ST.get("limits", {})[id] || "")); if (v === null) return; const l = ST.get("limits", {}); if (+v > 0) l[id] = +v; else delete l[id]; ST.set("limits", l); draw(); }
    ctx.stack().push(() => ({ title: "Screen Time", body }));
    draw(); ctx.onShow(draw);
  } });
// daily limits: one notification when an app passes its limit
const warned = {};
O.on("tick", () => { const id = O.state.front; if (!id) return; const lim = (ST.get("limits", {}))[id]; if (!lim) return; const used = ((usage[dayKey()] || {})[id] || 0) / 60;
  const key = dayKey() + id; if (used >= lim && !warned[key]) { warned[key] = true; O.notify({ app: "screentime", title: "Time Limit", body: `You've reached your ${lim}-minute limit for ${O.apps[id].name} today.`, force: true }); } });

/* ======================================================================== */
/* Journal                                                                   */
/* ======================================================================== */
const PROMPTS = ["What made you smile today?", "What's one thing you learned this week?", "Who are you grateful for, and why?", "Describe a small win from today.", "What would make tomorrow great?", "Where did you feel most like yourself recently?"];
O.registerApp({ id: "journal", name: "Journal", bg: "linear-gradient(135deg,#ffb1a8,#c77dff)", glyph: '<rect x="5" y="3.5" width="14" height="17" rx="2.5" fill="#fff" stroke="none"/><path d="M9 3.5v17" stroke="#c77dff" stroke-width="1.6"/><path d="M11.5 8.5h5M11.5 11.5h5" stroke="#d9c2ff" stroke-width="1.2"/>', category: "Productivity", keywords: "diary reflect write mood",
  render(ctx) {
    const st = ctx.store, stack = ctx.stack();
    const entries = () => st.get("entries", []);
    const body = h("div");
    const draw = () => { body.innerHTML = ""; const e = entries();
      const p = PROMPTS[new Date().getDate() % PROMPTS.length];
      body.append(h("button", { style: { display: "block", width: "calc(100% - 32px)", margin: "0 16px 18px", textAlign: "left", borderRadius: "18px", padding: "16px", background: "linear-gradient(135deg,#ffb1a8,#c77dff)", color: "#fff" }, onclick: () => write(null, p) },
        h("div", { style: { fontSize: "12px", fontWeight: 600, opacity: .9 } }, "REFLECTION"), h("div", { style: { fontSize: "21px", fontWeight: 600, letterSpacing: "-0.2px", marginTop: "4px" } }, p), h("div", { style: { fontSize: "14px", marginTop: "10px", opacity: .9 } }, "Tap to write")));
      if (!e.length) body.append(h("div.empty", "No entries yet. Start with today's reflection or tap +."));
      e.forEach(x => { const card = h("div.list", { style: { padding: "14px 16px", cursor: "pointer" }, dataset: { entity: "journal entry", title: x.text.slice(0, 40) }, onclick: () => write(x) },
        h("div.sub", { style: { color: "var(--ink3)", fontSize: "13px" } }, new Date(x.t).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) + (x.mood ? " · " + x.mood : "")),
        x.prompt ? h("div", { style: { fontWeight: 600, marginTop: "4px" } }, x.prompt) : null, h("div", { style: { marginTop: "4px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" } }, x.text)); body.append(card); }); };
    function write(x, prompt) {
      x = x || { id: T.uid(), t: Date.now(), text: "", prompt: prompt || "", mood: "" };
      const ta = h("textarea", { value: x.text, placeholder: prompt ? "Write your answer…" : "Start writing…", "aria-label": "Journal entry", style: { width: "100%", minHeight: "360px", border: 0, outline: 0, background: "none", resize: "none", fontSize: "17px", lineHeight: 1.47, padding: "8px 16px" } });
      const save = () => { if (!ta.value.trim()) return; x.text = ta.value; const all = entries().filter(y => y.id !== x.id); all.unshift(x); all.sort((a, b) => b.t - a.t); st.set("entries", all); };
      const mood = h("div", { style: { display: "flex", gap: "8px", padding: "0 16px 8px", flexWrap: "wrap" } }, ...["Great", "Good", "Okay", "Low"].map(m => h("button.pill-btn.grey" + (x.mood === m ? "" : ""), { style: { fontSize: "13px", minHeight: "32px", outline: x.mood === m ? "2px solid var(--accent)" : "" }, onclick: e => { x.mood = m; $$("button", mood).forEach(b => b.style.outline = ""); e.currentTarget.style.outline = "2px solid var(--accent)"; } }, m)));
      stack.push(() => ({ title: "", large: false, back: "Journal", right: h("button.btn", { style: { fontWeight: 600 }, onclick: () => { save(); stack.pop(); } }, "Done"),
        body: h("div", prompt || x.prompt ? h("div", { style: { padding: "0 16px", fontWeight: 600, fontSize: "20px" } }, prompt || x.prompt) : null, mood, ta,
          h("div", { style: { padding: "0 16px" } }, h("button.btn", { style: { color: "var(--red)" }, onclick: () => { st.set("entries", entries().filter(y => y.id !== x.id)); stack.pop(); } }, "Delete Entry"))), onReturn: draw }));
      setTimeout(() => ta.focus(), 400);
    }
    draw();
    stack.push(() => ({ title: "Journal", right: T.plusBtn(() => write(null), "plus", "New Entry"), body, onReturn: draw }));
  } });

/* ======================================================================== */
/* Freeform: a board of movable sticky notes and shapes                      */
/* ======================================================================== */
O.registerApp({ id: "freeform", name: "Freeform", bg: "#fff", glyph: '<path d="M4 17c3-9 6-9 8-4s5 5 8-4" stroke="#0066cc" stroke-width="2" stroke-linecap="round" fill="none"/><rect x="13.5" y="4" width="6" height="6" rx="1.2" fill="#ffd60a" stroke="none"/>', category: "Creativity", keywords: "whiteboard board brainstorm sticky notes canvas",
  render(ctx) {
    const st = ctx.store; const items = () => st.get("items", [{ id: "i1", kind: "note", x: 40, y: 60, text: "Weekend plan", color: "#ffd60a" }, { id: "i2", kind: "note", x: 200, y: 160, text: "Book table for Friday", color: "#a0e7a0" }]);
    const board = h("div", { style: { position: "absolute", inset: "100px 0 0 0", backgroundColor: "var(--card)", backgroundImage: "radial-gradient(var(--sep) 1px, transparent 1px)", backgroundSize: "22px 22px", overflow: "hidden", touchAction: "none" } });
    const save = list => st.set("items", list);
    const draw = () => { board.innerHTML = ""; items().forEach(it => {
      const el = h("div", { dataset: { entity: "board item", title: it.text || it.kind }, style: { position: "absolute", left: it.x + "px", top: it.y + "px", width: it.kind === "circle" ? "110px" : "140px", height: it.kind === "circle" ? "110px" : "120px", borderRadius: it.kind === "circle" ? "50%" : "6px", background: it.color, color: "#1d1d1f",
        padding: "12px", fontSize: "15px", boxShadow: "0 2px 8px rgba(0,0,0,.15)", cursor: "grab", display: "flex", alignItems: it.kind === "circle" ? "center" : "flex-start", justifyContent: it.kind === "circle" ? "center" : "flex-start", textAlign: it.kind === "circle" ? "center" : "left", overflow: "hidden", wordBreak: "break-word" } }, it.text);
      el.addEventListener("pointerdown", e => { e.stopPropagation(); const x0 = it.x, y0 = it.y; track(e, { move(dx, dy) { el.style.left = x0 + dx + "px"; el.style.top = y0 + dy + "px"; },
        end(dx, dy, vx, vy, info) { if (!info.moved) return O.sheet({ title: it.text || "Item", actions: [{ label: "Edit Text", run: () => O.prompt("Text", it.text).then(v => { if (v != null) { const l = items(); l.find(y => y.id === it.id).text = v; save(l); draw(); } }) }, { label: "Change Colour", run: () => { const cs = ["#ffd60a", "#a0e7a0", "#9fd3ff", "#ffb1a8", "#d9c2ff"]; const l = items(); const y = l.find(z => z.id === it.id); y.color = cs[(cs.indexOf(y.color) + 1) % cs.length]; save(l); draw(); } }, { label: "Delete", red: true, run: () => { save(items().filter(y => y.id !== it.id)); draw(); } }] });
          const l = items(); const y = l.find(z => z.id === it.id); y.x = Math.max(0, x0 + dx); y.y = Math.max(0, y0 + dy); save(l); } }); });
      board.append(el); }); };
    const add = kind => { const l = items(); l.push({ id: T.uid(), kind, x: 60 + Math.random() * 150, y: 60 + Math.random() * 250, text: kind === "note" ? "New note" : "", color: kind === "note" ? "#ffd60a" : "#9fd3ff" }); save(l); draw(); };
    ctx.el.append(h("div", { style: { padding: "54px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" } }, h("h1", { style: { margin: 0, fontSize: "28px", fontWeight: 600, letterSpacing: "-0.374px" } }, "Board"),
      h("div.grp", h("button.pill-btn.grey", { style: { minHeight: "36px" }, onclick: () => add("note") }, "Sticky Note"), h("button.pill-btn.grey", { style: { minHeight: "36px" }, onclick: () => add("circle") }, "Shape"))), board);
    draw();
  } });

/* ======================================================================== */
/* Find My: this phone's real location (with permission); other devices are */
/* clearly marked as examples                                                */
/* ======================================================================== */
O.registerApp({ id: "findmy", name: "Find My", bg: "linear-gradient(#5ee07a,#30b35a)", glyph: '<circle cx="12" cy="12" r="8" stroke-width="1.6"/><circle cx="12" cy="12" r="4.5" stroke-width="1.6"/><circle cx="12" cy="12" r="1.6" fill="#fff" stroke="none"/>', category: "Utilities", keywords: "locate lost device location",
  render(ctx) {
    const map = h("iframe", { title: "Map", style: { position: "absolute", inset: 0, width: "100%", height: "58%", border: 0, background: "var(--fill)" }, referrerpolicy: "no-referrer" });
    const status = h("div.sub", { style: { color: "var(--ink3)" } }, "Tap Locate to show this phone on the map.");
    const show = (lat, lon) => { map.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - .01},${lat - .008},${lon + .01},${lat + .008}&layer=mapnik&marker=${lat},${lon}`; };
    const locate = () => { if (!navigator.geolocation) return status.textContent = "Location isn't available in this browser.";
      status.textContent = "Locating…"; navigator.geolocation.getCurrentPosition(p => { show(p.coords.latitude, p.coords.longitude); status.textContent = `Located ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · accurate to ${Math.round(p.coords.accuracy)} m`; },
        e => { status.textContent = e.code === 1 ? "Location access is off. Allow it in your browser's site settings." : "Couldn't get a location. Try again."; }, { enableHighAccuracy: true, timeout: 10000 }); };
    const sheetEl = h("div.glass", { style: { position: "absolute", left: 0, right: 0, bottom: 0, top: "54%", borderRadius: "30px 30px 0 0", padding: "16px 16px 40px", overflowY: "auto" } },
      h("div", { style: { fontSize: "24px", fontWeight: 600, letterSpacing: "-0.374px", marginBottom: "10px" } }, "Devices"),
      T.list(T.row({ title: h("b", "This Phone"), sub: status, entity: "device" }),
        T.row({ title: "Locate", onclick: locate }), T.row({ title: "Play Sound", onclick: () => { for (let i = 0; i < 4; i++) setTimeout(() => O.tone([[1568, .18], [2093, .22]], { gain: .12, force: true }), i * 600); O.haptic(400); } })),
      h("div.list-h", "Examples"), T.list(T.row({ title: "Glass Buds", sub: "Example device, not tracked", val: "—" }), T.row({ title: "Keys tag", sub: "Example item, not tracked", val: "—" })),
      h("div.list-f", { style: { marginTop: "0" } }, "Only this phone's location is real, read from your browser with your permission. Glassline can't track other devices."));
    ctx.el.append(map, sheetEl);
  } });

/* ======================================================================== */
/* Home: simulated smart-home accessories and scenes                         */
/* ======================================================================== */
O.registerApp({ id: "home", name: "Home", bg: "linear-gradient(#ffb340,#ff8a00)", glyph: '<path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4z" fill="#fff" stroke="none"/>', category: "Utilities", keywords: "smart home lights thermostat scenes",
  render(ctx) {
    const st = ctx.store;
    const acc = () => st.get("acc", [{ id: "a1", room: "Living Room", name: "Ceiling Light", kind: "light", on: true, level: 70 }, { id: "a2", room: "Living Room", name: "Lamp", kind: "light", on: false, level: 40 },
      { id: "a3", room: "Bedroom", name: "Bedside Light", kind: "light", on: false, level: 30 }, { id: "a4", room: "Hallway", name: "Thermostat", kind: "thermo", on: true, level: 21 }, { id: "a5", room: "Front Door", name: "Lock", kind: "lock", on: true }]);
    const save = l => st.set("acc", l);
    const body = h("div");
    const scene = (name, fn) => h("button", { style: { flex: "none", background: "var(--card)", borderRadius: "16px", padding: "12px 16px", fontWeight: 600, minHeight: "44px" }, onclick: () => { const l = acc(); l.forEach(fn); save(l); draw(); O.haptic(); O.toast(name); } }, name);
    const draw = () => { body.innerHTML = ""; const l = acc();
      body.append(h("div", { style: { display: "flex", gap: "10px", overflowX: "auto", padding: "0 16px 16px" } }, scene("Good Morning", a => { if (a.kind === "light") { a.on = true; a.level = 80; } if (a.kind === "lock") a.on = false; }),
        scene("Leave Home", a => { if (a.kind === "light") a.on = false; if (a.kind === "lock") a.on = true; }), scene("Good Night", a => { if (a.kind === "light") a.on = a.room === "Bedroom" ? true : false; if (a.room === "Bedroom") a.level = 10; if (a.kind === "lock") a.on = true; if (a.kind === "thermo") a.level = 18; })));
      [...new Set(l.map(a => a.room))].forEach(room => {
        body.append(T.hdr(room), h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "0 16px 18px" } }, ...l.filter(a => a.room === room).map(a => {
          const on = a.on; const tile = h("button", { "aria-pressed": String(on), dataset: { entity: "accessory", title: `${a.name} ${a.kind === "lock" ? (on ? "locked" : "unlocked") : on ? "on" : "off"}` }, style: { textAlign: "left", borderRadius: "18px", padding: "12px", minHeight: "92px", background: on ? "var(--card)" : "var(--fill)", color: "var(--ink)", display: "flex", flexDirection: "column", justifyContent: "space-between" },
            onclick: () => { const all = acc(); const x = all.find(y => y.id === a.id); x.on = !x.on; save(all); draw(); O.haptic(); } },
            h("span", { style: { width: "30px", height: "30px", borderRadius: "50%", background: on ? (a.kind === "light" ? "#ffd60a" : a.kind === "thermo" ? "#ff9f0a" : "#30d158") : "var(--sep)", display: "block" } }),
            h("div", h("div", { style: { fontWeight: 600, fontSize: "15px" } }, a.name), h("div.sub", { style: { color: "var(--ink3)", fontSize: "13px" } }, a.kind === "light" ? (on ? a.level + "%" : "Off") : a.kind === "thermo" ? (on ? `Heating to ${a.level}°` : "Off") : on ? "Locked" : "Unlocked")));
          if (a.kind !== "lock") { let lt; tile.addEventListener("pointerdown", () => { lt = setTimeout(() => O.prompt(a.kind === "light" ? "Brightness (0–100)" : "Target temperature (°C)", String(a.level)).then(v => { if (v && !isNaN(+v)) { const all = acc(); const x = all.find(y => y.id === a.id); x.level = Math.max(0, Math.min(a.kind === "light" ? 100 : 30, +v)); x.on = true; save(all); draw(); } }), 550); }); ["pointerup", "pointerleave"].forEach(ev => tile.addEventListener(ev, () => clearTimeout(lt))); }
          return tile; })));
      });
      body.append(h("div.list-f", { style: { marginTop: 0 } }, "Accessories are simulated. Glassline can't control real smart-home devices. Press and hold a light or thermostat to set its level.")); };
    draw(); ctx.stack().push(() => ({ title: "My Home", body }));
  } });
})();
