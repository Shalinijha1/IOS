/* Glassline OS: built-in apps. Original code and artwork. */
(function () {
"use strict";
const O = window.GOS, { h, sys, esc, clamp, track, project, spring } = O;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const pad2 = n => String(n).padStart(2, "0");
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- UI kit ---------- */
function toggle(on, change) {
  const t = h("div.toggle" + (on ? ".on" : ""), { role: "switch", onclick: e => { e.stopPropagation(); t.classList.toggle("on"); O.haptic(); change(t.classList.contains("on")); } });
  return t;
}
function row({ icon, color, title, sub, val, go, tog, onclick, entity, cls = "" }) {
  const r = h("div.row" + (icon ? ".ic" : "") + cls, { onclick, dataset: entity ? { entity, title: typeof title === "string" ? title : title.textContent } : null });
  if (icon) { const ic = h("div.sicon", { style: { background: color || "#8e8e93" }, html: typeof icon === "string" && icon.startsWith("<") ? icon : sys(icon) }); r.append(ic); }
  r.append(h("div.grow", h("div", title), sub ? h("div.sub", sub) : null));
  if (val != null) r.append(h("div.val", val));
  if (tog) r.append(toggle(tog.on, tog.change));
  if (go) r.append(h("span.go"));
  return r;
}
const list = (...rows) => h("div.list", rows);
/* icon-only button: SVG glyph, accessible name, 44x44 target */
function iconBtn(glyph, label, onclick, color = "var(--accent)") { return h("button.ibtn", { title: label, "aria-label": label, onclick, style: { color }, html: sys(glyph) }); }
const hdr = t => h("div.list-h", t);
const foot = t => h("div.list-f", t);
function tabbar(tabs, select, initial = 0) {
  const bar = h("div.tabbar.glass");
  tabs.forEach((t, i) => bar.append(h("button" + (i === initial ? ".on" : ""), { html: sys(t.icon) + `<span>${esc(t.label)}</span>`, onclick: () => { $$("button", bar).forEach(b => b.classList.remove("on")); bar.children[i].classList.add("on"); bar.classList.remove("min"); select(i); } })));
  bar.select = i => bar.children[i].click();
  return bar;
}
function minimizeOnScroll(scroller, bar) { let last = 0; scroller.addEventListener("scroll", () => { const y = scroller.scrollTop; if (y > last + 8 && y > 80) bar.classList.add("min"); else if (y < last - 8) bar.classList.remove("min"); last = y; }); }
function plusBtn(fn, glyph = "plus", label) { label = label || (glyph === "pen" ? "Compose" : "Add"); return h("button.tbtn.circ.glass", { title: label, "aria-label": label, html: sys(glyph), onclick: fn, style: { color: "var(--accent)" } }); }
const ICON = (bg, glyph) => ({ bg, glyph });
const avatarColor = n => ["#ff9f0a", "#30d158", "#64d2ff", "#bf5af2", "#ff375f", "#5e5ce6", "#ffd60a"][[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % 7];
const avatar = (n, s = 40) => h("div", { style: { width: s + "px", height: s + "px", borderRadius: "50%", background: `linear-gradient(${avatarColor(n)}, #8e8e93)`, color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: s * .4 + "px", flex: "none" } }, n.split(" ").map(x => x[0]).join("").slice(0, 2));
function fullHead(title, right) { return h("div.nav", h("div.bar", h("div.grp"), h("div.ttl", title), h("div.grp", right || "")), h("h1", title)); }

/* ---------- contacts (shared by Phone, Messages, Contacts, Video) ---------- */
const CS = O.appStore("contacts");
const DEFAULT_CONTACTS = [
  { id: "c1", name: "Mia Chen", phone: "+1 555 0101", email: "mia@example.com", fav: true }, { id: "c2", name: "Leo Park", phone: "+1 555 0102", email: "leo@example.com", fav: true },
  { id: "c3", name: "Ava Rossi", phone: "+1 555 0103", email: "ava@example.com" }, { id: "c4", name: "Noah Smith", phone: "+1 555 0104", email: "noah@example.com" },
  { id: "c5", name: "Sam Patel", phone: "+1 555 0105", email: "sam@example.com", fav: true }, { id: "c6", name: "Grandma", phone: "+1 555 0106", email: "" },
];
const contacts = () => CS.get("list", DEFAULT_CONTACTS);
function contactDetail(stack, c, { onChange } = {}) {
  stack.push(() => ({ title: "", large: false, right: h("button.btn", { onclick: () => editContact(stack, c, onChange) }, "Edit"),
    body: h("div", { style: { textAlign: "center", paddingTop: "10px" } }, h("div", { style: { display: "flex", justifyContent: "center" } }, avatar(c.name, 96)), h("h2", { style: { margin: "12px 0 16px" } }, c.name),
      h("div", { style: { display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" } }, ...[["message", "messages", { thread: c.name }], ["phone", "phone", { call: c.name }], ["video", "facetime", { call: c.name }], ["mail", "mail", { compose: "", to: c.email }]].map(([g, app, intent]) =>
        h("button", { style: { background: "var(--card)", borderRadius: "12px", width: "74px", padding: "10px 0", color: "var(--accent)", fontSize: "12px" }, onclick: () => O.open(app, null, { intent }), html: O.svg(O.G[g], "0 0 24 24").replace('stroke="currentColor"', 'stroke="var(--accent)"').replace(/fill="#fff"/g, 'fill="var(--accent)"') + app })),
      ),
      list(row({ title: c.phone || "No number", sub: "mobile" }), row({ title: c.email || "No email", sub: "email" })),
      list(row({ title: c.fav ? "Remove from Favorites" : "Add to Favorites", onclick: () => { c.fav = !c.fav; saveContact(c); onChange && onChange(); stack.pop(); } }),
        row({ title: h("span", { style: { color: "var(--red)" } }, "Delete Contact"), onclick: () => { CS.set("list", contacts().filter(x => x.id !== c.id)); onChange && onChange(); stack.pop(); } }))) }));
}
function saveContact(c) { const l = contacts(); const i = l.findIndex(x => x.id === c.id); if (i >= 0) l[i] = c; else l.push(c); l.sort((a, b) => a.name.localeCompare(b.name)); CS.set("list", l); }
function editContact(stack, c, onChange) {
  c = c ? { ...c } : { id: uid(), name: "", phone: "", email: "" };
  const f = k => h("input", { value: c[k] || "", placeholder: { name: "Name", phone: "Phone", email: "Email" }[k], oninput: e => c[k] = e.target.value, style: { border: 0, outline: 0, background: "none", width: "100%", fontSize: "17px" } });
  stack.push(() => ({ title: c.name ? "Edit Contact" : "New Contact", large: false, right: h("button.btn", { style: { fontWeight: 600 }, onclick: () => { if (!c.name.trim()) return O.toast("Add a name"); saveContact(c); onChange && onChange(); stack.popToRoot(); } }, "Done"),
    body: h("div", { style: { paddingTop: "16px" } }, h("div", { style: { display: "flex", justifyContent: "center", marginBottom: "18px" } }, avatar(c.name || "?", 96)), list(row({ title: f("name") }), row({ title: f("phone") }), row({ title: f("email") }))) }));
}
function contactsList(stack, onPick) {
  const body = h("div");
  const draw = () => { body.innerHTML = ""; const groups = {}; contacts().forEach(c => (groups[c.name[0].toUpperCase()] = groups[c.name[0].toUpperCase()] || []).push(c));
    body.append(h("div.searchbar", { html: sys("search") }, h("input", { placeholder: "Search", oninput: e => { const q = e.target.value.toLowerCase(); $$(".row", body).forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? "" : "none"); } })));
    body.append(list(row({ title: h("b", O.settings.owner), sub: "My Card", icon: "star", color: "#8e8e93" })));
    Object.keys(groups).sort().forEach(k => { body.append(hdr(k), list(...groups[k].map(c => row({ title: c.name, entity: "contact", onclick: () => onPick ? onPick(c) : contactDetail(stack, c, { onChange: draw }) })))); }); };
  draw(); return { body, draw };
}

/* ======================================================================== */
/* Phone                                                                     */
/* ======================================================================== */
O.registerApp({ id: "phone", name: "Phone", bg: "linear-gradient(#5df07a,#1fbf4a)", glyph: "phone", category: "Social", removable: false, keywords: "call dial keypad",
  quick: [{ label: "Keypad", run: () => O.emit("phone-tab", 3) }],
  render(ctx) {
    const st = ctx.store; let tabI = 3;
    const host = h("div", { style: { position: "absolute", inset: 0 } }); ctx.el.append(host);
    const stack = O.makeStack(host);
    let typed = "";
    const recents = () => st.get("recents", [{ name: "Mia Chen", t: Date.now() - 3600e3, kind: "out" }, { name: "Sam Patel", t: Date.now() - 86400e3, kind: "missed" }]);
    const screens = [
      () => ({ title: "Favorites", right: plusBtn(() => tabs.select(2)), body: h("div", list(...contacts().filter(c => c.fav).map(c => row({ title: c.name, sub: "mobile", entity: "contact", onclick: () => call(c.name) })))) }),
      () => ({ title: "Recents", body: h("div", list(...recents().map(r => row({ title: h("span", { style: { color: r.kind === "missed" ? "var(--red)" : "" } }, r.name), sub: r.kind === "missed" ? "Missed" : "Outgoing", val: new Date(r.t).toLocaleDateString(), entity: "call", onclick: () => call(r.name) })))) }),
      () => { const c = contactsList(stack); return { title: "Contacts", right: plusBtn(() => editContact(stack, null, () => c.draw())), body: c.body }; },
      () => {
        const num = h("div", { style: { fontSize: "36px", textAlign: "center", height: "52px", marginTop: "40px", letterSpacing: "1px" } });
        const keys = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]];
        const pad = h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,78px)", gap: "16px 28px", justifyContent: "center", marginTop: "24px" } },
          keys.map(([k, l]) => h("button", { style: { width: "78px", height: "78px", borderRadius: "50%", background: "var(--fill)", fontSize: "34px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }, onclick: () => { typed += k; num.textContent = typed; O.tone([[697 + "123456789*0#".indexOf(k) * 40, .12]], { gain: .05 }); } }, k, h("small", { style: { fontSize: "10px", letterSpacing: "2px", fontWeight: 600 } }, l))));
        const actions = h("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", gap: "40px", marginTop: "18px" } },
          h("span", { style: { width: "60px" } }), h("button", { style: { width: "78px", height: "78px", borderRadius: "50%", background: "var(--green)", display: "grid", placeItems: "center" }, html: O.svg(O.G.phone), onclick: () => typed && call(typed) }),
          h("button", { style: { width: "60px", fontSize: "24px", color: "var(--ink3)" }, onclick: () => { typed = typed.slice(0, -1); num.textContent = typed; } }, "⌫"));
        actions.children[1].querySelector("svg").style.cssText = "width:34px;height:34px";
        return { title: "Keypad", large: false, body: h("div", num, pad, actions) };
      },
    ];
    const tabs = tabbar([{ icon: "star", label: "Favorites" }, { icon: "timer", label: "Recents" }, { icon: "home", label: "Contacts" }, { icon: "grid", label: "Keypad" }], i => { tabI = i; stack.replaceRoot(screens[i]); }, 3);
    ctx.el.append(tabs); stack.replaceRoot(screens[3]);
    O.on("phone-tab", i => tabs.select(i));
    function call(name) {
      const r = recents(); r.unshift({ name, t: Date.now(), kind: "out" }); st.set("recents", r.slice(0, 30));
      O.callState.on = true; O.callState.start = Date.now(); O.live.update();
      const status = h("div", { style: { opacity: .7, fontSize: "17px" } }, "calling…");
      const ov = h("div", { style: { position: "absolute", inset: 0, zIndex: 20, background: "linear-gradient(#3a3f4b,#111)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "110px" } },
        avatar(name, 90), h("div", { style: { fontSize: "30px", margin: "16px 0 4px" } }, name), status,
        h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,72px)", gap: "26px 34px", marginTop: "auto", marginBottom: "40px" } }, ...["mute", "keypad", "speaker", "add call", "video", "contacts"].map(l => h("button", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", fontSize: "12px" }, onclick: e => e.currentTarget.firstChild.style.background = e.currentTarget.firstChild.style.background === "rgb(255, 255, 255)" ? "rgba(255,255,255,.18)" : "#fff" }, h("span", { style: { width: "72px", height: "72px", borderRadius: "50%", background: "rgba(255,255,255,.18)", display: "block" } }), l))),
        h("button", { style: { width: "76px", height: "76px", borderRadius: "50%", background: "var(--red)", marginBottom: "60px", display: "grid", placeItems: "center" }, html: O.svg(O.G.phone), onclick: end }));
      ov.lastChild.querySelector("svg").style.cssText = "width:34px;height:34px;transform:rotate(135deg)";
      ctx.el.append(ov);
      let tm = setTimeout(() => { status.textContent = "Call simulated: no audio is sent from a browser"; }, 2500);
      function end() { clearTimeout(tm); O.callState.on = false; O.live.update(); ov.remove(); if (tabI === 1) stack.replaceRoot(screens[1]); }
    }
    ctx.onIntent(it => { if (it.call) call(it.call); if (it.contact) { tabs.select(2); const c = contacts().find(x => x.name === it.contact); if (c) contactDetail(stack, c); } });
  } });

O.registerApp({ id: "contacts", name: "Contacts", bg: "linear-gradient(#d9d9de,#a1a1a8)", glyph: "person", category: "Social", keywords: "people address book",
  render(ctx) { const stack = ctx.stack(); let c; stack.push(() => { c = contactsList(stack); return { title: "Contacts", right: plusBtn(() => editContact(stack, null, () => c.draw())), body: c.body }; }); } });


const REPLIES = ["Sounds good!", "Haha 😄", "On my way", "Sure, see you then", "Thanks!", "Love it ❤️", "Let me check and get back to you", "Perfect 👍", "Can't wait!"];
/* ---------- seed data, written once so search and the assistant see it before an app is opened ---------- */
const SEEDS = {
  notes: ["notes", () => [{ id: "n1", text: "Groceries\nmilk, eggs, bread, coffee, apples", t: Date.now() - 3600e3, pinned: true }, { id: "n2", text: "Dinner ideas\nRisotto on Friday with Mia and Leo. Try the new pasta place downtown at 7pm.", t: Date.now() - 86400e3 }]],
  reminders: ["items", () => [{ id: "r1", text: "Call the dentist", done: false }, { id: "r2", text: "Buy birthday card for Ava", done: false, flag: true }, { id: "r3", text: "Pay electricity bill", done: true }]],
  calendar: ["events", () => [{ id: "e1", title: "Team stand-up", date: today(), time: "09:30" }, { id: "e2", title: "Dinner with Mia", date: today(), time: "19:00" }]],
  messages: ["threads", () => ({ "Mia Chen": [{ me: false, text: "Hey! Are you free this weekend?", t: Date.now() - 7200e3 }, { me: true, text: "Yes! What did you have in mind?", t: Date.now() - 7100e3 }], "Leo Park": [{ me: false, text: "The hike was amazing", t: Date.now() - 86400e3 }] })],
};
for (const [app, [key, make]] of Object.entries(SEEDS)) { const st = O.appStore(app); if (st.get(key, null) == null) st.set(key, make()); }
/* messages arrive whether or not the Messages app is running; it redraws on "messages-changed" */
const msgUI = { current: null };
function receiveMessage(from, text) {
  const st = O.appStore("messages"); const t = st.get("threads", {}); t[from] = t[from] || []; t[from].push({ me: false, text, t: Date.now() }); st.set("threads", t);
  if (msgUI.current === from && O.state.front === "messages") O.tone([[1200, .05]], { gain: .03 });
  else O.notify({ app: "messages", title: from, body: text, intent: { thread: from } });
  O.emit("messages-changed", from);
}
O.on("incoming-message", ({ from, text }) => receiveMessage(from, text));
O.on("send-message", ({ to, text }) => { const st = O.appStore("messages"); const t = st.get("threads", {}); t[to] = t[to] || []; t[to].push({ me: true, text, t: Date.now() }); st.set("threads", t); O.emit("messages-changed", to);
  if (!O.settings.airplane) setTimeout(() => receiveMessage(to, REPLIES[Math.floor(Math.random() * REPLIES.length)]), 4000); });
O.on("add-note", text => { const st = O.appStore("notes"); const a = st.get("notes", []); a.unshift({ id: uid(), text, t: Date.now() }); st.set("notes", a); O.emit("notes-changed", a[0].id, !text); });
O.on("add-reminder", text => { const st = O.appStore("reminders"); st.set("items", [...st.get("items", []), { id: uid(), text, done: false }]); O.emit("reminders-changed"); });

/* ======================================================================== */
/* Messages                                                                  */
/* ======================================================================== */
O.registerApp({ id: "messages", name: "Messages", bg: "linear-gradient(#5df07a,#1fbf4a)", glyph: "message", category: "Social", removable: false, keywords: "text sms chat imessage",
  quick: [{ label: "New Message", run: () => O.emit("msg-new") }],
  render(ctx) {
    const st = ctx.store;
    const threads = () => st.get("threads", {});
    const save = th => st.set("threads", th);
    const stack = ctx.stack();
    let current = null, drawThread = null;
    const listBody = h("div");
    const drawList = () => {
      listBody.innerHTML = ""; const th = threads();
      listBody.append(h("div.searchbar", { html: sys("search") }, h("input", { placeholder: "Search", oninput: e => { const q = e.target.value.toLowerCase(); $$(".row", listBody).forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? "" : "none"); } })));
      const names = Object.keys(th).sort((a, b) => (th[b].at(-1)?.t || 0) - (th[a].at(-1)?.t || 0));
      if (!names.length) listBody.append(h("div.empty", "No messages"));
      listBody.append(h("div.list.flush", names.map(n => { const last = th[n].at(-1) || { text: "" };
        const r = h("div.row", { dataset: { entity: "conversation", title: n }, style: { padding: "10px 16px" }, onclick: () => openThread(n) }, avatar(n, 46), h("div.grow", h("div", { style: { display: "flex", justifyContent: "space-between" } }, h("b", n), h("span.sub", new Date(last.t || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))), h("div.sub", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, last.text)));
        r.addEventListener("contextmenu", e => { e.preventDefault(); O.sheet({ title: n, actions: [{ label: "Delete Conversation", red: true, run: () => { const t = threads(); delete t[n]; save(t); drawList(); } }] }); });
        return r; })));
    };
    drawList();
    stack.push(() => ({ title: "Messages", left: h("button.btn", { onclick: () => O.toast("Filters: All Messages") }, "Filter"), right: plusBtn(() => newMsg(), "pen"), body: listBody, onReturn: () => { current = null; msgUI.current = null; drawList(); } }));
    function newMsg(prefill = "") {
      O.prompt("New Message: To", "", "Name").then(n => { if (!n) return; n = n.trim(); const t = threads(); t[n] = t[n] || []; save(t); openThread(n, prefill); });
    }
    function openThread(name, prefill = "") {
      current = name; msgUI.current = name; O.setBadge("messages", 0);
      const body = h("div", { style: { padding: "8px 12px", display: "flex", flexDirection: "column", gap: "3px" } });
      const typing = h("div", { style: { alignSelf: "flex-start", background: "var(--card)", borderRadius: "18px", padding: "10px 14px", display: "none" } }, "•••");
      drawThread = () => {
        body.innerHTML = ""; const msgs = threads()[name] || [];
        let lastT = 0;
        msgs.forEach((m, i) => {
          if (m.t - lastT > 3600e3) body.append(h("div", { style: { textAlign: "center", fontSize: "11px", color: "var(--ink3)", margin: "10px 0 4px" } }, new Date(m.t).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })));
          lastT = m.t;
          const b = h("div", { dataset: { entity: "message", title: (m.me ? "Me: " : name + ": ") + m.text }, style: { alignSelf: m.me ? "flex-end" : "flex-start", maxWidth: "75%", padding: "8px 13px", borderRadius: "19px", fontSize: "16px", lineHeight: 1.3, position: "relative", wordBreak: "break-word",
            background: m.me ? "linear-gradient(#3b9bff,#0a84ff)" : "var(--card)", color: m.me ? "#fff" : "var(--ink)", marginTop: m.react ? "14px" : "0" } }, m.img ? h("img", { src: m.img, style: { maxWidth: "200px", borderRadius: "12px", display: "block" } }) : m.text);
          if (m.react) b.append(h("span", { style: { position: "absolute", top: "-14px", [m.me ? "left" : "right"]: "-8px", background: "var(--card)", borderRadius: "12px", padding: "1px 5px", fontSize: "14px", boxShadow: "0 1px 3px rgba(0,0,0,.2)" } }, m.react));
          b.addEventListener("dblclick", () => tapback(i));
          let lt; b.addEventListener("pointerdown", () => { lt = setTimeout(() => tapback(i), 500); }); b.addEventListener("pointerup", () => clearTimeout(lt)); b.addEventListener("pointerleave", () => clearTimeout(lt));
          body.append(b);
        });
        const last = msgs.at(-1); if (last && last.me) body.append(h("div", { style: { alignSelf: "flex-end", fontSize: "11px", color: "var(--ink3)" } }, last.read ? "Read" : "Delivered"));
        body.append(typing);
        requestAnimationFrame(() => { const sc = body.parentNode; if (sc) sc.scrollTop = 1e6; });
      };
      function tapback(i) { O.haptic(10); O.sheet({ title: "Tapback", actions: ["❤️", "👍", "👎", "😂", "‼️", "❓"].map(e => ({ label: e, run: () => { const t = threads(); t[name][i].react = t[name][i].react === e ? null : e; save(t); drawThread(); } })) }); }
      const input = h("textarea", { rows: 1, placeholder: "Message", value: prefill, style: { flex: 1, resize: "none", border: ".5px solid var(--sep)", borderRadius: "18px", padding: "7px 12px", background: "var(--card)", outline: 0, fontSize: "16px", maxHeight: "100px" },
        onkeydown: e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } } });
      const photo = h("input", { type: "file", accept: "image/*", style: { display: "none" }, onchange: async e => { const f = e.target.files[0]; if (!f) return; const url = await shrink(f); push({ me: true, img: url, text: "📷 Photo", t: Date.now() }); } });
      const bar = h("div.glass", { style: { display: "flex", alignItems: "flex-end", gap: "8px", padding: "8px 10px 30px", flex: "none" } },
        h("button.tbtn.circ", { style: { background: "var(--fill)", fontSize: "22px" }, onclick: () => O.sheet({ title: "Apps", actions: [{ label: "Photos", run: () => photo.click() }, { label: "Smart Reply", run: smart }, { label: "Location", run: () => push({ me: true, text: "📍 Shared my location", t: Date.now() }) }] }) }, "+"),
        input, photo, h("button.tbtn.circ", { style: { background: "var(--accent)", color: "#fff", fontWeight: 700 }, onclick: send }, "↑"));
      function smart() { const last = (threads()[name] || []).filter(m => !m.me).at(-1); const sugg = suggestReplies(last ? last.text : ""); O.sheet({ title: "Suggested replies", actions: sugg.map(s => ({ label: s, run: () => { input.value = s; send(); } })) }); }
      function push(m) { const t = threads(); t[name] = t[name] || []; t[name].push(m); save(t); drawThread(); }
      function send() {
        const text = input.value.trim(); if (!text) return; input.value = ""; push({ me: true, text, t: Date.now() }); O.SOUND.sent();
        if (O.settings.airplane) return O.toast("Not Delivered: Airplane Mode");
        setTimeout(() => { const t = threads(); const last = t[name].at(-1); if (last && last.me) { last.read = true; save(t); } if (current === name) { drawThread(); typing.style.display = "block"; requestAnimationFrame(() => body.parentNode.scrollTop = 1e6); } }, 900);
        setTimeout(() => { typing.style.display = "none"; receive(name, REPLIES[Math.floor(Math.random() * REPLIES.length)], true); }, 2400 + Math.random() * 1500);
      }
      stack.push(() => ({ title: name, large: false, right: h("button.btn", { html: O.svg(O.G.video).replace(/#fff/g, "currentColor"), style: { width: "28px" }, onclick: () => O.open("facetime", null, { intent: { call: name } }) }),
        under: h("div", { style: { display: "flex", justifyContent: "center", marginTop: "-6px" } }, avatar(name, 40)), body, after: bar }));
      drawThread();
    }
    const receive = (from, text) => receiveMessage(from, text);
    O.on("messages-changed", who => { if (current === who && drawThread) drawThread(); if (stack.depth === 1) drawList(); });
    O.on("msg-new", () => newMsg());
    ctx.onIntent(it => { if (it.thread) { stack.popToRoot(); openThread(it.thread); } if (it.compose != null) newMsg(it.compose); });
  } });
// smart reply: rule-based suggestions keyed on the last incoming message
function suggestReplies(t) {
  t = t.toLowerCase();
  if (/\?/.test(t) && /(free|still on|coming|want|can you|are we)/.test(t)) return ["Yes, definitely!", "Sorry, I can't make it", "Let me check"];
  if (/late|sorry/.test(t)) return ["No worries!", "Take your time", "See you soon"];
  if (/photo|pictures|sent/.test(t)) return ["Thanks! Love them", "These are great 😍", "Got them"];
  if (/call/.test(t)) return ["Calling you now", "Can I call in an hour?", "Sure"];
  if (/love/.test(t)) return ["Love you too ❤️", "❤️", "Talk soon"];
  return ["👍", "Sounds good", "Thanks!"];
}
async function shrink(file, max = 900) {
  const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode().catch(() => {});
  const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s;
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); return c.toDataURL("image/jpeg", .82);
}

/* ======================================================================== */
/* Mail                                                                      */
/* ======================================================================== */
O.registerApp({ id: "mail", name: "Mail", bg: "linear-gradient(#5ac8fa,#1a73e8)", glyph: "mail", category: "Productivity", keywords: "email inbox",
  render(ctx) {
    const st = ctx.store;
    const box = () => st.get("mail", [
      { id: "m1", from: "Glassline Team", subject: "Welcome to your new phone", body: "Thanks for trying Glassline OS. Everything here runs locally in your browser. Your notes, photos and messages are stored on this device only. Swipe up from the bottom bar to go home, and pull down from the top right for Control Centre. Have fun exploring!", t: Date.now() - 3600e3, read: false, box: "inbox" },
      { id: "m2", from: "Mia Chen", subject: "Dinner on Friday", body: "Hi! I booked a table for four at 7pm on Friday at the Italian place downtown. Leo and Ava are coming too. Let me know if the time works, otherwise I can move it to 8pm. Also, bring the board game!", t: Date.now() - 7200e3, read: false, box: "inbox" },
      { id: "m3", from: "City Library", subject: "Your books are due soon", body: "This is a reminder that 2 items on your account are due on Monday. You can renew them online or at any branch. Late fees apply after the due date.", t: Date.now() - 86400e3 * 2, read: true, box: "inbox" },
    ]);
    const save = m => st.set("mail", m);
    const stack = ctx.stack();
    let boxName = "inbox";
    const body = h("div");
    const draw = () => { body.innerHTML = ""; const m = box().filter(x => x.box === boxName).sort((a, b) => b.t - a.t);
      O.setBadge("mail", box().filter(x => !x.read && x.box === "inbox").length);
      body.append(h("div.seg", ["inbox", "sent", "trash"].map(b => h("button" + (b === boxName ? ".on" : ""), { onclick: () => { boxName = b; draw(); } }, b[0].toUpperCase() + b.slice(1)))));
      if (!m.length) body.append(h("div.empty", "No Mail"));
      body.append(h("div.list.flush", m.map(x => h("div.row", { dataset: { entity: "email", title: x.subject }, style: { alignItems: "flex-start", padding: "10px 16px" }, onclick: () => read(x) },
        h("div", { style: { width: "10px", height: "10px", borderRadius: "50%", marginTop: "6px", background: x.read ? "transparent" : "var(--accent)", flex: "none" } }),
        h("div.grow", h("div", { style: { display: "flex", justifyContent: "space-between" } }, h("b", x.box === "sent" ? "To: " + x.to : x.from), h("span.sub", new Date(x.t).toLocaleDateString())), h("div", x.subject), h("div.sub", { style: { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } }, x.body)))))); };
    draw();
    stack.push(() => ({ title: "Inbox", right: plusBtn(() => compose(), "pen"), body, onReturn: draw }));
    function read(x) {
      const all = box(); const me = all.find(y => y.id === x.id); me.read = true; save(all);
      const sum = h("div", { style: { display: "none", background: "var(--fill)", borderRadius: "12px", padding: "10px 12px", margin: "12px 0", fontSize: "14px" } });
      stack.push(() => ({ title: "", large: false, right: h("div.grp", iconBtn("trash", "Move to Trash", () => { const a = box(); a.find(y => y.id === x.id).box = "trash"; save(a); stack.pop(); }), iconBtn("reply", "Reply", () => compose("Re: " + x.subject, x.from))),
        body: h("div", { style: { padding: "0 16px" } }, h("h2", { style: { margin: "4px 0" } }, x.subject), h("div.sub", `From ${x.from} · ${new Date(x.t).toLocaleString()}`),
          h("button.pill-btn.grey", { style: { marginTop: "10px", fontSize: "13px" }, onclick: () => { sum.style.display = "block"; sum.innerHTML = "<b>✦ Summary</b><br>" + esc(summarizeText(x.body)); } }, "✦ Summarize"), sum,
          h("p", { style: { fontSize: "16px", lineHeight: 1.5 } }, x.body)) }));
    }
    function compose(subject = "", to = "", text = "") {
      const f = (ph, v) => h("input", { placeholder: ph, value: v, style: { border: 0, outline: 0, background: "none", width: "100%", fontSize: "16px" } });
      const toI = f("To:", to), subI = f("Subject:", subject), bodyI = h("textarea", { value: text, placeholder: "", style: { width: "100%", minHeight: "300px", border: 0, outline: 0, background: "none", fontSize: "16px", resize: "none", padding: "12px 16px" } });
      stack.push(() => ({ title: "New Message", large: false, right: h("button.btn", { style: { fontWeight: 700 }, onclick: () => { const a = box(); a.push({ id: uid(), to: toI.value || "(no recipient)", from: "Me", subject: subI.value || "(No Subject)", body: bodyI.value, t: Date.now(), read: true, box: "sent" }); save(a); O.SOUND.sent(); O.toast("Sent"); stack.popToRoot(); draw(); } }, "Send"),
        body: h("div", list(row({ title: toI }), row({ title: subI })), bodyI) }));
    }
    ctx.onIntent(it => { if (it.compose != null) compose("", it.to || "", it.compose); });
  } });
/* extractive summary: score sentences by word frequency, keep the best two in original order */
function summarizeText(t) {
  const sents = t.match(/[^.!?]+[.!?]*/g) || [t];
  if (sents.length <= 2) return t.trim();
  const STOP = new Set("the a an and or to of in on at for is are be it this that with you your i we our my me as by from if can will just have has was were also".split(" "));
  const freq = {}; (t.toLowerCase().match(/[a-z']+/g) || []).forEach(w => { if (!STOP.has(w) && w.length > 2) freq[w] = (freq[w] || 0) + 1; });
  const scored = sents.map((s, i) => ({ s: s.trim(), i, sc: (s.toLowerCase().match(/[a-z']+/g) || []).reduce((a, w) => a + (freq[w] || 0), 0) / Math.sqrt(s.length + 1) + (i === 0 ? .6 : 0) }));
  return scored.sort((a, b) => b.sc - a.sc).slice(0, 2).sort((a, b) => a.i - b.i).map(x => x.s).join(" ");
}

/* ======================================================================== */
/* Browser                                                                   */
/* ======================================================================== */
O.registerApp({ id: "browser", name: "Browser", bg: "linear-gradient(160deg,#5ec8ff,#1a73e8 70%)", glyph: '<circle cx="12" cy="12" r="8.2" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-width="1.5"/><ellipse cx="12" cy="12" rx="3.6" ry="8.2" stroke="#fff" stroke-width="1.3"/><path d="M4 9.2h16M4 14.8h16M12 3.8v16.4" stroke="#fff" stroke-width="1.3"/>', category: "Information", removable: false, keywords: "web internet safari website",
  render(ctx) {
    const st = ctx.store;
    const favs = st.get("favs", [["Wikipedia", "https://en.m.wikipedia.org/"], ["OpenStreetMap", "https://www.openstreetmap.org/export/embed.html"], ["Example", "https://example.com/"], ["MDN", "https://developer.mozilla.org/"]]);
    let hist = [], hi = -1;
    const frame = h("iframe", { style: { flex: 1, border: 0, width: "100%", background: "#fff", display: "none" }, sandbox: "allow-scripts allow-same-origin allow-forms allow-popups", referrerpolicy: "no-referrer" });
    const start = h("div.scroll", { style: { padding: "70px 18px 120px" } });
    const drawStart = () => { start.innerHTML = ""; start.append(h("h2", "Favorites"), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" } }, favs.map(([n, u]) => h("div", { style: { textAlign: "center", fontSize: "12px", cursor: "pointer" }, dataset: { entity: "bookmark", title: n }, onclick: () => go(u) }, h("div", { style: { width: "60px", height: "60px", margin: "0 auto 6px", borderRadius: "14px", background: "var(--card)", display: "grid", placeItems: "center", fontSize: "26px", fontWeight: 700, color: avatarColor(n) } }, n[0]), n))),
      h("h2", { style: { marginTop: "26px" } }, "Reading List"), list(...st.get("reading", []).map(u => row({ title: u, onclick: () => go(u) }))), h("p.sub", { style: { fontSize: "12px", color: "var(--ink3)" } }, "Many sites refuse to load inside another page. When that happens, use the Open in a browser tab button below to open it in a real tab.")); };
    drawStart();
    const addr = h("input", { placeholder: "Search or enter website", style: { flex: 1, border: 0, outline: 0, background: "none", fontSize: "16px", textAlign: "center" }, onkeydown: e => { if (e.key === "Enter") { go(addr.value); addr.blur(); } }, onfocus: () => { addr.style.textAlign = "left"; addr.select(); }, onblur: () => addr.style.textAlign = "center" });
    const bar = h("div", { style: { flex: "none", padding: "8px 10px 30px", display: "flex", flexDirection: "column", gap: "8px", background: "var(--bg)" } },
      h("div.glass", { style: { display: "flex", alignItems: "center", height: "44px", borderRadius: "22px", padding: "0 14px", gap: "6px" } }, h("span", { html: sys("search"), style: { width: "16px", opacity: .5 } }), addr, iconBtn("reload", "Reload", () => hi >= 0 && load(hist[hi]))),
      h("div", { style: { display: "flex", justifyContent: "space-around" } },
        iconBtn("back", "Back", () => { if (hi > 0) load(hist[--hi]); else home(); }), iconBtn("fwd", "Forward", () => { if (hi < hist.length - 1) load(hist[++hi]); }),
        iconBtn("share", "Share", () => O.share({ title: "Share page", url: hist[hi] || "" })), iconBtn("star", "Add to Reading List", () => { if (!hist[hi]) return O.toast("Open a page first"); const r = st.get("reading", []); r.unshift(hist[hi]); st.set("reading", [...new Set(r)].slice(0, 20)); O.toast("Added to Reading List"); }),
        iconBtn("external", "Open in a browser tab", () => hist[hi] ? window.open(hist[hi], "_blank", "noopener") : O.toast("Open a page first")), iconBtn("home", "Start Page", home)));
    ctx.el.append(start, frame, bar);
    function go(input) {
      let u = String(input).trim(); if (!u) return;
      if (!/^https?:\/\//i.test(u)) u = /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(u) ? "https://" + u : "https://en.m.wikipedia.org/w/index.php?search=" + encodeURIComponent(u);
      hist = hist.slice(0, hi + 1); hist.push(u); hi = hist.length - 1; load(u);
    }
    function load(u) { start.style.display = "none"; frame.style.display = "block"; frame.src = u; addr.value = u.replace(/^https?:\/\//, "").replace(/\/$/, ""); }
    function home() { frame.style.display = "none"; frame.src = "about:blank"; start.style.display = "block"; addr.value = ""; drawStart(); }
    ctx.onIntent(it => { if (it.search) go(it.search); if (it.url) go(it.url); });
  } });

/* ======================================================================== */
/* Camera                                                                    */
/* ======================================================================== */
O.registerApp({ id: "camera", name: "Camera", bg: "linear-gradient(#e5e5ea,#8e8e93)", glyph: "camera", category: "Creativity", removable: false, status: "light", keywords: "photo picture video selfie scan qr",
  render(ctx) {
    ctx.el.style.background = "#000"; ctx.el.style.color = "#fff";
    let stream = null, facing = "environment", mode = "PHOTO", rec = null, chunks = [], zoom = 1, filt = "none";
    const video = h("video", { autoplay: true, playsInline: true, muted: true, style: { position: "absolute", left: 0, right: 0, top: "110px", height: "520px", width: "100%", objectFit: "cover", background: "#111" } });
    const msg = h("div", { style: { position: "absolute", top: "330px", width: "100%", textAlign: "center", opacity: .7, padding: "0 30px" } });
    const thumb = h("div", { style: { width: "52px", height: "52px", borderRadius: "10px", background: "#333 center/cover", cursor: "pointer" }, onclick: () => O.open("photos") });
    const shutter = h("button", { style: { width: "76px", height: "76px", borderRadius: "50%", border: "4px solid #fff", display: "grid", placeItems: "center" }, onclick: shoot }, h("span", { style: { width: "62px", height: "62px", borderRadius: "50%", background: "#fff", transition: "all .2s" } }));
    const modes = h("div", { style: { display: "flex", justifyContent: "center", gap: "22px", fontSize: "13px", fontWeight: 600, letterSpacing: ".5px" } }, ["VIDEO", "PHOTO", "PORTRAIT", "SCAN"].map(m => h("button", { style: { color: m === mode ? "#ffd60a" : "#fff" }, onclick: e => { mode = m; $$("button", modes).forEach(b => b.style.color = "#fff"); e.currentTarget.style.color = "#ffd60a"; video.style.filter = m === "PORTRAIT" ? "contrast(1.1) saturate(1.1)" : filt; shutter.firstChild.style.background = m === "VIDEO" ? "#ff3b30" : "#fff"; if (m === "SCAN") scanLoop(); } }, m)));
    const zoomBtns = h("div", { style: { position: "absolute", top: "580px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px", background: "rgba(0,0,0,.35)", borderRadius: "20px", padding: "4px" } }, [".5", "1", "2", "3"].map(z => h("button", { style: { width: "34px", height: "34px", borderRadius: "50%", background: z === "1" ? "rgba(255,255,255,.25)" : "", color: z === "1" ? "#ffd60a" : "#fff", fontSize: "12px", fontWeight: 700 }, onclick: e => { zoom = +z || .5; video.style.transform = `scale(${Math.max(1, zoom)})`; $$("button", zoomBtns).forEach(b => { b.style.background = ""; b.style.color = "#fff"; }); e.currentTarget.style.background = "rgba(255,255,255,.25)"; e.currentTarget.style.color = "#ffd60a"; } }, z + "×")));
    const top = h("div", { style: { position: "absolute", top: "54px", left: "20px", right: "20px", display: "flex", justifyContent: "space-between", fontSize: "20px" } },
      h("button", { title: "Flash", onclick: e => { e.currentTarget.style.color = e.currentTarget.style.color ? "" : "#ffd60a"; } }, "⚡"),
      h("button", { title: "Filters", onclick: () => O.sheet({ title: "Filters", actions: [["Original", "none"], ["Vivid", "saturate(1.6) contrast(1.1)"], ["Mono", "grayscale(1)"], ["Noir", "grayscale(1) contrast(1.5)"], ["Warm", "sepia(.35) saturate(1.3)"], ["Cool", "hue-rotate(-15deg) saturate(1.1)"]].map(([n, f]) => ({ label: n, run: () => { filt = f; video.style.filter = f; } })) }) }, "◎"));
    const bottom = h("div", { style: { position: "absolute", bottom: "40px", left: 0, right: 0, display: "flex", flexDirection: "column", gap: "18px" } }, modes,
      h("div", { style: { display: "flex", justifyContent: "space-around", alignItems: "center" } }, thumb, shutter, h("button", { style: { width: "52px", height: "52px", borderRadius: "50%", background: "rgba(255,255,255,.18)", fontSize: "22px" }, onclick: () => { facing = facing === "user" ? "environment" : "user"; startCam(); } }, "⟲")));
    const flashEl = h("div", { style: { position: "absolute", inset: 0, background: "#fff", opacity: 0, pointerEvents: "none", transition: "opacity .15s" } });
    const recTime = h("div", { style: { position: "absolute", top: "60px", left: "50%", transform: "translateX(-50%)", background: "#ff3b30", borderRadius: "6px", padding: "2px 8px", display: "none", fontVariantNumeric: "tabular-nums" } });
    ctx.el.append(video, msg, zoomBtns, top, bottom, flashEl, recTime);
    const lastPhoto = () => { const p = (O.appStore("photos").get("items", []) || [])[0]; thumb.style.backgroundImage = p ? `url(${p.src})` : ""; };
    async function startCam() {
      stopCam(); msg.textContent = "Starting camera…";
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = "No camera API here. Open the page from http://localhost or https to use your webcam."; return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 } }, audio: false }); video.srcObject = stream; msg.textContent = ""; video.style.transform = facing === "user" ? "scaleX(-1)" : ""; }
      catch (e) { msg.textContent = e.name === "NotAllowedError" ? "Camera access is off. Allow it in your browser's site settings, then reopen Camera." : e.name === "NotFoundError" ? "No camera found. Connect a camera, then reopen Camera." : "The camera couldn't start. Close other apps using it, then reopen Camera."; }
    }
    function stopCam() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null; }
    function frameData() {
      const c = document.createElement("canvas"); const vw = video.videoWidth || 720, vh = video.videoHeight || 960;
      const ar = 3 / 4; let sw = vw, sh = vw / ar; if (sh > vh) { sh = vh; sw = vh * ar; }
      const z = Math.max(1, zoom); sw /= z; sh /= z;
      c.width = 900; c.height = 1200; const g = c.getContext("2d"); g.filter = video.style.filter || "none";
      if (facing === "user") { g.translate(c.width, 0); g.scale(-1, 1); }
      if (stream) g.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, c.width, c.height);
      else { const gr = g.createLinearGradient(0, 0, 900, 1200); gr.addColorStop(0, "#334"); gr.addColorStop(1, "#889"); g.fillStyle = gr; g.fillRect(0, 0, 900, 1200); g.fillStyle = "#fff"; g.font = "40px system-ui"; g.fillText("No camera", 340, 600); }
      if (mode === "PORTRAIT") { const v = g.createRadialGradient(450, 560, 200, 450, 560, 700); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.55)"); g.filter = "none"; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = v; g.fillRect(0, 0, 900, 1200); }
      return c.toDataURL("image/jpeg", .85);
    }
    function shoot() {
      O.haptic(10);
      if (mode === "VIDEO") return toggleRec();
      if (mode === "SCAN") return O.toast("Point at a QR code");
      flashEl.style.opacity = .8; setTimeout(() => flashEl.style.opacity = 0, 120);
      O.tone([[1800, .03], [900, .05]], { type: "square", gain: .03 });
      const src = frameData(); O.emit("photo-taken", { src, kind: "photo" }); thumb.style.backgroundImage = `url(${src})`;
    }
    function toggleRec() {
      if (rec) { rec.stop(); return; }
      if (!stream || !window.MediaRecorder) return O.toast("Video recording isn't available");
      chunks = []; rec = new MediaRecorder(stream); const t0 = Date.now();
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = () => { const blob = new Blob(chunks, { type: rec.mimeType }); const url = URL.createObjectURL(blob); O.emit("photo-taken", { src: frameData(), video: url, kind: "video" }); rec = null; recTime.style.display = "none"; shutter.firstChild.style.borderRadius = "50%"; shutter.firstChild.style.transform = ""; O.toast("Video saved for this session"); };
      rec.start(); recTime.style.display = "block"; shutter.firstChild.style.borderRadius = "8px"; shutter.firstChild.style.transform = "scale(.5)";
      const tick = () => { if (!rec) return; recTime.textContent = O.fmtDur(Date.now() - t0 + 1); requestAnimationFrame(tick); }; tick();
    }
    async function scanLoop() {
      if (!("BarcodeDetector" in window)) { msg.textContent = "Code scanning needs a browser with the BarcodeDetector API (Chrome on Android or macOS)."; return; }
      const det = new BarcodeDetector({ formats: ["qr_code", "ean_13", "code_128"] });
      while (mode === "SCAN" && stream) {
        try { const r = await det.detect(video); if (r[0]) { const v = r[0].rawValue; O.haptic(30); O.sheet({ title: "Code found", message: v, actions: [/^https?:/.test(v) ? { label: "Open in Browser", run: () => O.open("browser", null, { intent: { url: v } }) } : { label: "Copy", run: () => navigator.clipboard?.writeText(v) }] }); mode = "PHOTO"; break; } } catch {}
        await O.sleep(400);
      }
    }
    ctx.onShow(() => { startCam(); lastPhoto(); });
    ctx.onHide(() => { if (rec) rec.stop(); stopCam(); });
    ctx.onClose(stopCam);
    ctx.onIntent(it => { if (it.front) { facing = "user"; startCam(); } if (it.mode === "scan") $$("button", modes)[3].click(); });
  } });

/* ======================================================================== */
/* Photos                                                                    */
/* ======================================================================== */
function generatedArt(seed) {
  const c = document.createElement("canvas"); c.width = 600; c.height = 800; const g = c.getContext("2d");
  let s = seed * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const hue = rnd() * 360; const gr = g.createLinearGradient(0, 0, 0, 800);
  gr.addColorStop(0, `hsl(${hue},70%,${60 + rnd() * 20}%)`); gr.addColorStop(1, `hsl(${(hue + 60) % 360},60%,${25 + rnd() * 20}%)`); g.fillStyle = gr; g.fillRect(0, 0, 600, 800);
  g.fillStyle = `hsla(${(hue + 30) % 360},90%,85%,.9)`; g.beginPath(); g.arc(150 + rnd() * 300, 150 + rnd() * 200, 50 + rnd() * 60, 0, 7); g.fill();
  for (let l = 0; l < 3; l++) { g.fillStyle = `hsla(${(hue + 200 + l * 20) % 360},40%,${15 + l * 10}%,.85)`; g.beginPath(); g.moveTo(0, 800); let y = 450 + l * 90; for (let x = 0; x <= 600; x += 30) g.lineTo(x, y + Math.sin(x / 60 + rnd() * 6) * 40 - rnd() * 40); g.lineTo(600, 800); g.fill(); }
  return c.toDataURL("image/jpeg", .8);
}
O.registerApp({ id: "photos", name: "Photos", bg: "#fff", glyph: "photos", category: "Creativity", removable: false, keywords: "gallery pictures images album",
  render(ctx) {
    const st = ctx.store;
    let items = st.get("items", null);
    if (!items) { items = Array.from({ length: 9 }, (_, i) => ({ id: uid(), src: generatedArt(i + 3), t: Date.now() - i * 86400e3 * 3, kind: "photo", fav: i === 1 })); st.set("items", items); }
    const sessionVideos = {};
    const stack = ctx.stack();
    const grid = h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "2px" } });
    let filter = "all";
    const draw = () => { grid.innerHTML = ""; items = st.get("items", []); const shown = items.filter(p => filter === "all" || (filter === "fav" && p.fav) || (filter === "video" && p.kind === "video"));
      if (!shown.length) grid.append(h("div.empty", { style: { gridColumn: "span 3" } }, "No Photos"));
      shown.forEach((p, i) => { const cell = h("div", { dataset: { entity: "photo", title: "Photo from " + new Date(p.t).toLocaleDateString() }, style: { aspectRatio: "1", background: `center/cover url(${p.src})`, position: "relative", cursor: "pointer" }, onclick: () => view(shown, i) });
        if (p.kind === "video") cell.append(h("span", { style: { position: "absolute", right: "4px", bottom: "2px", color: "#fff", fontSize: "11px", textShadow: "0 1px 2px #000" } }, "▶"));
        if (p.fav) cell.append(h("span", { style: { position: "absolute", left: "4px", bottom: "2px", color: "#fff", fontSize: "11px" } }, "♥")); grid.append(cell); }); };
    const picker = h("input", { type: "file", accept: "image/*", multiple: true, style: { display: "none" }, onchange: async e => { for (const f of e.target.files) { const src = await shrink(f, 1400); addPhoto({ src, kind: "photo" }); } } });
    const seg = h("div.seg", [["all", "All"], ["fav", "Favorites"], ["video", "Videos"]].map(([k, l]) => h("button" + (k === filter ? ".on" : ""), { onclick: e => { filter = k; $$("button", seg).forEach(b => b.classList.remove("on")); e.currentTarget.classList.add("on"); draw(); } }, l)));
    stack.push(() => ({ title: "Library", right: h("div.grp", plusBtn(() => picker.click()), picker), under: h("div.sub", { style: { margin: "0 0 8px", color: "var(--ink3)" } }, `${st.get("items", []).length} items`), body: h("div", seg, grid, h("div", { style: { height: "100px" } })), onReturn: draw }));
    draw();
    function addPhoto({ src, kind, video }) { const it = { id: uid(), src, t: Date.now(), kind: kind || "photo" }; if (video) sessionVideos[it.id] = video; const all = st.get("items", []); all.unshift(it);
      try { st.set("items", all.slice(0, 120)); } catch { O.toast("Storage full"); } draw(); }
    O.on("photo-taken", addPhoto);
    function view(arr, i) {
      let idx = i; const p = () => arr[idx];
      const img = h("div", { style: { position: "absolute", inset: "0", background: "center/contain no-repeat", transition: "transform .25s" } });
      const vid = h("video", { controls: true, playsInline: true, style: { position: "absolute", inset: "100px 0", width: "100%", display: "none" } });
      const stage = h("div", { style: { position: "relative", flex: 1, background: "var(--bg)", overflow: "hidden", touchAction: "none" } }, img, vid);
      const info = h("div.sub", { style: { textAlign: "center" } });
      const favB = h("button.ibtn", { style: { color: "var(--accent)" }, onclick: () => { const all = st.get("items", []); const x = all.find(y => y.id === p().id); x.fav = !x.fav; p().fav = x.fav; st.set("items", all); show(); } });
      const show = () => { const x = p(); img.style.backgroundImage = `url(${x.src})`; info.textContent = new Date(x.t).toLocaleString(); favB.innerHTML = sys(x.fav ? "heartFill" : "heart"); favB.setAttribute("aria-label", x.fav ? "Unfavorite" : "Favorite"); favB.title = favB.getAttribute("aria-label");
        if (sessionVideos[x.id]) { vid.src = sessionVideos[x.id]; vid.style.display = "block"; } else { vid.style.display = "none"; } };
      stage.addEventListener("pointerdown", e => track(e, { move(dx) { img.style.transition = "none"; img.style.transform = `translateX(${dx}px)`; }, end(dx, dy, vx, vy, info) {
        img.style.transition = ""; img.style.transform = "";
        if (!info.moved) { img.style.backgroundSize = img.style.backgroundSize === "cover" ? "contain" : "cover"; return; }
        if (dy > 140) return stack.pop();
        const pr = dx + project(vx, .99); if (pr < -120 && idx < arr.length - 1) idx++; else if (pr > 120 && idx > 0) idx--; show(); } }));
      const tools = h("div.glass", { style: { display: "flex", justifyContent: "space-around", padding: "8px 0 26px" } },
        iconBtn("share", "Share", () => O.share({ title: "Photo", image: p().src, text: "Photo" })), favB,
        iconBtn("sliders", "Edit", () => edit(p(), show)),
        iconBtn("trash", "Delete", () => O.alert({ title: "Delete Photo?", message: "This photo will be deleted from this device.", buttons: [{ label: "Cancel" }, { label: "Delete", red: true, run: () => { st.set("items", st.get("items", []).filter(y => y.id !== p().id)); arr.splice(idx, 1); if (!arr.length) return stack.pop(); idx = Math.min(idx, arr.length - 1); show(); } }] })));
      stack.push(() => ({ title: "", large: false, under: info, body: h("div", { style: { display: "flex", flexDirection: "column", height: "100%" } }, stage), after: tools }));
      show();
    }
    function edit(x, after) {
      const acts = [["Auto Enhance", "contrast(1.12) saturate(1.2) brightness(1.04)"], ["Mono", "grayscale(1)"], ["Vivid Warm", "saturate(1.4) sepia(.2)"], ["Brighten", "brightness(1.2)"], ["Square Crop", "crop"], ["Rotate", "rotate"]];
      O.sheet({ title: "Edit", actions: acts.map(([n, f]) => ({ label: n, run: async () => {
        const img = new Image(); img.src = x.src; await img.decode(); const c = document.createElement("canvas"); const g = c.getContext("2d");
        if (f === "crop") { const s = Math.min(img.width, img.height); c.width = c.height = s; g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, s, s); }
        else if (f === "rotate") { c.width = img.height; c.height = img.width; g.translate(c.width / 2, c.height / 2); g.rotate(Math.PI / 2); g.drawImage(img, -img.width / 2, -img.height / 2); }
        else { c.width = img.width; c.height = img.height; g.filter = f; g.drawImage(img, 0, 0); }
        const all = st.get("items", []); const it = all.find(y => y.id === x.id); it.src = x.src = c.toDataURL("image/jpeg", .85); st.set("items", all); after(); draw(); O.toast("Saved");
      } })) });
    }
  } });

/* ======================================================================== */
/* Clock                                                                     */
/* ======================================================================== */
O.registerApp({ id: "clock", name: "Clock", bg: "#111", glyph: () => O.svg(`<circle cx="12" cy="12" r="9.5" fill="#fff" stroke="none"/>${Array.from({ length: 12 }, (_, i) => `<path d="M12 3.6v1.2" stroke="#111" stroke-width=".8" transform="rotate(${i * 30} 12 12)"/>`).join("")}<path d="M12 12V7" stroke="#111" stroke-width="1.4" transform="rotate(${(new Date().getHours() % 12) * 30} 12 12)"/><path d="M12 12V5" stroke="#111" stroke-width="1" transform="rotate(${new Date().getMinutes() * 6} 12 12)"/><circle cx="12" cy="12" r=".9" fill="#ff9f0a" stroke="none"/>`), category: "Utilities", status: "light", keywords: "alarm timer stopwatch world",
  render(ctx) {
    ctx.el.style.background = "#000"; ctx.el.style.color = "#fff";
    const st = ctx.store; const host = h("div", { style: { position: "absolute", inset: 0 } }); ctx.el.append(host);
    let swStart = 0, swAcc = 0, laps = [], swRunning = false;
    const alarms = () => st.get("alarms", [{ id: "a1", time: "07:00", on: false, label: "Alarm" }]);
    const zones = () => st.get("zones", ["Europe/London", "America/New_York", "Asia/Tokyo"]);
    const pages = [
      () => { const b = h("div"); const draw = () => { b.innerHTML = ""; zones().forEach(z => { let t = ""; try { t = new Date().toLocaleTimeString([], { timeZone: z, hour: "2-digit", minute: "2-digit" }); } catch { t = "--"; }
          b.append(h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: ".5px solid #333" } }, h("div", h("div.sub", { style: { color: "#999" } }, "Today"), h("div", { style: { fontSize: "22px" } }, z.split("/").pop().replace(/_/g, " "))), h("div", { style: { fontSize: "46px", fontWeight: 200 } }, t))); }); };
        draw(); const iv = setInterval(draw, 15000); b.cleanup = () => clearInterval(iv);
        return { title: "World Clock", right: h("button.ibtn", { title: "Add City", "aria-label": "Add City", style: { color: "#ff9f0a" }, html: sys("plus"), onclick: () => O.prompt("Add a city (time zone)", "Australia/Sydney").then(v => { if (v) { try { new Date().toLocaleTimeString([], { timeZone: v }); st.set("zones", [...zones(), v]); draw(); } catch { O.toast("Unknown time zone"); } } }) }), b }; },
      () => { const b = h("div"); const draw = () => { b.innerHTML = ""; alarms().forEach(a => { const r = h("div", { dataset: { entity: "alarm", title: a.time }, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: ".5px solid #333", opacity: a.on ? 1 : .55 } },
          h("div", { onclick: () => O.sheet({ title: a.time, actions: [{ label: "Delete Alarm", red: true, run: () => { st.set("alarms", alarms().filter(x => x.id !== a.id)); draw(); } }] }) }, h("div", { style: { fontSize: "52px", fontWeight: 200 } }, a.time), h("div", a.label)), toggle(a.on, v => { const l = alarms(); l.find(x => x.id === a.id).on = v; st.set("alarms", l); draw(); })); b.append(r); }); };
        draw(); return { title: "Alarms", right: h("button.ibtn", { title: "Add Alarm", "aria-label": "Add Alarm", style: { color: "#ff9f0a" }, html: sys("plus"), onclick: () => O.prompt("New alarm (HH:MM, 24-hour)", "07:30").then(v => { if (v && /^\d{1,2}:\d{2}$/.test(v)) { st.set("alarms", [...alarms(), { id: uid(), time: v.padStart(5, "0"), on: true, label: "Alarm" }]); draw(); } }) }), b }; },
      () => { const disp = h("div", { style: { fontSize: "78px", fontWeight: 200, textAlign: "center", marginTop: "60px", fontVariantNumeric: "tabular-nums" } });
        const lapL = h("div", { style: { marginTop: "30px" } });
        const btn = (l, bg, fn) => h("button", { style: { width: "84px", height: "84px", borderRadius: "50%", background: bg, fontSize: "17px", boxShadow: "0 0 0 3px #000, 0 0 0 5px " + bg }, onclick: fn }, l);
        const left = btn("Lap", "#333", () => { if (swRunning) { laps.unshift(elapsed()); drawLaps(); } else { swAcc = 0; laps = []; drawLaps(); upd(); } });
        const right = btn("Start", "#0a3a1a", () => { if (swRunning) { swAcc += Date.now() - swStart; swRunning = false; } else { swStart = Date.now(); swRunning = true; loop(); } style(); });
        const style = () => { right.textContent = swRunning ? "Stop" : "Start"; right.style.background = swRunning ? "#3a0f0c" : "#0a3a1a"; right.style.color = swRunning ? "#ff453a" : "#30d158"; left.textContent = swRunning || !swAcc ? "Lap" : "Reset"; };
        const elapsed = () => swAcc + (swRunning ? Date.now() - swStart : 0);
        const fmt = ms => `${pad2(Math.floor(ms / 60000))}:${pad2(Math.floor(ms / 1000) % 60)},${pad2(Math.floor(ms / 10) % 100)}`;
        const upd = () => disp.textContent = fmt(elapsed());
        const loop = () => { upd(); if (swRunning) requestAnimationFrame(loop); };
        const drawLaps = () => { lapL.innerHTML = ""; laps.forEach((l, i) => lapL.append(h("div", { style: { display: "flex", justifyContent: "space-between", padding: "10px 20px", borderTop: ".5px solid #333" } }, `Lap ${laps.length - i}`, fmt(l)))); };
        upd(); style(); drawLaps(); if (swRunning) loop();
        return { title: "Stopwatch", b: h("div", disp, h("div", { style: { display: "flex", justifyContent: "space-between", padding: "40px 20px 0" } }, left, right), lapL) }; },
      () => { const b = h("div", { style: { textAlign: "center" } });
        const draw = () => { b.innerHTML = "";
          if (O.timerState.end) { const big = h("div", { style: { fontSize: "72px", fontWeight: 200, marginTop: "80px", fontVariantNumeric: "tabular-nums" } }); const upd = () => { big.textContent = O.fmtDur(O.timerState.end - Date.now()); if (O.timerState.end && document.contains(big)) setTimeout(upd, 250); else if (!O.timerState.end) draw(); }; upd();
            b.append(big, h("div.sub", { style: { color: "#999" } }, O.timerState.label), h("button", { style: { marginTop: "50px", width: "84px", height: "84px", borderRadius: "50%", background: "#3a0f0c", color: "#ff453a", fontSize: "17px" }, onclick: () => { O.stopTimer(); draw(); } }, "Cancel")); return; }
          const sel = { h: 0, m: 5, s: 0 };
          const col = (k, max) => { const c = h("select", { style: { fontSize: "30px", background: "#1c1c1e", color: "#fff", border: 0, borderRadius: "10px", padding: "8px" }, onchange: e => sel[k] = +e.target.value }, Array.from({ length: max }, (_, i) => h("option", { value: i, selected: i === sel[k] }, i))); return h("label", { style: { display: "flex", alignItems: "center", gap: "6px" } }, c, k === "h" ? "hours" : k === "m" ? "min" : "sec"); };
          b.append(h("div", { style: { display: "flex", justifyContent: "center", gap: "14px", marginTop: "80px" } }, col("h", 24), col("m", 60), col("s", 60)),
            h("div", { style: { display: "flex", justifyContent: "center", gap: "10px", marginTop: "26px" } }, ...[1, 3, 5, 10, 15].map(m => h("button", { style: { background: "#1c1c1e", borderRadius: "16px", padding: "8px 12px" }, onclick: () => { O.startTimer(m * 60000); draw(); } }, m + " min"))),
            h("button", { style: { marginTop: "40px", width: "84px", height: "84px", borderRadius: "50%", background: "#0a3a1a", color: "#30d158", fontSize: "17px" }, onclick: () => { const ms = (sel.h * 3600 + sel.m * 60 + sel.s) * 1000; if (ms) { O.startTimer(ms); draw(); } } }, "Start")); };
        draw(); O.on("timer", () => { if (document.contains(b)) draw(); });
        return { title: "Timers", b }; },
    ];
    let cur = null;
    const show = i => { if (cur && cur.b.cleanup) cur.b.cleanup(); host.innerHTML = ""; cur = pages[i](); host.append(h("div.nav", { style: { background: "#000" } }, h("div.bar", h("div.grp"), h("div.ttl"), h("div.grp", cur.right || "")), h("h1", cur.title)), h("div.scroll", { style: { position: "absolute", top: "140px", bottom: "0", left: 0, right: 0 } }, cur.b)); };
    const tabs = tabbar([{ icon: "home", label: "World Clock" }, { icon: "bell", label: "Alarms" }, { icon: "timer", label: "Stopwatch" }, { icon: "timer", label: "Timers" }], show, 1);
    tabs.style.background = "rgba(30,30,32,.8)"; tabs.style.setProperty("--ink2", "#aeaeb2"); tabs.style.setProperty("--fill", "rgba(255,255,255,.14)"); ctx.el.append(tabs); show(1);
    ctx.onIntent(it => { if (it.tab === "timer") tabs.select(3); });
  } });
// alarms fire from the shell clock tick, even when Clock is closed
let lastAlarmMinute = "";
O.on("tick", () => {
  const d = new Date(), hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (hm === lastAlarmMinute) return; lastAlarmMinute = hm;
  const al = O.appStore("clock").get("alarms", []) || [];
  al.filter(a => a.on && a.time === hm).forEach(a => { O.SOUND.alarm(); setTimeout(O.SOUND.alarm, 1200); O.notify({ app: "clock", title: a.label || "Alarm", body: hm, breakthrough: true }); });
});
O.on("add-alarm", time => { const st = O.appStore("clock"); st.set("alarms", [...(st.get("alarms", []) || []), { id: uid(), time, on: true, label: "Alarm" }]); });

/* ======================================================================== */
/* Calendar                                                                  */
/* ======================================================================== */
O.registerApp({ id: "calendar", name: "Calendar", bg: "#fff", glyph: () => O.svg(`<text x="12" y="8.5" text-anchor="middle" font-size="4.6" font-weight="700" fill="#ff3b30" stroke="none" font-family="system-ui">${new Date().toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}</text><text x="12" y="20" text-anchor="middle" font-size="11" fill="#111" stroke="none" font-family="system-ui" font-weight="300">${new Date().getDate()}</text>`), category: "Productivity", keywords: "events schedule date",
  render(ctx) {
    const st = ctx.store;
    const evs = () => st.get("events", [{ id: "e1", title: "Team stand-up", date: today(), time: "09:30" }, { id: "e2", title: "Dinner with Mia", date: today(), time: "19:00" }]);
    if (!st.get("seeded", false)) { st.set("events", evs()); st.set("seeded", true); }
    let view = new Date(); view.setDate(1); let sel = today();
    const body = h("div");
    const draw = () => {
      body.innerHTML = "";
      const y = view.getFullYear(), m = view.getMonth(); const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
      const all = evs();
      body.append(h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px 8px" } }, iconBtn("back", "Previous Month", () => { view.setMonth(m - 1); draw(); }), h("b", { style: { fontSize: "20px", color: "var(--red)" } }, view.toLocaleDateString(undefined, { month: "long", year: "numeric" })), iconBtn("fwd", "Next Month", () => { view.setMonth(m + 1); draw(); })));
      const grid = h("div", { style: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center", padding: "0 8px", rowGap: "4px" } }, ..."MTWTFSS".split("").map(d => h("div.sub", { style: { color: "var(--ink3)", fontSize: "11px" } }, d)));
      for (let i = 0; i < first; i++) grid.append(h("div"));
      for (let d = 1; d <= days; d++) { const ds = `${y}-${pad2(m + 1)}-${pad2(d)}`; const isT = ds === today(), isS = ds === sel; const has = all.some(e => e.date === ds);
        grid.append(h("button", { style: { height: "44px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px" }, onclick: () => { sel = ds; draw(); } },
          h("span", { style: { width: "32px", height: "32px", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "17px", background: isS ? (isT ? "var(--red)" : "var(--ink)") : "", color: isS ? "var(--bg)" : isT ? "var(--red)" : "", fontWeight: isT ? 700 : 400 } }, d),
          h("i", { style: { width: "5px", height: "5px", borderRadius: "50%", background: has ? "var(--ink3)" : "transparent" } }))); }
      body.append(grid, h("div", { style: { height: ".5px", background: "var(--sep)", margin: "10px 0" } }));
      const dayEvs = all.filter(e => e.date === sel).sort((a, b) => a.time.localeCompare(b.time));
      body.append(h("div.list-h", new Date(sel + "T12:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })));
      body.append(dayEvs.length ? list(...dayEvs.map(e => row({ title: h("span", h("span", { style: { display: "inline-block", width: "4px", height: "16px", background: "var(--red)", borderRadius: "2px", marginRight: "8px", verticalAlign: "middle" } }), e.title), val: e.time, entity: "event",
        onclick: () => O.sheet({ title: e.title, message: `${e.date} at ${e.time}`, actions: [{ label: "Delete Event", red: true, run: () => { st.set("events", evs().filter(x => x.id !== e.id)); draw(); } }] }) }))) : h("div.empty", { style: { padding: "20px" } }, "No Events"));
    };
    const add = async () => { const t = await O.prompt("New Event", "", "Title"); if (!t) return; const time = await O.prompt("Time (HH:MM)", "12:00"); if (!time) return; st.set("events", [...evs(), { id: uid(), title: t, date: sel, time: time.padStart(5, "0") }]); draw(); O.index.dirty = true; };
    const stack = ctx.stack(); stack.push(() => ({ title: "Calendar", large: false, left: h("button.btn", { onclick: () => { view = new Date(); view.setDate(1); sel = today(); draw(); } }, "Today"), right: plusBtn(add), body }));
    draw(); ctx.onShow(draw);
    ctx.onIntent(it => { if (it.date) { sel = it.date; view = new Date(it.date + "T12:00"); view.setDate(1); draw(); } });
  } });

/* ======================================================================== */
/* Weather (Open-Meteo, no key; falls back to sample data offline)           */
/* ======================================================================== */
const WMO = c => c === 0 ? ["Clear", "☀"] : c <= 2 ? ["Partly Cloudy", "⛅"] : c === 3 ? ["Cloudy", "☁"] : c <= 48 ? ["Fog", "🌫"] : c <= 67 ? ["Rain", "🌧"] : c <= 77 ? ["Snow", "❄"] : c <= 82 ? ["Showers", "🌦"] : ["Thunderstorm", "⛈"];
async function fetchWeather(name) {
  const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(name)}`)).json();
  const p = g.results && g.results[0]; if (!p) throw new Error("City not found");
  const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=10`)).json();
  const nowI = w.hourly.time.findIndex(t => t >= w.current.time.slice(0, 13));
  return { city: p.name, temp: Math.round(w.current.temperature_2m), code: w.current.weather_code, cond: WMO(w.current.weather_code)[0], hi: Math.round(w.daily.temperature_2m_max[0]), lo: Math.round(w.daily.temperature_2m_min[0]), live: true, fetched: Date.now(),
    hours: w.hourly.time.slice(Math.max(0, nowI), Math.max(0, nowI) + 24).map((t, i) => ({ h: i ? t.slice(11, 13) + "h" : "Now", t: Math.round(w.hourly.temperature_2m[nowI + i]), i: WMO(w.hourly.weather_code[nowI + i])[1] })),
    days: w.daily.time.map((t, i) => ({ d: i ? new Date(t + "T12:00").toLocaleDateString(undefined, { weekday: "short" }) : "Today", i: WMO(w.daily.weather_code[i])[1], lo: Math.round(w.daily.temperature_2m_min[i]), hi: Math.round(w.daily.temperature_2m_max[i]) })) };
}
/* ---------- animated weather backgrounds: drawn live behind the forecast, matching the current condition ---------- */
function weatherFx(canvas) {
  const g = canvas.getContext("2d"); let kind = "clear-day", raf = 0, t0 = performance.now(), parts = [], flash = 0, W = 0, Hh = 0;
  const cloudSprite = (() => {   // one soft cloud, drawn once and reused at different sizes
    const c = document.createElement("canvas"); c.width = 360; c.height = 200; const x = c.getContext("2d");
    [[120, 120, 70], [190, 95, 85], [260, 120, 65], [80, 140, 50], [300, 145, 45], [180, 145, 70]].forEach(([cx, cy, r]) => {
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(.7, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); });
    return c; })();
  function size() { const r = canvas.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); W = canvas.width = Math.max(1, r.width * d); Hh = canvas.height = Math.max(1, r.height * d); seed(); }
  function seed() {
    const n = { rain: 140, storm: 190, snow: 90, "clear-night": 120, cloudy: 7, partly: 4, fog: 6, "clear-day": 0 }[kind] || 0;
    parts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * Hh, z: .4 + Math.random() * .8, p: Math.random() * 6.28 }));
  }
  function frame(now) {
    const t = (now - t0) / 1000; g.clearRect(0, 0, W, Hh);
    if (kind === "clear-day" || kind === "partly") {   // sun glow with slowly turning rays
      const cx = W * .78, cy = Hh * .1, r = W * .55 * (1 + .03 * Math.sin(t * .8));
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, "rgba(255,244,200,.55)"); gr.addColorStop(.35, "rgba(255,226,150,.18)"); gr.addColorStop(1, "rgba(255,226,150,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
      g.save(); g.translate(cx, cy); g.rotate(t * .03); g.fillStyle = "rgba(255,250,220,.05)";
      for (let k = 0; k < 10; k++) { g.rotate(Math.PI / 5); g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 1.2, -W * .05); g.lineTo(W * 1.2, W * .05); g.fill(); }
      g.restore();
    }
    if (kind === "clear-night") parts.forEach(s => { g.fillStyle = `rgba(255,255,255,${.25 + .6 * Math.abs(Math.sin(t * s.z * 1.5 + s.p))})`; g.fillRect(s.x, s.y * .7, 1.6 * s.z, 1.6 * s.z); });
    if (kind === "cloudy" || kind === "partly" || kind === "rain" || kind === "storm") parts.slice(0, kind === "partly" ? 4 : 7).forEach((c, k) => {
      const w = W * (.55 + c.z * .5), x = ((c.x + t * 12 * c.z) % (W + w)) - w, y = Hh * (.04 + k * .07);
      g.globalAlpha = kind === "rain" || kind === "storm" ? .5 : .75; g.drawImage(cloudSprite, x, y, w, w * .55); g.globalAlpha = 1; });
    if (kind === "rain" || kind === "storm") { g.strokeStyle = "rgba(200,225,255,.55)"; g.lineWidth = 1.4; g.beginPath();
      parts.forEach(d => { const sp = Hh * (.9 + d.z) * .9; const y = (d.y + t * sp) % Hh, x = d.x - (y / Hh) * 30; g.moveTo(x, y); g.lineTo(x - 3, y + 14 * d.z); }); g.stroke(); }
    if (kind === "storm") { if (Math.random() < .004) flash = 1; if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * .5})`; g.fillRect(0, 0, W, Hh); flash -= .06; } }
    if (kind === "snow") { g.fillStyle = "rgba(255,255,255,.9)"; parts.forEach(f => { const y = (f.y + t * 40 * f.z) % Hh, x = f.x + Math.sin(t * f.z + f.p) * 18; g.beginPath(); g.arc(x, y, 2.4 * f.z, 0, 7); g.fill(); }); }
    if (kind === "fog") parts.forEach((b, k) => { const y = Hh * (.2 + k * .13), x = Math.sin(t * .1 * b.z + b.p) * W * .2; const gr = g.createLinearGradient(0, y - 40, 0, y + 40); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.5, "rgba(255,255,255,.16)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - W * .2, y - 40, W * 1.4, 80); });
    if (!O.settings.reduceMotion) raf = requestAnimationFrame(frame);
  }
  return {
    set(code, night) { kind = code >= 95 ? "storm" : code >= 71 && code <= 77 ? "snow" : code >= 51 ? "rain" : code >= 45 ? "fog" : code === 3 ? "cloudy" : code >= 1 ? (night ? "clear-night" : "partly") : night ? "clear-night" : "clear-day"; canvas.dataset.kind = kind; if (W) seed(); },
    start() { cancelAnimationFrame(raf); size(); raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    get kind() { return kind; },
  };
}
O.registerApp({ id: "weather", name: "Weather", bg: "linear-gradient(#4aa3ff,#1e5fd8)", glyph: "weather", category: "Information", status: "light", keywords: "forecast temperature rain",
  render(ctx) {
    const st = ctx.store;
    // sky gradient, then the animated layer, then the forecast on top
    const sky = h("div", { style: { position: "absolute", inset: 0, background: "linear-gradient(#2f6fd6,#5aa0ef)", transition: "background .6s" } });
    const fxCanvas = h("canvas.wx-fx", { "aria-hidden": "true", style: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" } });
    const fx = weatherFx(fxCanvas);
    const scr = h("div.scroll", { style: { color: "#fff", padding: "70px 18px 120px", textAlign: "center", background: "transparent", position: "absolute", inset: 0 } });
    ctx.el.append(sky, fxCanvas, scr);
    ctx.onHide(() => fx.stop()); ctx.onClose(() => fx.stop());
    const draw = w => {
      const night = new Date().getHours() < 6 || new Date().getHours() > 19;
      sky.style.background = w.code >= 95 ? "linear-gradient(#262d3d,#4a5468)" : w.code >= 51 ? "linear-gradient(#45546b,#7d8ba1)" : w.code === 3 || (w.code >= 45 && w.code < 51) ? "linear-gradient(#5f7590,#9fb0c3)" : night ? "linear-gradient(#0d1b3d,#2a3d6b)" : "linear-gradient(#2f6fd6,#5aa0ef)";
      fx.set(w.code, night); if (O.state.front === "weather" || !fx.kind) fx.start();
      const card = (...k) => h("div", { style: { background: "rgba(255,255,255,.14)", backdropFilter: "blur(20px)", borderRadius: "16px", padding: "12px", textAlign: "left", marginTop: "14px" } }, ...k);
      scr.innerHTML = "";
      scr.append(h("div", { dataset: { entity: "place", title: w.city }, style: { fontSize: "32px" } }, w.city), h("div", { style: { fontSize: "96px", fontWeight: 200, lineHeight: 1 } }, w.temp + "°"), h("div", { style: { fontSize: "20px" } }, w.cond), h("div", { style: { fontSize: "18px" } }, `H:${w.hi}°  L:${w.lo}°`),
        card(h("div.sub", { style: { color: "rgba(255,255,255,.7)", fontSize: "13px", borderBottom: ".5px solid rgba(255,255,255,.3)", paddingBottom: "8px" } }, w.live ? `Live data from Open-Meteo · ${new Date(w.fetched).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Sample data. Search a city to load a live forecast."),
          h("div", { style: { display: "flex", gap: "18px", overflowX: "auto", paddingTop: "10px" } }, w.hours.map(x => h("div", { style: { textAlign: "center", flex: "none", fontSize: "15px" } }, x.h, h("div", { style: { margin: "6px 0" }, html: O.wxIcon(x.i, 26) }), x.t + "°")))),
        card(h("div.sub", { style: { color: "rgba(255,255,255,.7)", fontSize: "13px" } }, "10-DAY FORECAST"), ...w.days.map(d => { const span = 40, min = Math.min(...w.days.map(x => x.lo)), max = Math.max(...w.days.map(x => x.hi));
          return h("div", { style: { display: "grid", gridTemplateColumns: "60px 30px 34px 1fr 34px", alignItems: "center", gap: "6px", padding: "8px 0", borderTop: ".5px solid rgba(255,255,255,.2)", fontSize: "17px" } }, d.d, h("span", { html: O.wxIcon(d.i, 24) }), h("span", { style: { opacity: .6 } }, d.lo + "°"),
            h("div", { style: { height: "5px", borderRadius: "3px", background: "rgba(0,0,0,.2)", position: "relative" } }, h("div", { style: { position: "absolute", height: "5px", borderRadius: "3px", left: ((d.lo - min) / (max - min || 1) * 100) + "%", right: (100 - (d.hi - min) / (max - min || 1) * 100) + "%", background: "linear-gradient(90deg,#8fd3fe,#ffd60a,#ff9f0a)" } })), d.hi + "°"); })),
        h("div", { style: { display: "flex", gap: "10px", justifyContent: "center", marginTop: "18px" } }, h("button.glass", { style: { padding: "8px 16px", borderRadius: "18px", color: "var(--tint-ink)" }, onclick: search }, "Search City"), h("button.glass", { style: { padding: "8px 16px", borderRadius: "18px", color: "var(--tint-ink)" }, onclick: locate }, "📍 My Location")));
    };
    async function load(name) { O.toast("Loading " + name + "…"); try { const w = await fetchWeather(name); O.setWeather(w); st.set("city", name); draw(w); } catch (e) { O.toast(navigator.onLine ? e.message : "Offline: showing sample data"); } }
    function search() { O.prompt("Search for a city", st.get("city", "")).then(v => v && load(v)); }
    function locate() {
      if (!navigator.geolocation) return O.toast("Location isn't available");
      navigator.geolocation.getCurrentPosition(async p => { try { const r = await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${p.coords.latitude}&lon=${p.coords.longitude}`)).json(); load(r.address.city || r.address.town || r.address.village || r.address.county || "London"); } catch { O.toast("Couldn't look up your city"); } }, () => O.toast("Location permission denied"));
    }
    draw(O.weatherNow());
    ctx.onShow(() => { const w = O.weatherNow(); draw(w); if (st.get("city") && (!w.fetched || Date.now() - w.fetched > 30 * 60e3)) load(st.get("city")); });
  } });

/* ======================================================================== */
/* Maps (OpenStreetMap embed + Nominatim search)                             */
/* ======================================================================== */
O.registerApp({ id: "maps", name: "Maps", bg: "linear-gradient(#8ee27c,#4cb3ff)", glyph: "map", category: "Information", keywords: "directions navigation location",
  render(ctx) {
    const st = ctx.store;
    const fr = h("iframe", { title: "Map", style: { position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "#e8e4da" }, referrerpolicy: "no-referrer" });
    const offline = h("div", { style: { position: "absolute", inset: "0 0 160px", display: "none", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", textAlign: "center", padding: "0 40px", color: "var(--ink2)", background: "var(--bg)" } },
      h("div", { style: { width: "56px", height: "56px", color: "var(--ink3)" }, html: O.svg(O.SYS.wifi) }), h("b", { style: { fontSize: "20px", color: "var(--ink)" } }, "Maps Needs the Internet"), h("div", "The map and place search load from OpenStreetMap. Connect to the internet and try again."),
      h("button.pill-btn", { style: { marginTop: "6px", minHeight: "44px", padding: "0 22px" }, onclick: () => { const [la, lo] = st.get("view", [51.5072, -0.1276]); setView(la, lo); } }, "Try Again"));
    // the iframe can't report failures across origins, so probe the map server directly
    const checkNet = () => fetch("https://tile.openstreetmap.org/0/0/0.png", { mode: "no-cors", cache: "no-store" }).then(() => { offline.style.display = "none"; }, () => { offline.style.display = "flex"; });
    fr.addEventListener("load", checkNet); window.addEventListener("online", checkNet); window.addEventListener("offline", checkNet);
    const setView = (lat, lon, z = .02) => { fr.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - z},${lat - z * .8},${lon + z},${lat + z * .8}&layer=mapnik&marker=${lat},${lon}`; st.set("view", [lat, lon]); };
    const [lat, lon] = st.get("view", [51.5072, -0.1276]); setView(lat, lon);
    const results = h("div");
    const inp = h("input", { placeholder: "Search Maps", "aria-label": "Search Maps", style: { flex: 1, minWidth: 0, border: 0, outline: 0, background: "none", fontSize: "17px", color: "var(--ink)" }, onkeydown: e => e.key === "Enter" && find(inp.value) });
    const sheetEl = h("div.glass", { style: { position: "absolute", left: "8px", right: "8px", bottom: "8px", borderRadius: "30px", padding: "14px 14px 30px" } },
      h("div", { style: { width: "36px", height: "5px", borderRadius: "3px", background: "var(--ink3)", margin: "-6px auto 10px" } }),
      h("div", { style: { display: "flex", alignItems: "center", gap: "8px", background: "var(--fill)", borderRadius: "12px", padding: "8px 10px" } }, h("span", { html: sys("search"), style: { width: "18px", opacity: .6 } }), inp, iconBtn("fwd", "My Location", me)),
      results);
    ctx.el.append(fr, offline, sheetEl); checkNet();
    async function find(q) {
      if (!q) return; results.innerHTML = "<div class='sub' style='padding:10px'>Searching…</div>";
      try { const r = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`)).json();
        results.innerHTML = ""; if (!r.length) results.append(h("div.sub", { style: { padding: "10px" } }, "No results"));
        r.forEach(p => results.append(h("div.row", { style: { background: "none" }, dataset: { entity: "place", title: p.display_name }, onclick: () => { setView(+p.lat, +p.lon, .01); results.innerHTML = ""; results.append(h("div", { style: { padding: "10px 4px" } }, h("b", p.display_name.split(",")[0]), h("div.sub", p.display_name), h("div", { style: { display: "flex", gap: "8px", marginTop: "10px" } }, h("button.pill-btn", { onclick: () => window.open(`https://www.openstreetmap.org/directions?to=${p.lat},${p.lon}`, "_blank", "noopener") }, "Directions"), h("button.pill-btn.grey", { onclick: () => O.share({ title: p.display_name, url: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}` }) }, "Share")))); } }, h("div.grow", h("div", p.display_name.split(",")[0]), h("div.sub", p.display_name.split(",").slice(1, 3).join(","))))));
      } catch { results.innerHTML = "<div class='sub' style='padding:10px'>Couldn't search. Check your internet connection and try again.</div>"; checkNet(); }
    }
    function me() { if (!navigator.geolocation) return O.toast("Location unavailable"); navigator.geolocation.getCurrentPosition(p => setView(p.coords.latitude, p.coords.longitude, .01), () => O.toast("Location permission denied")); }
    ctx.onIntent(it => { if (it.q) { inp.value = it.q; find(it.q); } });
  } });

/* ======================================================================== */
/* Notes (with writing tools)                                                */
/* ======================================================================== */
const Writing = {
  proofread(t) {
    let s = t.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.!?;:])/g, "$1").replace(/([,.!?;:])(?=[A-Za-z])/g, "$1 ").replace(/\bi\b/g, "I").replace(/\bim\b/gi, "I'm").replace(/\bdont\b/gi, "don't").replace(/\bcant\b/gi, "can't").replace(/\bwont\b/gi, "won't").replace(/\bteh\b/gi, "the").replace(/\brecieve/gi, "receive").replace(/\bdefinately\b/gi, "definitely").replace(/\bseperate/gi, "separate").replace(/\balot\b/gi, "a lot");
    s = s.replace(/(^|[.!?]\s+|\n)([a-z])/g, (m, a, b) => a + b.toUpperCase());
    return s;
  },
  summary: t => summarizeText(t),
  keyPoints: t => (t.match(/[^.!?\n]+[.!?]?/g) || []).map(x => x.trim()).filter(x => x.length > 3).slice(0, 6).map(x => "• " + x).join("\n"),
  list: t => t.split(/\n|,\s*|;\s*/).map(x => x.trim()).filter(Boolean).map(x => "- " + x.replace(/^[-•*]\s*/, "")).join("\n"),
  friendly: t => Writing.proofread(t).replace(/\bHello\b/g, "Hey").replace(/\bThank you\b/g, "Thanks so much").replace(/\bRegards\b/g, "Cheers").replace(/\.$/, "! 😊"),
  professional: t => Writing.proofread(t).replace(/\b[Hh]ey\b/g, "Hello").replace(/\b[Tt]hanks\b/g, "Thank you").replace(/\bgonna\b/g, "going to").replace(/\bwanna\b/g, "want to").replace(/\bstuff\b/g, "items").replace(/!+/g, ".").replace(/[😀-🙏]/gu, ""),
  concise: t => Writing.proofread(t).replace(/\b(really|very|just|actually|basically|literally|totally|quite|honestly)\s+/gi, "").replace(/\bin order to\b/gi, "to").replace(/\bat this point in time\b/gi, "now").replace(/\bdue to the fact that\b/gi, "because"),
};
O.Writing = Writing;
O.registerApp({ id: "notes", name: "Notes", bg: "linear-gradient(#fff,#f2f2f2)", glyph: "note", category: "Productivity", keywords: "write text memo writing tools",
  quick: [{ label: "New Note", run: () => O.emit("note-new") }],
  render(ctx) {
    const st = ctx.store;
    const notes = () => st.get("notes", []);
    const save = n => { st.set("notes", n); O.index.dirty = true; };
    const stack = ctx.stack();
    const body = h("div");
    let q = "";
    const draw = () => { body.innerHTML = "";
      body.append(h("div.searchbar", { html: sys("search") }, h("input", { placeholder: "Search", value: q, oninput: e => { q = e.target.value.toLowerCase(); drawList(); } })));
      const lb = h("div"); body.append(lb);
      const drawList = () => { lb.innerHTML = ""; const all = notes().filter(n => n.text.toLowerCase().includes(q)).sort((a, b) => (b.pinned - a.pinned) || b.t - a.t);
        const pin = all.filter(n => n.pinned), rest = all.filter(n => !n.pinned);
        const mk = n => row({ title: h("b", n.text.split("\n")[0] || "New Note"), sub: `${new Date(n.t).toLocaleDateString()}  ${n.text.split("\n").slice(1).join(" ").slice(0, 40)}`, entity: "note", onclick: () => edit(n.id) });
        if (pin.length) lb.append(hdr("Pinned"), list(...pin.map(mk)));
        if (rest.length) lb.append(hdr("Notes"), list(...rest.map(mk)));
        if (!all.length) lb.append(h("div.empty", "No Notes")); };
      drawList(); };
    draw();
    stack.push(() => ({ title: "Notes", body, after: h("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 20px 34px", display: "flex", justifyContent: "space-between", alignItems: "center" } }, h("span.sub", `${notes().length} Notes`), plusBtn(() => edit(null), "pen")), onReturn: draw }));
    function edit(id, initial = "") {
      let all = notes(); let n = all.find(x => x.id === id);
      if (!n) { n = { id: uid(), text: initial, t: Date.now() }; all.unshift(n); save(all); }
      const ta = h("textarea", { value: n.text, placeholder: "Start typing", style: { width: "100%", height: "100%", border: 0, outline: 0, background: "none", resize: "none", fontSize: "17px", lineHeight: 1.45, padding: "4px 18px 100px" },
        oninput: () => { const a = notes(); const x = a.find(y => y.id === n.id); if (x) { x.text = ta.value; x.t = Date.now(); save(a); } } });
      const tools = () => {
        const sel = ta.selectionStart !== ta.selectionEnd; const src = sel ? ta.value.slice(ta.selectionStart, ta.selectionEnd) : ta.value;
        const apply = fn => { const out = fn(src); if (sel) { ta.setRangeText(out, ta.selectionStart, ta.selectionEnd, "select"); } else ta.value = out; ta.dispatchEvent(new Event("input")); O.toast("✦ Done"); };
        O.sheet({ title: "✦ Writing Tools", message: sel ? "Applies to the selected text" : "Applies to the whole note", actions: [
          { label: "Proofread", run: () => apply(Writing.proofread) }, { label: "Rewrite: Friendly", run: () => apply(Writing.friendly) }, { label: "Rewrite: Professional", run: () => apply(Writing.professional) }, { label: "Rewrite: Concise", run: () => apply(Writing.concise) },
          { label: "Summary", run: () => O.alert({ title: "Summary", message: Writing.summary(src) }) }, { label: "Key Points", run: () => apply(t => t + "\n\nKey points:\n" + Writing.keyPoints(t)) }, { label: "Make List", run: () => apply(Writing.list) },
        ] });
      };
      stack.push(() => ({ title: "", large: false, right: h("div.grp", h("button.btn", { title: "Writing Tools", onclick: tools }, "✦"), h("button.btn", { onclick: () => O.share({ title: n.text.split("\n")[0], text: ta.value }) }, "⤴"),
        h("button.btn", { onclick: () => O.sheet({ actions: [{ label: n.pinned ? "Unpin" : "Pin Note", run: () => { const a = notes(); const x = a.find(y => y.id === n.id); x.pinned = !x.pinned; n.pinned = x.pinned; save(a); } }, { label: "Insert Checklist", run: () => { ta.setRangeText("\n☐ ", ta.selectionStart, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); } }, { label: "Delete", red: true, run: () => { save(notes().filter(x => x.id !== n.id)); stack.pop(); } }] }) }, "⋯")),
        body: h("div", { style: { height: "100%" } }, h("div.sub", { style: { textAlign: "center", color: "var(--ink3)", fontSize: "13px" } }, new Date(n.t).toLocaleString()), ta), back: "Notes",
        onReturn: draw }));
      ta.addEventListener("click", e => { const p = ta.selectionStart; const line0 = ta.value.lastIndexOf("\n", p - 1) + 1; const ch = ta.value[line0]; if ((ch === "☐" || ch === "☑") && p - line0 <= 1) { ta.setRangeText(ch === "☐" ? "☑" : "☐", line0, line0 + 1, "preserve"); ta.dispatchEvent(new Event("input")); } });
      setTimeout(() => !n.text && ta.focus(), 400);
      // drop empty notes on leaving
      const origPop = stack.pop; stack.pop = (...a) => { const x = notes().find(y => y.id === n.id); if (x && !x.text.trim()) save(notes().filter(y => y.id !== n.id)); stack.pop = origPop; return origPop(...a); };
    }
    O.on("note-new", () => edit(null));
    O.on("notes-changed", (id, openIt) => { if (openIt) { O.open("notes"); setTimeout(() => { stack.popToRoot(); edit(id); }, 500); } else if (stack.depth === 1) draw(); });
    ctx.onIntent(it => { if (it.create != null) { stack.popToRoot(); edit(null, it.create); } if (it.note) { stack.popToRoot(); edit(it.note); } });
  } });

/* ======================================================================== */
/* Reminders                                                                 */
/* ======================================================================== */
O.registerApp({ id: "reminders", name: "Reminders", bg: "#fff", glyph: "checklist", category: "Productivity", keywords: "todo tasks list",
  render(ctx) {
    const st = ctx.store;
    const items = () => st.get("items", []);
    const save = x => { st.set("items", x); O.index.dirty = true; };
    let showDone = false;
    const body = h("div");
    const draw = () => { body.innerHTML = ""; const all = items(); const tb = body.closest && body.closest(".scr")?.querySelector(".nav .grp:last-child .btn"); if (tb) tb.textContent = showDone ? "Hide Completed" : "Show Completed";
      const counts = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "0 16px 16px" } }, ...[["Today", all.filter(i => !i.done).length, "#0a84ff"], ["Flagged", all.filter(i => i.flag && !i.done).length, "#ff9f0a"], ["All", all.length, "#555"], ["Completed", all.filter(i => i.done).length, "#8e8e93"]].map(([n, c, col]) =>
        h("div", { style: { background: "var(--card)", borderRadius: "12px", padding: "10px 12px" }, onclick: () => { if (n === "Completed") { showDone = !showDone; draw(); } } }, h("div", { style: { display: "flex", justifyContent: "space-between" } }, h("span", { style: { width: "30px", height: "30px", borderRadius: "50%", background: col, display: "inline-block" } }), h("b", { style: { fontSize: "24px" } }, c)), h("div.sub", { style: { color: "var(--ink3)", fontWeight: 600 } }, n))));
      body.append(counts, hdr("Reminders"));
      const L = h("div.list");
      all.filter(i => showDone || !i.done).forEach(i => { const r = h("div.row", { dataset: { entity: "reminder", title: i.text } },
        h("button", { style: { width: "22px", height: "22px", borderRadius: "50%", border: "2px solid " + (i.done ? "var(--accent)" : "var(--ink3)"), background: i.done ? "radial-gradient(var(--accent) 50%, transparent 55%)" : "", flex: "none" }, onclick: () => { const a = items(); a.find(x => x.id === i.id).done = !i.done; save(a); setTimeout(draw, 250); O.haptic(); } }),
        h("div.grow", { style: { color: i.done ? "var(--ink3)" : "" } }, i.text), i.flag ? h("span", { style: { color: "var(--orange)" } }, "⚑") : null);
        r.addEventListener("contextmenu", e => { e.preventDefault(); menu(i); }); r.querySelector(".grow").onclick = () => menu(i); L.append(r); });
      const input = h("input", { placeholder: "New Reminder", style: { border: 0, outline: 0, background: "none", flex: 1, fontSize: "17px" }, onkeydown: e => { if (e.key === "Enter" && input.value.trim()) { save([...items(), { id: uid(), text: input.value.trim(), done: false }]); draw(); body.querySelector("input")?.focus(); } } });
      L.append(h("div.row", h("span", { style: { color: "var(--accent)", fontSize: "22px" } }, "+"), input)); body.append(L); };
    const menu = i => O.sheet({ title: i.text, actions: [{ label: i.flag ? "Unflag" : "Flag", run: () => { const a = items(); a.find(x => x.id === i.id).flag = !i.flag; save(a); draw(); } }, { label: "Rename", run: () => O.prompt("Rename", i.text).then(v => { if (v) { const a = items(); a.find(x => x.id === i.id).text = v; save(a); draw(); } }) }, { label: "Delete", red: true, run: () => { save(items().filter(x => x.id !== i.id)); draw(); } }] });
    draw(); ctx.stack().push(() => ({ title: "Reminders", right: h("button.btn", { onclick: () => { showDone = !showDone; draw(); } }, showDone ? "Hide Completed" : "Show Completed"), body }));
    O.on("reminders-changed", draw);
    ctx.onShow(draw);
  } });

/* ======================================================================== */
/* Music: original procedurally generated tracks played with Web Audio       */
/* ======================================================================== */
const TRACKS = [
  { title: "Glass Morning", artist: "Glassline Studio", bpm: 92, root: 60, scale: [0, 2, 4, 7, 9], art: "linear-gradient(135deg,#ffb38a,#c49bff)", wave: "triangle" },
  { title: "Night Drive", artist: "Glassline Studio", bpm: 108, root: 57, scale: [0, 3, 5, 7, 10], art: "linear-gradient(135deg,#0f0c29,#6a3093)", wave: "sawtooth" },
  { title: "Lagoon", artist: "Synth Sessions", bpm: 80, root: 62, scale: [0, 2, 5, 7, 9], art: "linear-gradient(135deg,#6ff7e8,#1fa2ff)", wave: "sine" },
  { title: "Ember Steps", artist: "Synth Sessions", bpm: 120, root: 55, scale: [0, 2, 3, 7, 8], art: "linear-gradient(135deg,#ffd27a,#ff5f6d)", wave: "square" },
  { title: "Meadow Loop", artist: "Field Tones", bpm: 98, root: 64, scale: [0, 2, 4, 5, 7, 9, 11], art: "linear-gradient(135deg,#d4fc79,#30cfd0)", wave: "triangle" },
];
const TRACK_LEN = 48;
O.registerApp({ id: "music", name: "Music", bg: "linear-gradient(#ff6b8a,#fa2d48)", glyph: "music", category: "Entertainment", keywords: "songs player audio playlist",
  render(ctx) {
    let ti = 0, playing = false, started = 0, offset = 0, ac = null, master = null, timer = 0, step = 0, shuffle = false, repeat = true;
    const tr = () => TRACKS[ti];
    function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    function note(f, t, d, type, g) { const o = ac.createOscillator(), gg = ac.createGain(); o.type = type; o.frequency.value = f; gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(g, t + .02); gg.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(gg).connect(master); o.start(t); o.stop(t + d + .05); }
    function drum(t, kind) { const o = ac.createOscillator(), g = ac.createGain(); if (kind === "k") { o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .15); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .2); }
      else { o.type = "square"; o.frequency.value = 2400 + Math.random() * 800; g.gain.setValueAtTime(.04, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); } o.connect(g).connect(master); o.start(t); o.stop(t + .25); }
    let rng = 1; const rnd = () => (rng = (rng * 16807) % 2147483647) / 2147483647;
    function schedule() {
      const t = tr(), spb = 60 / t.bpm / 2; const now = ac.currentTime;
      while (nextT < now + .2) {
        const bar = Math.floor(step / 8) % 4, chordRoot = t.root + [0, 5, 7, 3][bar] - 12;
        if (step % 8 === 0) [0, 4, 7].forEach(iv => note(mtof(chordRoot + (iv === 4 && t.scale.includes(3) ? 3 : iv)), nextT, spb * 7, "sine", .05));
        if (step % 2 === 0 || rnd() > .6) { const deg = t.scale[Math.floor(rnd() * t.scale.length)]; note(mtof(t.root + deg + (rnd() > .7 ? 12 : 0)), nextT, spb * 1.6, t.wave, t.wave === "sine" ? .12 : .045); }
        if (step % 4 === 0) drum(nextT, "k"); if (step % 2 === 1) drum(nextT, "h");
        if (step % 8 === 0) note(mtof(chordRoot - 12), nextT, spb * 3.5, "triangle", .12);
        nextT += spb; step++;
      }
      if (elapsed() >= TRACK_LEN) { if (repeat || ti < TRACKS.length - 1) next(); else pause(); }
      draw();
    }
    let nextT = 0;
    const elapsed = () => offset + (playing ? (performance.now() - started) / 1000 : 0);
    function play() {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume();
      if (!master) { master = ac.createGain(); master.connect(ac.destination); }
      master.gain.value = O.settings.silent ? .5 * O.settings.volume : O.settings.volume;
      rng = 7 + ti * 31 + step; if (!playing) { playing = true; started = performance.now(); nextT = ac.currentTime + .05; clearInterval(timer); timer = setInterval(schedule, 60); }
      update();
    }
    function pause() { if (playing) { offset = elapsed(); playing = false; } clearInterval(timer); update(); }
    function load(i) { const was = playing; pause(); ti = (i + TRACKS.length) % TRACKS.length; offset = 0; step = 0; if (was) play(); update(); }
    function next() { load(shuffle ? Math.floor(Math.random() * TRACKS.length) : ti + 1); }
    function prev() { if (elapsed() > 3) { offset = 0; step = 0; started = performance.now(); update(); } else load(ti - 1); }
    O.on("settings", k => { if (k === "volume" && master) master.gain.value = O.settings.volume; });
    O.media.player = { state: () => ({ playing, title: tr().title, artist: tr().artist, art: tr().art, progress: elapsed() / TRACK_LEN }), toggle: () => playing ? pause() : play(), play, pause, next, prev, stop: () => { pause(); offset = 0; } };
    const art = h("div", { style: { width: "300px", height: "300px", borderRadius: "16px", margin: "10px auto 26px", boxShadow: "0 20px 50px rgba(0,0,0,.3)", transition: "transform .4s cubic-bezier(.3,1.4,.5,1)" } });
    const title = h("div", { style: { fontSize: "22px", fontWeight: 700 } }), artist = h("div", { style: { fontSize: "18px", color: "var(--pink)" } });
    const bar = h("div", { style: { height: "6px", borderRadius: "3px", background: "var(--fill)", margin: "20px 0 4px", cursor: "pointer" }, onclick: e => { const r = e.currentTarget.getBoundingClientRect(); offset = (e.clientX - r.left) / r.width * TRACK_LEN; started = performance.now(); draw(); } }, h("div", { style: { height: "6px", borderRadius: "3px", background: "var(--ink2)", width: "0" } }));
    const times = h("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--ink3)" } }, h("span"), h("span"));
    const pp = h("button.ibtn.pp", { style: { width: "84px", height: "84px" }, onclick: () => O.media.player.toggle() });
    const ctrl = h("div", { style: { display: "flex", justifyContent: "space-around", alignItems: "center", margin: "18px 0" } }, h("button.ibtn", { "aria-label": "Previous", style: { width: "64px", height: "64px" }, onclick: prev, html: sys("prev") }), pp, h("button.ibtn", { "aria-label": "Next", style: { width: "64px", height: "64px" }, onclick: next, html: sys("next") }));
    const extra = h("div", { style: { display: "flex", justifyContent: "space-around", color: "var(--ink3)", fontSize: "18px" } }, h("button", { onclick: e => { shuffle = !shuffle; e.currentTarget.style.color = shuffle ? "var(--pink)" : ""; } }, h("span", { html: sys("shuffle") }), " Shuffle"), h("button", { onclick: e => { repeat = !repeat; e.currentTarget.style.color = repeat ? "var(--pink)" : ""; }, style: { color: "var(--pink)" } }, h("span", { html: sys("reload") }), " Repeat"));
    const lib = h("div");
    const player = h("div", { style: { padding: "0 30px" } }, art, title, artist, bar, times, ctrl, extra);
    const drawLib = () => { lib.innerHTML = ""; lib.append(hdr("Library · original generated tracks"), list(...TRACKS.map((t, i) => row({ title: h("span", { style: { color: i === ti ? "var(--pink)" : "" } }, t.title), sub: t.artist, val: i === ti && playing ? "♫" : "0:48", entity: "song", onclick: () => { load(i); play(); } })))); };
    function draw() { const e = elapsed(); bar.firstChild.style.width = Math.min(100, e / TRACK_LEN * 100) + "%"; times.children[0].textContent = O.fmtDur(e * 1000).replace(/^(\d):/, "$1:"); times.children[1].textContent = "-" + O.fmtDur((TRACK_LEN - e) * 1000); }
    // generated cover art: the track's colours with rings and a wave drawn from its scale, so every track looks distinct
    function cover(t, i) {
      const pts = t.scale.map((d, k) => `${20 + k * (260 / Math.max(1, t.scale.length - 1))},${200 - d * 9}`).join(" ");
      return `<svg viewBox="0 0 300 300" width="100%" height="100%" style="border-radius:16px;display:block"><circle cx="${70 + i * 37 % 160}" cy="${80 + i * 53 % 120}" r="120" fill="#fff" opacity=".14"/><circle cx="230" cy="230" r="${60 + i * 9}" fill="none" stroke="#fff" stroke-width="14" opacity=".2"/><polyline points="${pts}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/><text x="24" y="270" fill="#fff" font-family="system-ui,sans-serif" font-size="26" font-weight="700" opacity=".92">${t.title}</text></svg>`;
    }
    function update() { art.style.background = tr().art; art.innerHTML = cover(tr(), ti); art.style.transform = playing ? "scale(1)" : "scale(.86)"; title.textContent = tr().title; artist.textContent = tr().artist; pp.innerHTML = sys(playing ? "pause" : "play"); pp.setAttribute("aria-label", playing ? "Pause" : "Play"); draw(); drawLib(); O.live.update(); O.emit("media"); }
    ctx.stack().push(() => ({ title: "Listen Now", body: h("div", player, h("div", { style: { height: "20px" } }), lib) }));
    update();
    ctx.onClose(() => { pause(); O.media.player = null; O.live.update(); });
  } });

/* ======================================================================== */
/* Calculator                                                                */
/* ======================================================================== */
O.registerApp({ id: "calculator", name: "Calculator", bg: "#1c1c1e", glyph: "calc", category: "Utilities", status: "light", keywords: "math maths numbers",
  render(ctx) {
    ctx.el.style.background = "#000"; ctx.el.style.color = "#fff";
    let cur = "0", acc = null, op = null, fresh = true, expr = "";
    const disp = h("div", { style: { fontSize: "86px", fontWeight: 300, textAlign: "right", padding: "0 26px", marginTop: "auto", whiteSpace: "nowrap", overflow: "hidden" }, dataset: { entity: "number" } });
    const exprEl = h("div", { style: { fontSize: "24px", textAlign: "right", padding: "0 28px", color: "#8e8e93", minHeight: "30px" } });
    const fmt = s => { const n = +s; if (s.endsWith(".") || /\.\d*0$/.test(s) && s.includes(".")) return s; if (!isFinite(n)) return "Error"; const t = Math.abs(n) >= 1e9 || (Math.abs(n) < 1e-6 && n) ? n.toExponential(4) : (+n.toPrecision(9)).toLocaleString(undefined, { maximumFractionDigits: 8 }); return t; };
    const fit = () => { const t = fmt(cur); disp.textContent = t; disp.dataset.title = t; disp.style.fontSize = t.length > 9 ? "56px" : t.length > 6 ? "70px" : "86px"; exprEl.textContent = expr; $$("[data-op]", pad).forEach(b => { const on = b.dataset.op === op && fresh; b.style.background = on ? "#fff" : "#ff9f0a"; b.style.color = on ? "#ff9f0a" : "#fff"; }); acB.textContent = cur !== "0" && !fresh ? "⌫" : "AC"; };
    const calc = (a, b, o) => o === "+" ? a + b : o === "−" ? a - b : o === "×" ? a * b : o === "÷" ? (b === 0 ? NaN : a / b) : b;
    const press = k => {
      O.SOUND.click(); O.haptic(4);
      if (/[0-9]/.test(k)) { if (fresh) { cur = k; fresh = false; } else if (cur.replace(/[-.]/g, "").length < 9) cur = cur === "0" ? k : cur + k; }
      else if (k === ".") { if (fresh) { cur = "0."; fresh = false; } else if (!cur.includes(".")) cur += "."; }
      else if (k === "AC") { cur = "0"; acc = null; op = null; fresh = true; expr = ""; }
      else if (k === "⌫") { cur = cur.length > 1 ? cur.slice(0, -1) : "0"; if (cur === "-") cur = "0"; }
      else if (k === "±") { cur = cur.startsWith("-") ? cur.slice(1) : cur === "0" ? cur : "-" + cur; }
      else if (k === "%") { cur = String(+cur / 100); }
      else if ("+−×÷".includes(k)) { if (op && !fresh) { acc = calc(acc, +cur, op); cur = String(acc); } else acc = +cur; op = k; fresh = true; expr = fmt(String(acc)) + " " + k; }
      else if (k === "=") { if (op) { const b = +cur; expr = `${fmt(String(acc))} ${op} ${fmt(String(b))} =`; cur = String(calc(acc, b, op)); acc = null; op = null; fresh = true; } }
      fit();
    };
    const pad = h("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,80px)", gap: "14px", justifyContent: "center", padding: "20px 0 50px" } });
    let acB;
    [["AC", "#a5a5a5"], ["±", "#a5a5a5"], ["%", "#a5a5a5"], ["÷", "#ff9f0a"], ["7"], ["8"], ["9"], ["×", "#ff9f0a"], ["4"], ["5"], ["6"], ["−", "#ff9f0a"], ["1"], ["2"], ["3"], ["+", "#ff9f0a"], ["0", null, 2], ["."], ["=", "#ff9f0a"]].forEach(([k, bg, span]) => {
      const b = h("button", { style: { height: "80px", borderRadius: "40px", background: bg || "#333", color: bg === "#a5a5a5" ? "#000" : "#fff", fontSize: "34px", gridColumn: span ? "span 2" : "", textAlign: span ? "left" : "center", paddingLeft: span ? "30px" : "" }, dataset: "+−×÷".includes(k) ? { op: k } : null, onclick: () => press(k === "AC" ? b.textContent : k) }, k);
      if (k === "AC") acB = b; pad.append(b);
    });
    ctx.el.append(h("div", { style: { display: "flex", flexDirection: "column", height: "100%" } }, exprEl, disp, pad));
    fit();
    const keyH = e => { if (O.state.front !== "calculator" || e.target.closest("input,textarea")) return; const m = { "*": "×", "/": "÷", "-": "−", "+": "+", Enter: "=", "=": "=", Backspace: "⌫", Escape: "AC", ".": ".", "%": "%" }; const k = /^[0-9]$/.test(e.key) ? e.key : m[e.key]; if (k) { e.stopPropagation(); press(k); } };
    document.addEventListener("keydown", keyH, true); ctx.onClose(() => document.removeEventListener("keydown", keyH, true));
  } });

/* ======================================================================== */
/* Settings                                                                  */
/* ======================================================================== */
O.registerApp({ id: "settings", name: "Settings", bg: "linear-gradient(#b8b8bd,#7c7c82)", glyph: "gear", category: "Utilities", removable: false, keywords: "preferences options configure",
  render(ctx) {
    const S = O.settings;
    const stack = ctx.stack();
    const tog = (k, after) => ({ on: !!S[k], change: v => { O.set(k, v); after && after(v); } });
    const PAGES = {
      "Wi-Fi": () => ({ title: "Wi-Fi", body: h("div", list(row({ title: h("b", "Wi-Fi"), tog: tog("wifi", () => stack.top && (stack.pop(), setTimeout(() => open("Wi-Fi"), 400))) }), S.wifi ? row({ title: "✓  Home Network", sub: "Secured" }) : null),
        S.wifi ? [hdr("Other Networks"), list(...["Cafe Guest", "Library-Free", "Neighbour 5G"].map(n => row({ title: n, val: "🔒 ⌔", onclick: () => O.prompt(`Password for “${n}”`, "", "Password").then(v => v && O.toast("Simulated: not a real network")) })))] : foot("Wi-Fi is off."),
        foot("Networks shown here are simulated. Your computer's real network is used for internet access.")) }),
      "Bluetooth": () => ({ title: "Bluetooth", body: h("div", list(row({ title: h("b", "Bluetooth"), tog: tog("bluetooth") })), S.bluetooth ? [hdr("My Devices"), list(row({ title: "Glass Buds", val: "Connected" }), row({ title: "Car Audio", val: "Not Connected" }))] : null, foot("Devices are simulated.")) }),
      "Cellular": () => ({ title: "Cellular", body: h("div", list(row({ title: "Cellular Data", tog: tog("cellular") }), row({ title: "Personal Hotspot", tog: tog("hotspot") }))) }),
      "Notifications": () => ({ title: "Notifications", body: h("div", list(row({ title: "Summarize Notifications", sub: "Group and summarize on the Lock Screen", tog: tog("summaries") }), row({ title: "Simulated Incoming Messages", sub: "Contacts text you every minute or two", tog: tog("simulateMessages") })),
        list(row({ title: "Send a Test Notification", onclick: () => { O.goHome(); setTimeout(() => O.notify({ app: "settings", title: "Test", body: "This is what a banner looks like." }), 600); } }), row({ title: h("span", { style: { color: "var(--red)" } }, "Clear All Notifications"), onclick: () => { O.saved.notifications = []; O.persist(); O.toast("Cleared"); } }))) }),
      "Sounds & Haptics": () => { const sl = h("input", { type: "range", min: 0, max: 100, value: S.volume * 100, style: { width: "100%" }, oninput: e => { O.set("volume", e.target.value / 100); O.hud(S.volume); } });
        return { title: "Sounds & Haptics", body: h("div", hdr("Ringer and Alerts"), list(row({ title: sl })), list(row({ title: "Silent Mode", tog: tog("silent") }), row({ title: "System Sounds", tog: tog("sounds") }), row({ title: "System Haptics", sub: "Vibration on supported phones", tog: tog("haptics") })),
          list(row({ title: "Preview Notification Sound", onclick: O.SOUND.notify }), row({ title: "Preview Alarm", onclick: O.SOUND.alarm }))) }; },
      "Focus": () => ({ title: "Focus", body: h("div", list(...["Do Not Disturb", "Sleep", "Personal", "Work", "Driving"].map(f => row({ title: f, icon: "moon", color: { "Do Not Disturb": "#5e5ce6", Sleep: "#30b0c7", Personal: "#bf5af2", Work: "#30d158", Driving: "#0a84ff" }[f], val: S.focus === f ? "On" : "", onclick: () => { O.set("focus", S.focus === f ? null : f); stack.pop(); setTimeout(() => open("Focus"), 420); } }))), foot("When a Focus is on, banners and sounds are silenced. Timers and alarms still break through.")) }),
      "General": () => ({ title: "General", body: h("div", list(row({ title: "About", go: true, onclick: () => stack.push(about) }), row({ title: "Software Update", go: true, onclick: () => stack.push(() => ({ title: "Software Update", body: h("div.empty", h("div", { style: { fontSize: "40px" } }, "✓"), "Glassline OS 27.0 (web)", h("br"), "Glassline OS is up to date.", h("br"), h("small", "Reload the page to pick up new versions of the files.")) })) }), row({ title: "Storage", go: true, onclick: () => stack.push(storage) })),
        O.androidHome ? list(row({ title: "Use as Home Screen", sub: O.androidHome.isDefault() ? "Glassline is your Home app" : "Choose Glassline in Android's Home app setting", go: true, onclick: O.androidHome.choose }), row({ title: "Android Settings", go: true, onclick: O.androidHome.systemSettings }),
          row({ title: "Edge Swipes in Every App", sub: "Pull down from the top left or right inside any app for Notification Centre or Control Centre", tog: { on: O.androidHome.edgeOn(), change: v => { if (!O.androidHome.setEdge(v) && v) O.toast("Allow “Display over other apps”, then turn this on again"); } } }),
          row({ title: "Restyle System Apps", sub: "Phone, Messages, Camera, Photos, Clock and other built-in apps use Glassline's iOS-style icons", tog: { on: O.androidHome.restyleOn(), change: v => O.androidHome.setRestyle(v) } }),
          row({ title: "Icon Pack", val: O.androidHome.iconPackName(), go: true, onclick: () => O.androidHome.chooseIconPack() })) : null,
        list(row({ title: "Date & Time", val: Intl.DateTimeFormat().resolvedOptions().timeZone }), row({ title: "Language & Region", val: navigator.language }), row({ title: "Keyboard", val: "System keyboard" })),
        list(row({ title: "Transfer or Reset", go: true, onclick: () => O.sheet({ title: "Reset", actions: [{ label: "Reset Home Screen Layout", run: () => { delete O.saved.layout; O.persist(); O.renderHome(); O.toast("Layout reset"); } }, { label: "Erase All Content and Settings", red: true, run: () => O.alert({ title: "Erase this phone?", message: "All notes, photos, messages, apps and settings stored by Glassline in this browser will be deleted.", buttons: [{ label: "Cancel" }, { label: "Erase", red: true, run: () => O.reset() }] }) }] }) }),
          row({ title: "Shut Down", onclick: () => { O.goHome(); setTimeout(() => document.getElementById("hwPower").dispatchEvent(new PointerEvent("pointerdown")), 300); setTimeout(() => document.getElementById("hwPower").dispatchEvent(new PointerEvent("pointerup")), 2600); } }))) }),
      "Display & Brightness": () => { const sl = h("input", { type: "range", min: 15, max: 100, value: S.brightness * 100, style: { width: "100%" }, oninput: e => O.set("brightness", e.target.value / 100) });
        const app = h("div", { style: { display: "flex", justifyContent: "space-around", padding: "16px 0" } }, ...[["light", "Light", "#f2f2f7"], ["dark", "Dark", "#1c1c1e"], ["auto", "Automatic", "linear-gradient(90deg,#f2f2f7 50%,#1c1c1e 50%)"]].map(([k, l, bg]) => h("button", { style: { textAlign: "center" }, onclick: () => { O.set("appearance", k); stack.pop(); setTimeout(() => open("Display & Brightness"), 420); } }, h("div", { style: { width: "70px", height: "130px", borderRadius: "12px", background: bg, border: ".5px solid var(--sep)", marginBottom: "6px" } }), l, h("div", S.appearance === k ? "◉" : "○"))));
        return { title: "Display & Brightness", body: h("div", hdr("Appearance"), h("div.list", app), hdr("Brightness"), list(row({ title: sl })), list(row({ title: "Night Shift", sub: "Warmer colours", tog: tog("nightShift") }), row({ title: "Bold Text", tog: tog("boldText") }),
          row({ title: "Auto-Lock", val: S.autoLock ? (S.autoLock < 60 ? S.autoLock + " seconds" : S.autoLock / 60 + " minutes") : "Never", go: true, onclick: () => O.sheet({ title: "Auto-Lock", actions: [[30, "30 seconds"], [60, "1 minute"], [120, "2 minutes"], [300, "5 minutes"], [0, "Never"]].map(([v, l]) => ({ label: l, run: () => { O.set("autoLock", v); stack.pop(); setTimeout(() => open("Display & Brightness"), 420); } })) }) }))) }; },
      "Glass Material": () => { const prev = h("div.glass", { style: { height: "100px", borderRadius: "24px", margin: "0 16px 16px", display: "grid", placeItems: "center", fontWeight: 600 } }, "Preview");
        const bg = h("div", { style: { background: O.wallpaperCSS(), padding: "16px 0", margin: "0 16px 16px", borderRadius: "16px" } }, prev);
        const sl = h("input", { type: "range", min: 0, max: 100, value: S.glass, style: { width: "100%" }, oninput: e => O.set("glass", +e.target.value) });
        return { title: "Glass Material", body: h("div", bg, list(row({ title: h("div", { style: { width: "100%" } }, h("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--ink3)" } }, h("span", "Clear"), h("span", "Tinted")), sl) })), list(row({ title: "Reduce Transparency", tog: tog("reduceTransparency") })), foot("Controls the blur and tint of every glass surface: dock, Control Centre, notifications, tab bars and menus.")) }; },
      "Wallpaper": () => { const pick = h("input", { type: "file", accept: "image/*", style: { display: "none" }, onchange: async e => { const f = e.target.files[0]; if (f) { O.set("wallpaper", await shrink(f, 1300)); O.toast("Wallpaper set"); } } });
        return { title: "Wallpaper", body: h("div", h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", padding: "0 16px 16px" } }, ...O.WALLPAPERS.map((w, i) => h("button", { style: { aspectRatio: "9/19", borderRadius: "12px", background: w.css, outline: S.wallpaper === i ? "3px solid var(--accent)" : "", outlineOffset: "2px" }, title: w.name, onclick: e => { O.set("wallpaper", i); $$("button", e.currentTarget.parentNode).forEach(b => b.style.outline = ""); e.currentTarget.style.outline = "3px solid var(--accent)"; } }))),
          list(row({ title: "Choose a Photo from your Computer…", onclick: () => pick.click() }), row({ title: "Choose from Photos", onclick: () => O.open("photos") }), row({ title: "Lock Screen Clock Style", go: true, onclick: () => O.sheet({ title: "Clock", actions: ["Bold", "Thin", "Serif", "Rounded"].map((f, i) => ({ label: f, run: () => O.set("lockFont", i) })) }) })), pick) }; },
      "Face Unlock & Passcode": () => ({ title: "Face Unlock & Passcode", body: h("div", list(row({ title: "Simulated Face Unlock", sub: "Unlocks a moment after the screen wakes", tog: tog("faceUnlock") })),
        list(row({ title: S.passcode ? "Change Passcode" : "Turn Passcode On", onclick: async () => { const v = await O.prompt("Enter a 4 or 6 digit passcode", "", "1234"); if (v && /^\d{4}(\d{2})?$/.test(v)) { O.set("passcode", v); O.toast("Passcode set"); stack.pop(); } else if (v) O.toast("Use 4 or 6 digits"); } }),
          S.passcode ? row({ title: h("span", { style: { color: "var(--red)" } }, "Turn Passcode Off"), onclick: () => { O.set("passcode", ""); O.toast("Passcode off"); stack.pop(); } }) : null),
        foot("The passcode is stored in this browser only. It is a demo lock, not real security.")) }),
      "Accessibility": () => ({ title: "Accessibility", body: h("div", list(row({ title: "Reduce Motion", sub: "Springs and zooms become instant", tog: tog("reduceMotion") }), row({ title: "Reduce Transparency", tog: tog("reduceTransparency") }), row({ title: "Bold Text", tog: tog("boldText") })),
        list(row({ title: "Show Keyboard Shortcuts Panel", tog: tog("showHelp", v => document.getElementById("help").style.display = v ? "" : "none") }))) }),
      "Battery": () => ({ title: "Battery", body: h("div", list(row({ title: "Battery Level", val: Math.round(O.battery.level * 100) + "%" + (O.battery.charging ? " ⚡" : "") }), row({ title: "Low Power Mode", tog: tog("lowPower") })), foot(navigator.getBattery ? "Level and charging state come from your computer's battery." : "This browser doesn't expose battery information; the level is simulated.")) }),
      "Privacy & Security": () => { const b = h("div"); const perms = ["camera", "microphone", "geolocation", "notifications"];
        const L = h("div.list"); b.append(L, foot("These are your browser's real permission states for this page.")); perms.forEach(p => { const r = row({ title: p[0].toUpperCase() + p.slice(1), val: "…" }); L.append(r); navigator.permissions?.query({ name: p }).then(s => r.querySelector(".val").textContent = s.state, () => r.querySelector(".val").textContent = "n/a"); }); return { title: "Privacy & Security", body: b }; },
      "Home Screen & App Library": () => ({ title: "Home Screen & App Library", body: h("div", hdr("App Icons"), list(...[["default", "Default"], ["dark", "Dark"], ["auto", "Automatic (follows Dark Mode)"], ["tinted", "Tinted"]].map(([k, l]) => row({ title: l, val: S.iconStyle === k ? "✓" : "", onclick: () => { O.set("iconStyle", k); stack.pop(); setTimeout(() => open("Home Screen & App Library"), 420); } }))),
        list(row({ title: "Large Icons", sub: "Bigger icons without names, like iOS 18 and later", tog: { on: !!S.iconLarge, change: v => O.set("iconLarge", v) } })),
        S.iconStyle === "tinted" ? list(row({ title: h("div", { style: { width: "100%" } }, h("div.sub", "Tint colour"), h("input", { type: "range", min: 0, max: 360, value: S.iconTint, "aria-label": "Tint colour", style: { width: "100%", accentColor: `hsl(${S.iconTint},80%,50%)` }, oninput: e => O.set("iconTint", +e.target.value) })) })) : null, list(row({ title: "Reset Home Screen Layout", onclick: () => { delete O.saved.layout; O.persist(); O.renderHome(); O.toast("Layout reset"); } }), row({ title: "Restore All Removed Apps", onclick: () => { Object.values(O.apps).filter(a => O.isInstalled(a.id)).forEach(a => O.placeApp(a.id)); O.renderHome(); O.toast("Restored"); } })), foot("Press and hold any icon to move, remove or add widgets.")) }),
      "Apps": () => ({ title: "Apps", body: h("div", list(...Object.values(O.apps).filter(a => O.isInstalled(a.id) && !a.hidden).sort((a, b) => a.name.localeCompare(b.name)).map(a => { const r = row({ title: a.name, go: true, onclick: () => stack.push(() => ({ title: a.name, body: h("div", list(row({ title: "Data size", val: kb(JSON.stringify((O.saved.data || {})[a.id] || {}).length) }), row({ title: "Open " + a.name, onclick: () => O.open(a.id) }), row({ title: h("span", { style: { color: "var(--red)" } }, "Clear App Data"), onclick: () => { if (O.saved.data) delete O.saved.data[a.id]; O.persist(); O.toast("Cleared. Reopen the app."); O.closeApp(a.id); } }))) })) }); r.prepend(O.iconEl(a, { size: 30 })); return r; }))) }),
    };
    const kb = n => n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : (n / 1e3).toFixed(1) + " KB";
    const about = () => ({ title: "About", body: h("div", list(row({ title: "Name", val: S.name, onclick: () => O.prompt("Name", S.name).then(v => v && O.set("name", v)) }), row({ title: "Software Version", val: "27.0 (web)" }), row({ title: "Model Name", val: "Glassline Virtual Phone" }), row({ title: "Browser", val: navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)?.[0] || "Unknown" }), row({ title: "Apps", val: Object.values(O.apps).filter(a => O.isInstalled(a.id)).length }), row({ title: "Photos", val: (O.appStore("photos").get("items", []) || []).length })),
      foot("Glassline OS is an original, iOS-style web shell. It is not affiliated with Apple and contains no Apple software or artwork.")) });
    const storage = () => { const b = h("div"); const L = h("div.list"); b.append(L); const used = JSON.stringify(O.saved).length;
      L.append(row({ title: "Glassline data", val: kb(used) })); navigator.storage?.estimate?.().then(e => L.append(row({ title: "Browser quota", val: kb(e.quota || 0) }))); return { title: "Storage", body: b }; };
    function open(name) { const p = PAGES[name]; if (p) stack.push(p); }
    const S_ROWS = [
      [["Airplane Mode", "plane", "#ff9f0a", "airplane"], ["Wi-Fi", "wifi", "#0a84ff"], ["Bluetooth", "bt", "#0a84ff"], ["Cellular", "cell", "#30d158"]],
      [["Notifications", "bell", "#ff3b30"], ["Sounds & Haptics", "speaker", "#ff2d55"], ["Focus", "moon", "#5e5ce6"]],
      [["General", "home", "#8e8e93"], ["Accessibility", "star", "#0a84ff"], ["Display & Brightness", "sun", "#0a84ff"], ["Glass Material", "drop", "#64d2ff"], ["Home Screen & App Library", "grid", "#5e5ce6"], ["Wallpaper", "half", "#30b0c7"]],
      [["Face Unlock & Passcode", "scan", "#30d158"], ["Battery", "bolt", "#30d158"], ["Privacy & Security", "share", "#0a84ff"]],
      [["Apps", "grid", "#5e5ce6"]],
    ];
    const body = h("div");
    const draw = () => { body.innerHTML = "";
      const q = h("input", { placeholder: "Search", oninput: () => { const v = q.value.toLowerCase(); $$(".row", body).forEach(r => { if (r.dataset.k) r.style.display = r.dataset.k.includes(v) ? "" : "none"; }); } });
      body.append(h("div.searchbar", { html: sys("search") }, q));
      body.append(list(h("div.row", { style: { padding: "10px 16px" }, onclick: () => stack.push(about) }, avatar(S.owner, 58), h("div.grow", h("div", { style: { fontSize: "20px" } }, S.owner), h("div.sub", "Glassline Account, stored on this device")), h("span.go"))));
      S_ROWS.forEach(group => body.append(list(...group.map(([t, ic, col, key]) => { const r = row({ title: t, icon: ic === "bolt" ? O.svg(O.G.bolt) : ic, color: col, go: !key, tog: key ? tog(key) : null, val: t === "Wi-Fi" ? (S.wifi ? "Home Network" : "Off") : t === "Bluetooth" ? (S.bluetooth ? "On" : "Off") : t === "Focus" ? (S.focus || "") : null, onclick: key ? null : () => open(t) }); r.dataset.k = (t + " " + (O.index && "")).toLowerCase(); return r; }))));
    };
    draw();
    stack.push(() => ({ title: "Settings", body, onReturn: draw }));
    ctx.onIntent(it => { if (it.page) { stack.popToRoot(); open(it.page); } });
  } });

/* ======================================================================== */
/* Files                                                                     */
/* ======================================================================== */
O.registerApp({ id: "files", name: "Files", bg: "linear-gradient(#fff,#eee)", glyph: () => O.svg('<path d="M3 7a1.5 1.5 0 0 1 1.5-1.5h5L11 7.5h8.5A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" fill="#1a8cff" stroke="none"/>'), category: "Productivity", keywords: "documents folders storage",
  render(ctx) {
    const st = ctx.store; const stack = ctx.stack();
    const up = h("input", { type: "file", multiple: true, style: { display: "none" }, onchange: async e => { const all = st.get("files", []); for (const f of e.target.files) { if (f.size > 2e6) { O.toast(f.name + " is over 2 MB"); continue; } const url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); }); all.unshift({ id: uid(), name: f.name, type: f.type, size: f.size, url, t: Date.now() }); } try { st.set("files", all); } catch { O.toast("Storage full"); } draw(); } });
    const body = h("div");
    const draw = () => { body.innerHTML = ""; const f = st.get("files", []);
      body.append(hdr("Locations"), list(row({ title: "On My Phone", icon: "home", color: "#8e8e93", val: f.length + " items" }), row({ title: "Notes", icon: "pen", color: "#ffd60a", go: true, onclick: () => O.open("notes") }), row({ title: "Photos", icon: "half", color: "#ff9f0a", go: true, onclick: () => O.open("photos") }), row({ title: "Voice Memos", icon: "mic", color: "#ff3b30", go: true, onclick: () => O.open("voicememos") })));
      body.append(hdr("Files"), f.length ? list(...f.map(x => row({ title: x.name, sub: `${(x.size / 1024).toFixed(1)} KB · ${new Date(x.t).toLocaleDateString()}`, entity: "file", onclick: () => O.sheet({ title: x.name, actions: [{ label: "Open", run: () => preview(x) }, { label: "Download to Computer", run: () => { const a = h("a", { href: x.url, download: x.name }); document.body.append(a); a.click(); a.remove(); } }, x.type.startsWith("image/") ? { label: "Save to Photos", run: () => O.emit("photo-taken", { src: x.url }) } : null, { label: "Delete", red: true, run: () => { st.set("files", st.get("files", []).filter(y => y.id !== x.id)); draw(); } }].filter(Boolean) }) }))) : h("div.empty", "No files yet. Use + to import files from your computer.")); };
    function preview(x) { stack.push(() => ({ title: x.name, large: false, body: x.type.startsWith("image/") ? h("img", { src: x.url, style: { width: "100%" } }) : x.type.startsWith("text/") || /json|xml/.test(x.type) ? h("pre", { style: { padding: "16px", whiteSpace: "pre-wrap", fontSize: "13px" } }, atob(x.url.split(",")[1] || "").slice(0, 20000)) : x.type.startsWith("audio/") ? h("audio", { controls: true, src: x.url, style: { width: "90%", margin: "30px 5%" } }) : x.type.startsWith("video/") ? h("video", { controls: true, src: x.url, style: { width: "100%" } }) : x.type === "application/pdf" ? h("iframe", { src: x.url, style: { width: "100%", height: "640px", border: 0 } }) : h("div.empty", "No preview for this file type.") })); }
    draw(); stack.push(() => ({ title: "Browse", right: h("div.grp", plusBtn(() => up.click()), up), body }));
  } });

/* ======================================================================== */
/* Voice Memos                                                               */
/* ======================================================================== */
O.registerApp({ id: "voicememos", name: "Voice Memos", bg: "#111", glyph: () => O.svg('<path d="M4 12h1M7 9v6M10 5v14M13 8v8M16 10v4M19 11v2" stroke="#ff3b30" stroke-width="2" stroke-linecap="round"/>'), category: "Utilities", keywords: "record audio microphone",
  render(ctx) {
    const st = ctx.store; let rec = null, chunks = [], streamA = null, raf = 0;
    const L = h("div");
    const wave = h("canvas", { width: 360, height: 80, style: { width: "100%", height: "80px", display: "block" } });
    const draw = () => { L.innerHTML = ""; const m = st.get("memos", []); if (!m.length) L.append(h("div.empty", "No recordings. Tap the red button to record."));
      L.append(h("div.list.flush", m.map(x => h("div.row", { dataset: { entity: "recording", title: x.name }, style: { flexDirection: "column", alignItems: "stretch" } }, h("div", { style: { display: "flex", justifyContent: "space-between" } }, h("b", x.name), h("span.sub", O.fmtDur(x.dur))), h("div.sub", new Date(x.t).toLocaleString()),
        h("div", { style: { display: "flex", alignItems: "center", gap: "10px" } }, h("audio", { controls: true, src: x.url, style: { flex: 1, height: "34px" } }), iconBtn("trash", "Delete Recording", () => { st.set("memos", st.get("memos", []).filter(y => y.id !== x.id)); draw(); }, "var(--red)")))))); };
    const btn = h("button", { style: { width: "70px", height: "70px", borderRadius: "50%", border: "4px solid var(--sep)", display: "grid", placeItems: "center", margin: "0 auto" }, onclick: () => rec ? stop() : start() }, h("span", { style: { width: "54px", height: "54px", borderRadius: "50%", background: "var(--red)", transition: "all .25s" } }));
    async function start() {
      try { streamA = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return O.toast("Microphone unavailable: " + e.name); }
      chunks = []; rec = new MediaRecorder(streamA); const t0 = Date.now();
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = async () => { const blob = new Blob(chunks, { type: rec.mimeType }); const url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
        const m = st.get("memos", []); m.unshift({ id: uid(), name: "New Recording " + (m.length + 1), url, t: Date.now(), dur: Date.now() - t0 }); try { st.set("memos", m); } catch { O.toast("Storage full: recording kept until reload"); } rec = null; streamA.getTracks().forEach(t => t.stop()); O.recState.on = false; O.live.update(); draw(); };
      rec.start(); O.recState.on = true; O.recState.start = Date.now(); O.live.update(); btn.firstChild.style.borderRadius = "8px"; btn.firstChild.style.transform = "scale(.55)";
      const ac = new AudioContext(), an = ac.createAnalyser(); ac.createMediaStreamSource(streamA).connect(an); const buf = new Uint8Array(an.fftSize); const g = wave.getContext("2d"); const hist = [];
      const loop = () => { if (!rec) { ac.close(); return; } an.getByteTimeDomainData(buf); let mx = 0; for (const v of buf) mx = Math.max(mx, Math.abs(v - 128)); hist.push(mx / 128); if (hist.length > 90) hist.shift(); g.clearRect(0, 0, 360, 80); g.fillStyle = "#ff3b30"; hist.forEach((v, i) => { const hh = Math.max(2, v * 76); g.fillRect(i * 4, 40 - hh / 2, 2.5, hh); }); raf = requestAnimationFrame(loop); }; loop();
    }
    function stop() { if (rec) rec.stop(); btn.firstChild.style.borderRadius = "50%"; btn.firstChild.style.transform = ""; cancelAnimationFrame(raf); }
    draw();
    ctx.stack().push(() => ({ title: "All Recordings", body: L, after: h("div.glass", { style: { padding: "12px 16px 36px" } }, wave, btn) }));
  } });

/* ======================================================================== */
/* Video calls (camera self-view; calls are simulated)                       */
/* ======================================================================== */
O.registerApp({ id: "facetime", name: "Video", bg: "linear-gradient(#5df07a,#1fbf4a)", glyph: "video", category: "Social", status: "light", keywords: "video call facetime chat",
  render(ctx) {
    ctx.el.style.background = "#000"; ctx.el.style.color = "#fff"; let stream = null;
    const v = h("video", { autoplay: true, playsInline: true, muted: true, style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", opacity: .9 } });
    const ui = h("div", { style: { position: "absolute", inset: 0, padding: "70px 16px", display: "flex", flexDirection: "column", gap: "12px", background: "linear-gradient(rgba(0,0,0,.55), transparent 40%, rgba(0,0,0,.6))" } });
    ctx.el.append(v, ui);
    const home = () => { ui.innerHTML = ""; ui.append(h("h1", { style: { margin: 0 } }, "Video"), h("div", { style: { display: "flex", gap: "10px" } }, h("button.pill-btn.grey", { style: { color: "#fff", background: "rgba(255,255,255,.2)" }, onclick: () => O.share({ title: "Video link", url: "https://example.com/glassline-call/" + uid() }) }, "Create Link"), h("button.pill-btn", { style: { background: "var(--green)" }, onclick: () => O.prompt("Call who?", "", "Name").then(n => n && call(n)) }, "New Call")),
      h("div", { style: { marginTop: "auto" } }, ...contacts().slice(0, 5).map(c => h("div", { style: { display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }, onclick: () => call(c.name) }, avatar(c.name, 40), h("div", { style: { flex: 1 } }, c.name), "📹")))); };
    function call(name) { ui.innerHTML = ""; const s = h("div", { style: { opacity: .8 } }, "Calling…"); ui.append(h("div", { style: { textAlign: "center", marginTop: "40px" } }, h("div", { style: { display: "flex", justifyContent: "center" } }, avatar(name, 80)), h("h2", name), s), h("button", { style: { marginTop: "auto", alignSelf: "center", width: "70px", height: "70px", borderRadius: "50%", background: "var(--red)", fontSize: "26px" }, onclick: home }, "✕"));
      setTimeout(() => { s.textContent = "No answer. Calls are simulated: Glassline can't place real video calls."; }, 3500); }
    ctx.onShow(async () => { home(); try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } }); v.srcObject = stream; } catch { } });
    ctx.onHide(() => { stream && stream.getTracks().forEach(t => t.stop()); stream = null; });
    ctx.onIntent(it => it.call && setTimeout(() => call(it.call), 100));
  } });

/* ======================================================================== */
/* Wallet (fictional demo cards)                                             */
/* ======================================================================== */
O.registerApp({ id: "wallet", name: "Wallet", bg: "#111", glyph: "wallet", category: "Productivity", status: "light", keywords: "cards pay tickets passes",
  render(ctx) {
    ctx.el.style.background = "#000"; ctx.el.style.color = "#fff";
    const cards = [["Glassline Card", "•••• 4821", "linear-gradient(135deg,#e0e0e0,#9e9e9e)", "#111"], ["Transit Pass", "Balance 12.40", "linear-gradient(135deg,#30d158,#0b7a35)", "#fff"], ["Library Card", "No. 556 1203", "linear-gradient(135deg,#ff9f0a,#c2410c)", "#fff"], ["Gym Membership", "Gold · 2027", "linear-gradient(135deg,#5e5ce6,#2b1a7a)", "#fff"]];
    const wrap = h("div", { style: { position: "relative", padding: "0 16px", height: "560px" } });
    let open = -1;
    const draw = () => { wrap.innerHTML = ""; cards.forEach(([n, sub, bg, ink], i) => { const top = open < 0 ? i * 64 : i === open ? 0 : 420 + (i > open ? i - 1 : i) * 12;
      wrap.append(h("div", { dataset: { entity: "card", title: n }, style: { position: "absolute", left: "16px", right: "16px", top: top + "px", height: "220px", borderRadius: "18px", background: bg, color: ink, padding: "18px", transition: "top .45s cubic-bezier(.3,1.2,.5,1)", boxShadow: "0 -4px 20px rgba(0,0,0,.4)", cursor: "pointer" }, onclick: () => { open = open === i ? -1 : i; draw(); } },
        h("div", { style: { display: "flex", justifyContent: "space-between", fontWeight: 600 } }, h("span", n), h("span", { "aria-hidden": "true", style: { opacity: .7 } }, "◈")), h("div", { style: { position: "absolute", bottom: "18px", left: "18px", fontSize: "17px", letterSpacing: "1px" } }, sub))); });
      if (open >= 0) wrap.append(h("div", { style: { position: "absolute", top: "250px", left: 0, right: 0, textAlign: "center" } }, h("div", { style: { fontSize: "40px" } }, "◎"), h("div", "Hold near reader"), h("div.sub", { style: { color: "#999", marginTop: "8px", fontSize: "12px", padding: "0 40px" } }, "Demo only. These cards are fictional and cannot make payments."), h("button.pill-btn", { style: { marginTop: "14px" }, onclick: () => { O.haptic(40); O.toast("✓ Done (simulated)"); O.tone([[1046, .1], [1318, .2]], { gain: .06 }); } }, "Simulate Tap"))); };
    draw();
    ctx.el.append(h("div", { style: { padding: "60px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" } }, h("h1", { style: { margin: 0 } }, "Wallet"), h("button.tbtn.circ", { style: { background: "#222", color: "#fff" }, onclick: () => O.toast("Adding cards isn't possible in a demo") }, "+")), wrap);
  } });

/* ======================================================================== */
/* Health                                                                    */
/* ======================================================================== */
O.registerApp({ id: "health", name: "Health", bg: "#fff", glyph: "heart", category: "Health", keywords: "steps fitness activity water sleep",
  render(ctx) {
    const st = ctx.store; let motionSteps = 0, lastPeak = 0;
    const key = today();
    const day = () => st.get(key, { water: 0, sleep: 7.5, mood: "" });
    const estSteps = () => Math.round(Math.max(0, (new Date().getHours() - 7) * 620 + new Date().getMinutes() * 9)) + motionSteps;
    const ringSVG = (vals) => `<svg viewBox="0 0 120 120" width="150" height="150">${vals.map(([v, c], i) => { const r = 50 - i * 14; return `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${c}" stroke-opacity=".2" stroke-width="11"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${c}" stroke-width="11" stroke-linecap="round" pathLength="100" stroke-dasharray="${Math.min(100, v * 100)} 100" transform="rotate(-90 60 60)"/>`; }).join("")}</svg>`;
    const body = h("div");
    const draw = () => { const d = day(), s = estSteps(); body.innerHTML = "";
      body.append(list(h("div.row", { style: { gap: "16px", padding: "14px" } }, h("div", { html: ringSVG([[s / 8000, "#ff2d55"], [Math.min(1, s / 8000 * 30 / 30), "#a2ff00"], [new Date().getHours() / 12, "#00e0ff"]]) }), h("div", h("div.sub", "Move"), h("b", { style: { color: "#ff2d55", fontSize: "20px" } }, Math.round(s * .04) + "/320 kcal"), h("div.sub", "Steps"), h("b", { style: { fontSize: "20px" } }, s.toLocaleString())))),
        hdr("Today"), list(row({ title: "Steps", val: s.toLocaleString(), entity: "metric", sub: motionSteps ? "Includes motion-sensor steps" : "Estimated: no motion sensor in use" }), row({ title: "Distance", val: (s * .00075).toFixed(2) + " km" }),
          row({ title: "Water", val: d.water + " glasses", onclick: () => { const x = day(); x.water++; st.set(key, x); draw(); } }), row({ title: "Sleep", val: d.sleep + " h", onclick: () => O.prompt("Hours slept", d.sleep).then(v => { if (v && !isNaN(+v)) { const x = day(); x.sleep = +v; st.set(key, x); draw(); } }) }),
          row({ title: "State of Mind", val: d.mood || "Log", onclick: () => O.sheet({ title: "How do you feel?", actions: ["Very Pleasant", "Pleasant", "Neutral", "Unpleasant"].map(m => ({ label: m, run: () => { const x = day(); x.mood = m; st.set(key, x); draw(); } })) }) })),
        list(row({ title: "Count Steps with Motion Sensor", sub: "On a phone browser", onclick: startMotion })), foot("Health data stays in this browser. Not medical advice.")); };
    function startMotion() {
      const go = () => { window.addEventListener("devicemotion", e => { const a = e.accelerationIncludingGravity; if (!a) return; const m = Math.hypot(a.x, a.y, a.z); const now = Date.now(); if (m > 12.5 && now - lastPeak > 320) { lastPeak = now; motionSteps++; if (motionSteps % 5 === 0) draw(); } }); O.toast("Counting steps"); };
      if (typeof DeviceMotionEvent !== "undefined" && DeviceMotionEvent.requestPermission) DeviceMotionEvent.requestPermission().then(p => p === "granted" ? go() : O.toast("Permission denied")); else if ("ondevicemotion" in window) go(); else O.toast("No motion sensor");
    }
    draw(); ctx.stack().push(() => ({ title: "Summary", body })); ctx.onShow(draw);
  } });

/* ======================================================================== */
/* Compass                                                                   */
/* ======================================================================== */
O.registerApp({ id: "compass", name: "Compass", bg: "#111", glyph: "compass", category: "Utilities", status: "light", keywords: "direction north heading",
  render(ctx) {
    ctx.el.style.background = "#000"; ctx.el.style.color = "#fff"; let heading = 0, sensor = false;
    const dial = h("div", { style: { width: "300px", height: "300px", margin: "40px auto 0", position: "relative", transition: "transform .15s linear" }, html: `<svg viewBox="0 0 200 200" width="300" height="300">${Array.from({ length: 72 }, (_, i) => `<line x1="100" y1="6" x2="100" y2="${i % 6 ? 14 : 20}" stroke="${i % 18 ? "#888" : "#fff"}" stroke-width="${i % 6 ? 1 : 2}" transform="rotate(${i * 5} 100 100)"/>`).join("")}${["N", "E", "S", "W"].map((d, i) => `<text x="100" y="40" text-anchor="middle" fill="${d === "N" ? "#ff453a" : "#fff"}" font-size="16" font-family="system-ui" transform="rotate(${i * 90} 100 100)">${d}</text>`).join("")}</svg>` });
    const deg = h("div", { style: { fontSize: "64px", fontWeight: 200, textAlign: "center", marginTop: "30px" }, dataset: { entity: "heading" } }); const coords = h("div.sub", { style: { textAlign: "center", color: "#999" } }, "Drag the dial, or allow motion sensors on a phone");
    ctx.el.append(h("div", { style: { position: "absolute", top: "120px", left: "50%", width: "3px", height: "40px", background: "#fff", marginLeft: "-1.5px", zIndex: 2 } }), dial, deg, coords);
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const upd = () => { dial.style.transform = `rotate(${-heading}deg)`; const hd = ((Math.round(heading) % 360) + 360) % 360; deg.textContent = `${hd}° ${dirs[Math.round(hd / 45) % 8]}`; deg.dataset.title = deg.textContent; };
    dial.addEventListener("pointerdown", e => { const h0 = heading; track(e, { move(dx) { if (!sensor) { heading = h0 - dx * .8; upd(); } } }); });
    const onOri = e => { const hd = e.webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : null); if (hd != null) { sensor = true; heading = hd; upd(); } };
    ctx.onShow(() => { window.addEventListener("deviceorientation", onOri); navigator.geolocation?.getCurrentPosition(p => coords.textContent = `${p.coords.latitude.toFixed(4)}°, ${p.coords.longitude.toFixed(4)}°`, () => {}); });
    ctx.onHide(() => window.removeEventListener("deviceorientation", onOri));
    upd();
  } });

/* ======================================================================== */
/* Magnifier                                                                 */
/* ======================================================================== */
O.registerApp({ id: "magnifier", name: "Magnifier", bg: "#111", glyph: "magnifier", category: "Utilities", status: "light", keywords: "zoom camera enlarge",
  render(ctx) {
    ctx.el.style.background = "#000"; let stream = null, z = 2;
    const v = h("video", { autoplay: true, playsInline: true, muted: true, style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${z})` } });
    const frozen = h("img", { style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "none" } });
    const sl = h("input", { type: "range", min: 1, max: 8, step: .1, value: z, style: { width: "100%" }, oninput: e => { z = +e.target.value; v.style.transform = frozen.style.transform = `scale(${z})`; } });
    const panel = h("div.glass", { style: { position: "absolute", left: "12px", right: "12px", bottom: "34px", borderRadius: "26px", padding: "14px", color: "var(--tint-ink)" } }, sl,
      h("div", { style: { display: "flex", justifyContent: "space-around", marginTop: "10px" } }, h("button.pill-btn", { onclick: () => { if (frozen.style.display === "none") { const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d").drawImage(v, 0, 0); frozen.src = c.toDataURL(); frozen.style.display = "block"; } else frozen.style.display = "none"; } }, "Freeze"),
        h("button.pill-btn.grey", { onclick: () => { v.style.filter = v.style.filter ? "" : "invert(1) contrast(1.4)"; } }, "Invert"), h("button.pill-btn.grey", { onclick: () => { v.style.filter = v.style.filter ? "" : "contrast(1.8) grayscale(1)"; } }, "Contrast")));
    ctx.el.append(v, frozen, panel);
    ctx.onShow(async () => { try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); v.srcObject = stream; } catch { O.toast("Camera unavailable"); } });
    ctx.onHide(() => { stream && stream.getTracks().forEach(t => t.stop()); stream = null; });
  } });

/* ======================================================================== */
/* Translate (small offline phrasebook)                                      */
/* ======================================================================== */
const PHRASES = { hello: { es: "hola", fr: "bonjour", de: "hallo", it: "ciao" }, goodbye: { es: "adiós", fr: "au revoir", de: "auf Wiedersehen", it: "arrivederci" }, "thank you": { es: "gracias", fr: "merci", de: "danke", it: "grazie" }, please: { es: "por favor", fr: "s'il vous plaît", de: "bitte", it: "per favore" }, yes: { es: "sí", fr: "oui", de: "ja", it: "sì" }, no: { es: "no", fr: "non", de: "nein", it: "no" },
  "good morning": { es: "buenos días", fr: "bonjour", de: "guten Morgen", it: "buongiorno" }, "good night": { es: "buenas noches", fr: "bonne nuit", de: "gute Nacht", it: "buona notte" }, "how are you": { es: "¿cómo estás?", fr: "comment ça va ?", de: "wie geht's?", it: "come stai?" }, "where is the bathroom": { es: "¿dónde está el baño?", fr: "où sont les toilettes ?", de: "wo ist die Toilette?", it: "dov'è il bagno?" },
  "how much is this": { es: "¿cuánto cuesta esto?", fr: "combien ça coûte ?", de: "wie viel kostet das?", it: "quanto costa?" }, water: { es: "agua", fr: "eau", de: "Wasser", it: "acqua" }, coffee: { es: "café", fr: "café", de: "Kaffee", it: "caffè" }, "excuse me": { es: "perdón", fr: "excusez-moi", de: "entschuldigung", it: "mi scusi" }, "i love you": { es: "te quiero", fr: "je t'aime", de: "ich liebe dich", it: "ti amo" }, friend: { es: "amigo", fr: "ami", de: "Freund", it: "amico" }, "the bill please": { es: "la cuenta, por favor", fr: "l'addition, s'il vous plaît", de: "die Rechnung, bitte", it: "il conto, per favore" } };
const LANGS = { es: "Spanish", fr: "French", de: "German", it: "Italian" };
O.registerApp({ id: "translate", name: "Translate", bg: "linear-gradient(#2b6fff,#0b3fbf)", glyph: "translate", category: "Information", keywords: "language spanish french german italian",
  render(ctx) {
    let lang = "es";
    const out = h("div", { style: { fontSize: "26px", color: "var(--accent)", minHeight: "60px", padding: "12px 0" }, dataset: { entity: "translation" } });
    const inp = h("textarea", { placeholder: "Enter text (English)", rows: 3, style: { width: "100%", border: 0, outline: 0, background: "none", fontSize: "24px", resize: "none" }, oninput: () => run() });
    const seg = h("div.seg", Object.entries(LANGS).map(([k, n]) => h("button" + (k === lang ? ".on" : ""), { onclick: e => { lang = k; $$("button", seg).forEach(b => b.classList.remove("on")); e.currentTarget.classList.add("on"); run(); } }, n)));
    function run() { const t = inp.value.trim().toLowerCase().replace(/[?!.,]+$/, ""); if (!t) { out.textContent = ""; return; }
      let res = PHRASES[t] && PHRASES[t][lang]; if (!res) { const words = t.split(/\s+/); const tr = words.map(w => PHRASES[w] ? PHRASES[w][lang] : null); res = tr.every(Boolean) ? tr.join(" ") : null; }
      out.innerHTML = ""; if (res) { out.append(res, h("button", { style: { fontSize: "18px", marginLeft: "10px" }, onclick: () => { const u = new SpeechSynthesisUtterance(res); u.lang = lang; speechSynthesis.speak(u); } }, "🔊")); out.dataset.title = res; }
      else out.append(h("div.sub", { style: { fontSize: "15px" } }, "Not in the offline phrasebook. "), h("button.pill-btn.grey", { onclick: () => window.open(`https://translate.google.com/?sl=en&tl=${lang}&text=${encodeURIComponent(inp.value)}`, "_blank", "noopener") }, "Translate on the web ↗")); }
    ctx.stack().push(() => ({ title: "Translate", body: h("div", seg, h("div.list", { style: { padding: "12px 16px" } }, h("div.sub", "English"), inp, h("div", { style: { borderTop: ".5px solid var(--sep)" } }), h("div.sub", { style: { marginTop: "8px" } }, LANGS[lang]), out),
      hdr("Phrasebook"), list(...Object.keys(PHRASES).map(p => row({ title: p, onclick: () => { inp.value = p; run(); } })))) }));
    ctx.onIntent(it => { if (it.text) { inp.value = it.text; const k = Object.keys(LANGS).find(k => LANGS[k].toLowerCase().startsWith((it.lang || "").toLowerCase().slice(0, 3))); if (k) { lang = k; $$("button", seg).forEach(b => b.classList.toggle("on", b.textContent === LANGS[k])); } run(); } });
  } });

/* ======================================================================== */
/* Tips                                                                      */
/* ======================================================================== */
O.registerApp({ id: "tips", name: "Tips", bg: "linear-gradient(#ffd60a,#ff9f0a)", glyph: "tip", category: "Information", keywords: "help guide how gestures",
  render(ctx) {
    const tips = [["Go Home", "Swipe up from the bar at the bottom of the screen. A quick flick works: the system projects where your finger was heading."], ["App Switcher", "Swipe up from the bottom and pause mid-screen. Swipe a card up to close an app. Swipe left or right along the bottom bar to jump between recent apps."],
      ["Control Centre", "Pull down from the top-right corner. Drag the brightness and volume sliders, tap Focus, or press the glass drop to cycle the material from clear to tinted."], ["Notifications", "Pull down from the top-left. Swipe a notification left to clear it. With three or more, a summary appears at the top."],
      ["Search or Ask", "Swipe down in the middle of the Home Screen. Search finds apps, settings, notes, messages and events by keyword, meaning and even typos. Try “12*7” or “5 km to mi”."],
      ["Assistant", "Hold the side button, press A, or drag down from the island. Try “set a timer for 2 minutes”, “turn on dark mode”, “text Mia saying I'm on my way” or “what's on my screen”."],
      ["Edit the Home Screen", "Press and hold an icon. Choose Edit Home Screen, drag icons between pages or into the dock, tap − to remove, and + Add Widget for widgets."],
      ["Lock Screen", "Press and hold the lock screen to change the clock style and wallpaper. Swipe left to open the camera. Hold the flashlight button to turn it on."],
      ["Writing Tools", "In Notes, tap ✦ to proofread, rewrite in a different tone, summarize, or turn text into a list."], ["Get Apps", "Open Store to download more apps. They install with a progress ring on the Home Screen, and you can delete them later."]];
    const body = h("div", { style: { padding: "0 16px" } }, tips.map(([t, d], i) => h("div", { dataset: { entity: "tip", title: t }, style: { background: `linear-gradient(135deg, hsl(${i * 36},80%,60%), hsl(${i * 36 + 40},80%,45%))`, color: "#fff", borderRadius: "20px", padding: "18px", marginBottom: "14px" } }, h("div", { style: { fontSize: "12px", fontWeight: 700, opacity: .8 } }, "TIP " + (i + 1)), h("h2", { style: { margin: "4px 0 8px" } }, t), h("div", { style: { lineHeight: 1.45 } }, d))));
    ctx.stack().push(() => ({ title: "Tips", body }));
  } });

O.tools = { row, list, hdr, foot, toggle, tabbar, avatar, plusBtn, uid, shrink, summarizeText, contacts, minimizeOnScroll };
})();
