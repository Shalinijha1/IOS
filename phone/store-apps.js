/* Glassline OS: the Store app and the catalogue of installable apps. All apps here are original. */
(function () {
"use strict";
const O = window.GOS, { h, sys, esc, track } = O, T = O.tools;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = def => O.registerApp(Object.assign({ builtin: false, rating: 4.6, reviews: 1200, size: "2 MB", age: "4+", dev: "Glassline Labs" }, def));
const canvasFill = (ctx, el, bg) => { const c = h("canvas", { width: O.W * 2, height: (O.H - 150) * 2, style: { width: O.W + "px", height: (O.H - 150) + "px", display: "block", touchAction: "none", background: bg || "" } }); el.append(c); const g = c.getContext("2d"); g.scale(2, 2); return { c, g, w: O.W, hh: O.H - 150 }; };
const head = (title, right) => h("div", { style: { padding: "56px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", flex: "none" } }, h("h1", { style: { margin: 0, fontSize: "30px" } }, title), right || "");

/* ---------- Sketch ---------- */
store({ id: "sketch", name: "Sketch", subtitle: "Draw with your finger", category: "Creativity", bg: "linear-gradient(#ff9a9e,#fa709a)", glyph: "brush", keywords: "draw paint art", desc: "A simple sketchbook with pressure-free brushes, colours, undo and saving straight to Photos.",
  render(ctx) {
    let color = "#111", size = 6, strokes = [], cur = null, erase = false;
    const bar = h("div", { style: { display: "flex", gap: "8px", alignItems: "center", padding: "0 16px 8px", flexWrap: "wrap" } });
    ctx.el.append(head("Sketch", h("div.grp", h("button.btn", { onclick: () => { strokes.pop(); redraw(); } }, "Undo"), h("button.btn", { onclick: () => { strokes = []; redraw(); } }, "Clear"), h("button.btn", { style: { fontWeight: 700 }, onclick: () => { O.emit("photo-taken", { src: c.toDataURL("image/png") }); O.toast("Saved to Photos"); } }, "Save"))), bar);
    ["#111", "#ff3b30", "#ff9f0a", "#ffd60a", "#30d158", "#0a84ff", "#bf5af2", "#fff"].forEach(col => bar.append(h("button", { style: { width: "28px", height: "28px", borderRadius: "50%", background: col, border: "2px solid var(--sep)" }, onclick: () => { color = col; erase = false; } })));
    bar.append(h("input", { type: "range", min: 2, max: 30, value: size, style: { width: "90px" }, oninput: e => size = +e.target.value }), h("button.pill-btn.grey", { style: { fontSize: "13px" }, onclick: () => erase = !erase }, "Eraser"));
    const { c, g } = canvasFill(ctx, ctx.el, "#fff");
    const pt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * O.W, (e.clientY - r.top) / r.height * (O.H - 150)]; };
    c.addEventListener("pointerdown", e => { cur = { color: erase ? "#fff" : color, size: erase ? size * 3 : size, pts: [pt(e)] }; strokes.push(cur); c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointermove", e => { if (!cur) return; cur.pts.push(pt(e)); redraw(); });
    c.addEventListener("pointerup", () => cur = null);
    function redraw() { g.fillStyle = "#fff"; g.fillRect(0, 0, O.W, O.H); g.lineCap = g.lineJoin = "round"; strokes.forEach(s => { g.strokeStyle = s.color; g.lineWidth = s.size; g.beginPath(); s.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); if (s.pts.length === 1) g.lineTo(s.pts[0][0] + .1, s.pts[0][1]); g.stroke(); }); }
    redraw();
  } });

/* ---------- Tip Split ---------- */
store({ id: "tipsplit", name: "Tip Split", subtitle: "Split the bill fairly", category: "Productivity", bg: "linear-gradient(#43e97b,#38c9a0)", glyph: "coin", keywords: "tip bill restaurant money", desc: "Work out the tip and each person's share in a second.",
  render(ctx) {
    let bill = 50, tip = 15, people = 2;
    const out = h("div", { style: { fontSize: "44px", fontWeight: 700, textAlign: "center", margin: "24px 0 4px" } }), sub = h("div.sub", { style: { textAlign: "center" } });
    const upd = () => { const t = bill * tip / 100, tot = bill + t; out.textContent = (tot / people).toFixed(2); out.dataset.entity = "amount"; out.dataset.title = out.textContent + " each"; sub.textContent = `per person · tip ${t.toFixed(2)} · total ${tot.toFixed(2)}`; };
    const field = (l, v, step, on) => h("div.row", h("div.grow", l), h("input", { type: "number", value: v, step, min: 0, style: { width: "110px", textAlign: "right", border: 0, background: "var(--fill)", borderRadius: "8px", padding: "6px", fontSize: "17px" }, oninput: e => { on(+e.target.value || 0); upd(); } }));
    ctx.el.append(head("Tip Split"), h("div.scroll", out, sub, h("div", { style: { height: "20px" } }), T.list(field("Bill", bill, 1, v => bill = v), field("Tip %", tip, 1, v => tip = v), field("People", people, 1, v => people = Math.max(1, v))),
      h("div", { style: { display: "flex", gap: "8px", justifyContent: "center" } }, ...[10, 15, 18, 20, 25].map(p => h("button.pill-btn.grey", { onclick: () => { tip = p; $$("input", ctx.el)[1].value = p; upd(); } }, p + "%")))));
    upd();
  } });

/* ---------- Units ---------- */
store({ id: "units", name: "Units", subtitle: "Convert anything", category: "Utilities", bg: "linear-gradient(#667eea,#764ba2)", glyph: "ruler", keywords: "convert converter metric imperial", desc: "Length, weight, temperature, speed and volume conversions.",
  render(ctx) {
    const K = { Length: { m: 1, km: 1000, cm: .01, mm: .001, mi: 1609.344, yd: .9144, ft: .3048, in: .0254 }, Weight: { kg: 1, g: .001, lb: .45359237, oz: .0283495, st: 6.35029 }, Speed: { "km/h": 1, "mph": 1.609344, "m/s": 3.6, knots: 1.852 }, Volume: { L: 1, mL: .001, "US gal": 3.78541, "UK gal": 4.54609, cup: .24, "fl oz": .0295735 }, Temperature: { "°C": 0, "°F": 0, K: 0 } };
    let cat = "Length", a = "km", b = "mi", v = 1;
    const out = h("div", { style: { fontSize: "36px", fontWeight: 700, textAlign: "center", margin: "20px 0" }, dataset: { entity: "conversion" } });
    const sel = (val, on) => h("select", { style: { fontSize: "17px", padding: "6px", borderRadius: "8px", background: "var(--fill)", border: 0 }, onchange: e => { on(e.target.value); upd(); } }, Object.keys(K[cat]).map(u => h("option", { selected: u === val }, u)));
    const box = h("div");
    const conv = x => { if (cat !== "Temperature") return x * K[cat][a] / K[cat][b]; const c = a === "°C" ? x : a === "°F" ? (x - 32) * 5 / 9 : x - 273.15; return b === "°C" ? c : b === "°F" ? c * 9 / 5 + 32 : c + 273.15; };
    const upd = () => { out.textContent = `${v} ${a} = ${+conv(v).toFixed(4)} ${b}`; out.dataset.title = out.textContent; };
    const draw = () => { box.innerHTML = ""; box.append(T.list(h("div.row", h("input", { type: "number", value: v, style: { flex: 1, border: 0, background: "none", fontSize: "20px" }, oninput: e => { v = +e.target.value; upd(); } }), sel(a, x => a = x)), h("div.row", h("div.grow", "to"), sel(b, x => b = x)))); upd(); };
    const seg = h("div.seg", Object.keys(K).map(k => h("button" + (k === cat ? ".on" : ""), { style: { fontSize: "11px" }, onclick: e => { cat = k; [a, b] = Object.keys(K[k]); $$("button", seg).forEach(x => x.classList.remove("on")); e.currentTarget.classList.add("on"); draw(); } }, k)));
    ctx.el.append(head("Units"), seg, out, box); draw();
  } });

/* ---------- Dice ---------- */
store({ id: "dice", name: "Dice & Coin", subtitle: "Roll, flip, decide", category: "Games", bg: "linear-gradient(#f6d365,#fda085)", glyph: "dice", keywords: "random roll flip decide", desc: "Roll up to six dice, flip a coin, or let it pick for you.",
  render(ctx) {
    let n = 2;
    const area = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center", padding: "40px 20px", minHeight: "260px" } });
    const faces = "⚀⚁⚂⚃⚄⚅", total = h("div", { style: { textAlign: "center", fontSize: "20px" } });
    const roll = () => { O.haptic(20); let s = 0; area.innerHTML = ""; for (let i = 0; i < n; i++) { const r = 1 + Math.floor(Math.random() * 6); s += r; const d = h("div", { style: { fontSize: "86px", lineHeight: 1, transition: "transform .4s cubic-bezier(.3,1.5,.5,1)", transform: `rotate(${Math.random() * 720 - 360}deg) scale(.3)` } }, faces[r - 1]); area.append(d); requestAnimationFrame(() => requestAnimationFrame(() => d.style.transform = `rotate(${Math.random() * 20 - 10}deg)`)); } total.textContent = "Total " + s; total.dataset.entity = "result"; };
    const flip = () => { area.innerHTML = ""; const r = Math.random() < .5 ? "Heads" : "Tails"; const c = h("div", { style: { width: "160px", height: "160px", borderRadius: "50%", background: "linear-gradient(#ffe27a,#d4a017)", display: "grid", placeItems: "center", fontSize: "26px", fontWeight: 800, color: "#7a5600", transition: "transform .8s", transform: "rotateY(0)" } }, "…"); area.append(c); requestAnimationFrame(() => { c.style.transform = "rotateY(1800deg)"; }); setTimeout(() => c.textContent = r, 600); total.textContent = ""; };
    ctx.el.append(head("Dice & Coin"), area, total, h("div", { style: { display: "flex", justifyContent: "center", gap: "10px", marginTop: "30px" } }, h("button.pill-btn.grey", { onclick: () => { n = Math.max(1, n - 1); roll(); } }, "−"), h("button.pill-btn", { style: { padding: "12px 30px", fontSize: "18px" }, onclick: roll }, "Roll"), h("button.pill-btn.grey", { onclick: () => { n = Math.min(6, n + 1); roll(); } }, "+"), h("button.pill-btn.grey", { onclick: flip }, "Flip Coin")));
    roll();
  } });

/* ---------- Bubble Pop (original arcade) ---------- */
store({ id: "bubbles", name: "Bubble Pop", subtitle: "Pop them before they float away", category: "Games", bg: "linear-gradient(#89f7fe,#66a6ff)", glyph: '<circle cx="9" cy="10" r="5" fill="#fff" stroke="none" opacity=".9"/><circle cx="16" cy="15" r="3.5" fill="#fff" stroke="none" opacity=".7"/><circle cx="15" cy="6" r="2" fill="#fff" stroke="none" opacity=".6"/>', keywords: "arcade tap game", desc: "Tap rising bubbles. Golden ones are worth five. Miss ten and the round ends.",
  render(ctx) {
    const { c, g, w, hh } = canvasFill(ctx, ctx.el, "linear-gradient(#0b486b,#021b2e)");
    let bubbles = [], score = 0, missed = 0, best = ctx.store.get("best", 0), raf = 0, last = 0, run = false, spawn = 0;
    const hud = h("div", { style: { position: "absolute", top: "56px", left: "16px", right: "16px", display: "flex", justifyContent: "space-between", color: "#fff", fontWeight: 700, fontSize: "18px", pointerEvents: "none" } });
    ctx.el.style.background = "#021b2e"; ctx.el.append(hud);
    c.style.position = "absolute"; c.style.top = "100px";
    const overlay = h("div", { style: { position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", textAlign: "center" } });
    ctx.el.append(overlay);
    const menu = t => { overlay.innerHTML = ""; overlay.style.display = "grid"; overlay.append(h("div", h("h1", t), h("div", `Best ${best}`), h("button.pill-btn", { style: { marginTop: "16px", padding: "12px 30px", fontSize: "18px" }, onclick: startG }, "Play"))); };
    function startG() { overlay.style.display = "none"; bubbles = []; score = 0; missed = 0; run = true; last = performance.now(); loop(last); }
    function loop(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; spawn -= dt;
      if (spawn <= 0) { spawn = Math.max(.25, .9 - score / 200); const gold = Math.random() < .08; bubbles.push({ x: 30 + Math.random() * (w - 60), y: hh + 30, r: gold ? 18 : 18 + Math.random() * 18, v: 60 + Math.random() * 50 + score * .8, gold }); }
      g.clearRect(0, 0, w, hh);
      bubbles.forEach(b => { b.y -= b.v * dt; b.x += Math.sin(b.y / 30) * .4; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fillStyle = b.gold ? "rgba(255,214,10,.85)" : "rgba(140,220,255,.35)"; g.fill(); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1.5; g.stroke(); g.beginPath(); g.arc(b.x - b.r * .35, b.y - b.r * .35, b.r * .2, 0, 7); g.fillStyle = "rgba(255,255,255,.8)"; g.fill(); });
      const before = bubbles.length; bubbles = bubbles.filter(b => b.y > -40); missed += before - bubbles.length;
      hud.innerHTML = `<span>Score ${score}</span><span>${"●".repeat(Math.max(0, 10 - missed))}</span>`;
      if (missed >= 10) { run = false; if (score > best) { best = score; ctx.store.set("best", best); } menu("Game Over · " + score); return; }
      if (run) raf = requestAnimationFrame(loop); }
    c.addEventListener("pointerdown", e => { const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * w, y = (e.clientY - r.top) / r.height * hh;
      const i = bubbles.findIndex(b => Math.hypot(b.x - x, b.y - y) < b.r + 8); if (i >= 0) { score += bubbles[i].gold ? 5 : 1; O.tone([[600 + bubbles[i].r * 20, .06]], { gain: .05 }); O.haptic(5); bubbles.splice(i, 1); } });
    menu("Bubble Pop");
    ctx.onHide(() => { if (run) { run = false; cancelAnimationFrame(raf); menu("Paused"); } });
  } });

/* ---------- Glow Worm (snake-genre, original) ---------- */
store({ id: "glowworm", name: "Glow Worm", subtitle: "Grow longer, don't bite your tail", category: "Games", bg: "linear-gradient(#1d2b64,#0b8793)", glyph: '<path d="M5 17c2-4 4 0 6-4s4 0 6-4" stroke="#7CFFB2" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="8" r="1.8" fill="#ffd60a" stroke="none"/>', keywords: "snake arcade swipe game", desc: "Swipe to steer a glowing worm towards light seeds.",
  render(ctx) {
    ctx.el.style.background = "#0b1020"; ctx.el.style.color = "#fff";
    const N = 18, cell = 20, size = N * cell;
    const c = h("canvas", { width: size * 2, height: size * 2, style: { width: size + "px", height: size + "px", margin: "20px auto", display: "block", borderRadius: "16px", background: "#111a33", touchAction: "none" } }); const g = c.getContext("2d"); g.scale(2, 2);
    const info = h("div", { style: { textAlign: "center", fontSize: "18px" } });
    let snake, dir, nd, food, alive = false, iv = 0, score = 0, best = ctx.store.get("best", 0);
    const place = () => { do { food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; } while (snake.some(s => s[0] === food[0] && s[1] === food[1])); };
    const reset = () => { snake = [[8, 9], [7, 9], [6, 9]]; dir = nd = [1, 0]; score = 0; place(); alive = true; clearInterval(iv); iv = setInterval(step, 140); };
    function step() { dir = nd; const hd = [(snake[0][0] + dir[0] + N) % N, (snake[0][1] + dir[1] + N) % N];
      if (snake.some(s => s[0] === hd[0] && s[1] === hd[1])) { alive = false; clearInterval(iv); if (score > best) { best = score; ctx.store.set("best", best); } O.haptic(80); draw(); return; }
      snake.unshift(hd); if (hd[0] === food[0] && hd[1] === food[1]) { score++; O.tone([[880, .05]], { gain: .04 }); place(); } else snake.pop(); draw(); }
    function draw() { g.clearRect(0, 0, size, size); g.shadowBlur = 12; g.shadowColor = "#ffd60a"; g.fillStyle = "#ffd60a"; g.beginPath(); g.arc(food[0] * cell + 10, food[1] * cell + 10, 6, 0, 7); g.fill();
      g.shadowColor = "#7CFFB2"; snake.forEach((s, i) => { g.fillStyle = `hsl(${150 - i * 2},100%,${70 - i}%)`; g.beginPath(); g.roundRect(s[0] * cell + 2, s[1] * cell + 2, cell - 4, cell - 4, 6); g.fill(); }); g.shadowBlur = 0;
      info.textContent = alive ? `Score ${score} · Best ${best}` : `Game over: ${score}. Tap to play again.`; }
    const turn = (x, y) => { if (dir[0] === -x && dir[1] === -y) return; nd = [x, y]; };
    c.addEventListener("pointerdown", e => { if (!alive) { reset(); return; } track(e, { end(dx, dy) { if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0); else turn(0, Math.sign(dy)); } }); });
    const keys = e => { if (O.state.front !== "glowworm") return; const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key]; if (m) { e.preventDefault(); e.stopPropagation(); turn(...m); } };
    document.addEventListener("keydown", keys, true);
    ctx.el.append(head("Glow Worm"), c, info, h("div.sub", { style: { textAlign: "center", color: "#99a", marginTop: "8px" } }, "Swipe on the board or use the arrow keys"));
    snake = [[8, 9], [7, 9], [6, 9]]; dir = [1, 0]; food = [12, 9]; draw(); info.textContent = "Tap the board to start";
    ctx.onHide(() => { clearInterval(iv); if (alive) { alive = false; info.textContent = "Paused. Tap to restart."; } });
    ctx.onClose(() => { clearInterval(iv); document.removeEventListener("keydown", keys, true); });
  } });

/* ---------- Memory Match ---------- */
store({ id: "memory", name: "Memory Match", subtitle: "Find the pairs", category: "Games", bg: "linear-gradient(#a18cd1,#fbc2eb)", glyph: '<rect x="3" y="5" width="8" height="11" rx="2" fill="#fff" stroke="none"/><rect x="13" y="8" width="8" height="11" rx="2" fill="#fff" stroke="none" opacity=".7"/>', keywords: "cards pairs concentration puzzle", desc: "Flip cards two at a time and match every pair in as few moves as you can.",
  render(ctx) {
    const grid = h("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", padding: "10px 16px" } }); const info = h("div", { style: { textAlign: "center", fontSize: "18px" } });
    let open = [], moves = 0, matched = 0, lock = false;
    function deal() { grid.innerHTML = ""; moves = 0; matched = 0; open = []; const em = "🍋🍇🍓🍑🥝🍍🥥🍒".split(/(?:)/u).filter(Boolean); const deck = [...em, ...em].sort(() => Math.random() - .5);
      deck.forEach(e => { const card = h("button", { style: { aspectRatio: ".75", borderRadius: "12px", fontSize: "34px", background: "linear-gradient(#a18cd1,#7b5bd6)", color: "transparent", transition: "transform .3s, background .3s" }, onclick: () => flip(card, e) }, e); grid.append(card); }); info.textContent = "Moves 0"; }
    function flip(card, e) { if (lock || open.includes(card) || card.dataset.done) return; card.style.background = "var(--card)"; card.style.color = "inherit"; card.style.transform = "rotateY(180deg) scaleX(-1)"; open.push(card);
      if (open.length === 2) { moves++; info.textContent = "Moves " + moves; const [a, b] = open;
        if (a.textContent === b.textContent) { a.dataset.done = b.dataset.done = 1; open = []; matched++; O.haptic(10); if (matched === 8) { const best = ctx.store.get("best", 0); if (!best || moves < best) ctx.store.set("best", moves); info.textContent = `Done in ${moves} moves · best ${ctx.store.get("best")}`; } }
        else { lock = true; setTimeout(() => { [a, b].forEach(x => { x.style.background = "linear-gradient(#a18cd1,#7b5bd6)"; x.style.color = "transparent"; x.style.transform = ""; }); open = []; lock = false; }, 700); } } }
    ctx.el.append(head("Memory Match", h("button.btn", { onclick: deal }, "New Game")), grid, info); deal();
  } });

/* ---------- Breathe ---------- */
store({ id: "breathe", name: "Breathe", subtitle: "One minute of calm", category: "Health", bg: "linear-gradient(#30cfd0,#330867)", glyph: "breathe", keywords: "meditation mindfulness calm relax", desc: "Follow the flower as it grows and shrinks. Breathe in, breathe out.",
  render(ctx) {
    ctx.el.style.background = "#0b1a2a"; ctx.el.style.color = "#fff";
    const petals = h("div", { style: { width: "240px", height: "240px", margin: "80px auto 30px", position: "relative", transition: "transform 4s ease-in-out" } }, ...Array.from({ length: 6 }, (_, i) => h("div", { style: { position: "absolute", left: "60px", top: "60px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(80,220,220,.35)", mixBlendMode: "screen", transform: `rotate(${i * 60}deg) translateY(-50px)`, transition: "transform 4s ease-in-out" } })));
    const label = h("div", { style: { textAlign: "center", fontSize: "26px" } }, "Tap Start"); let iv = 0, n = 0;
    const cyc = () => { const inn = n++ % 2 === 0; label.textContent = inn ? "Breathe in" : "Breathe out"; [...petals.children].forEach((p, i) => p.style.transform = `rotate(${i * 60 + (inn ? 30 : 0)}deg) translateY(${inn ? -50 : -8}px)`); petals.style.transform = inn ? "rotate(60deg) scale(1)" : "scale(.55)"; if (n > 15) stop(); };
    const stop = () => { clearInterval(iv); iv = 0; label.textContent = "Well done"; ctx.store.set("sessions", ctx.store.get("sessions", 0) + 1); btn.textContent = "Start"; };
    const btn = h("button.pill-btn", { style: { display: "block", margin: "30px auto", padding: "12px 34px", fontSize: "18px" }, onclick: () => { if (iv) return stop(); n = 0; cyc(); iv = setInterval(cyc, 4000); btn.textContent = "Stop"; } }, "Start");
    ctx.el.append(head("Breathe"), petals, label, btn, h("div.sub", { style: { textAlign: "center", color: "#8ab" } }, () => "")); petals.style.transform = "scale(.55)";
    ctx.onHide(() => iv && stop());
  } });

/* ---------- Habits ---------- */
store({ id: "habits", name: "Habits", subtitle: "Build streaks", category: "Health", bg: "linear-gradient(#f093fb,#f5576c)", glyph: '<path d="M5 12.5 10 17 19 7" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>', keywords: "habit tracker streak goals", desc: "Tick off daily habits and watch your streaks grow.",
  render(ctx) {
    const st = ctx.store; const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d.toISOString().slice(0, 10); });
    const habits = () => st.get("h", [{ id: "1", name: "Drink water", done: {} }, { id: "2", name: "Read 10 pages", done: {} }, { id: "3", name: "Walk", done: {} }]);
    const body = h("div");
    const streak = hb => { let s = 0; const d = new Date(); while (hb.done[d.toISOString().slice(0, 10)]) { s++; d.setDate(d.getDate() - 1); } return s; };
    const draw = () => { body.innerHTML = ""; body.append(h("div", { style: { display: "grid", gridTemplateColumns: "1fr repeat(7,30px)", gap: "4px", padding: "0 16px 8px", fontSize: "11px", color: "var(--ink3)", textAlign: "center" } }, h("span"), ...days.map(d => h("span", new Date(d + "T12:00").toLocaleDateString(undefined, { weekday: "narrow" })))));
      habits().forEach(hb => body.append(h("div", { dataset: { entity: "habit", title: hb.name }, style: { display: "grid", gridTemplateColumns: "1fr repeat(7,30px)", gap: "4px", alignItems: "center", padding: "10px 16px", background: "var(--card)", margin: "0 16px 8px", borderRadius: "12px" } },
        h("div", { onclick: () => O.sheet({ title: hb.name, actions: [{ label: "Delete Habit", red: true, run: () => { st.set("h", habits().filter(x => x.id !== hb.id)); draw(); } }] }) }, h("b", hb.name), h("div.sub", `🔥 ${streak(hb)} day streak`)),
        ...days.map(d => h("button", { style: { width: "28px", height: "28px", borderRadius: "50%", background: hb.done[d] ? "var(--pink)" : "var(--fill)", color: "#fff" }, onclick: () => { const all = habits(); const x = all.find(y => y.id === hb.id); x.done[d] = !x.done[d]; st.set("h", all); O.haptic(); draw(); } }, hb.done[d] ? "✓" : ""))))); };
    ctx.el.append(head("Habits", h("button.btn", { onclick: () => O.prompt("New habit", "", "e.g. Stretch").then(v => { if (v) { st.set("h", [...habits(), { id: T.uid(), name: v, done: {} }]); draw(); } }) }, "+ Add")), h("div.scroll", body)); draw();
  } });

/* ---------- Level ---------- */
store({ id: "level", name: "Level", subtitle: "Spirit level", category: "Utilities", bg: "linear-gradient(#232526,#414345)", glyph: "level", keywords: "spirit level bubble angle tilt", desc: "Uses your phone's motion sensors to check if things are level.",
  render(ctx) {
    ctx.el.style.background = "#000"; ctx.el.style.color = "#fff";
    const bub = h("div", { style: { position: "absolute", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(48,209,88,.8)", left: "50%", top: "50%", marginLeft: "-40px", marginTop: "-40px", transition: "transform .1s" } });
    const ring = h("div", { style: { width: "300px", height: "300px", borderRadius: "50%", border: "2px solid #444", margin: "60px auto", position: "relative" } }, h("div", { style: { position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: "#444" } }), h("div", { style: { position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "#444" } }), bub);
    const deg = h("div", { style: { textAlign: "center", fontSize: "64px", fontWeight: 200 }, dataset: { entity: "angle" } }, "0°");
    const note = h("div.sub", { style: { textAlign: "center", color: "#888" } }, "On a phone, allow motion access. On a computer, drag the bubble.");
    const set = (x, y) => { bub.style.transform = `translate(${O.clamp(x * 4, -110, 110)}px, ${O.clamp(y * 4, -110, 110)}px)`; const a = Math.round(Math.hypot(x, y)); deg.textContent = a + "°"; deg.dataset.title = deg.textContent; bub.style.background = a < 1 ? "rgba(48,209,88,.9)" : "rgba(255,255,255,.6)"; if (a < 1) O.haptic(3); };
    const on = e => { if (e.beta != null) { set(e.gamma || 0, e.beta || 0); note.textContent = ""; } };
    ring.addEventListener("pointerdown", e => track(e, { move(dx, dy) { set(dx / 4, dy / 4); }, end() { set(0, 0); } }));
    ctx.el.append(head("Level"), ring, deg, note, h("button.pill-btn.grey", { style: { display: "block", margin: "20px auto" }, onclick: () => { if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission(); } }, "Enable Motion"));
    ctx.onShow(() => window.addEventListener("deviceorientation", on)); ctx.onHide(() => window.removeEventListener("deviceorientation", on));
  } });

/* ---------- Focus Timer ---------- */
store({ id: "pomodoro", name: "Focus Timer", subtitle: "Work in focused sprints", category: "Productivity", bg: "linear-gradient(#ff512f,#dd2476)", glyph: "timer", keywords: "pomodoro focus productivity work", desc: "25 minutes on, 5 off. Shows a live countdown in the island.",
  render(ctx) {
    const big = h("div", { style: { fontSize: "84px", fontWeight: 200, textAlign: "center", margin: "70px 0 10px", fontVariantNumeric: "tabular-nums" } });
    const lbl = h("div.sub", { style: { textAlign: "center" } });
    const upd = () => { if (O.timerState.end && O.timerState.label.startsWith("Focus")) { big.textContent = O.fmtDur(O.timerState.end - Date.now()); lbl.textContent = O.timerState.label; } else { big.textContent = "25:00"; lbl.textContent = `Sessions completed: ${ctx.store.get("done", 0)}`; } };
    const iv = setInterval(upd, 500); ctx.onClose(() => clearInterval(iv));
    O.on("notification", n => { if (n.app === "clock" && /Focus sprint/.test(n.title)) ctx.store.set("done", ctx.store.get("done", 0) + 1); });
    ctx.el.append(head("Focus Timer"), big, lbl, h("div", { style: { display: "flex", justifyContent: "center", gap: "10px", marginTop: "30px" } },
      h("button.pill-btn", { style: { padding: "12px 24px" }, onclick: () => { O.startTimer(25 * 60e3, "Focus sprint"); upd(); } }, "Start 25 min"), h("button.pill-btn.grey", { onclick: () => { O.startTimer(5 * 60e3, "Focus break"); upd(); } }, "Break 5"), h("button.pill-btn.grey", { onclick: () => { O.stopTimer(); upd(); } }, "Stop")));
    upd();
  } });

/* ---------- Budget ---------- */
store({ id: "budget", name: "Budget", subtitle: "Track your spending", category: "Productivity", bg: "linear-gradient(#11998e,#38ef7d)", glyph: "coin", keywords: "money expenses finance spending", desc: "Log expenses by category and see where your money goes this month.",
  render(ctx) {
    const st = ctx.store; const items = () => st.get("x", []); const month = new Date().toISOString().slice(0, 7);
    const CAT = { Food: "#ff9f0a", Transport: "#0a84ff", Home: "#30d158", Fun: "#bf5af2", Other: "#8e8e93" };
    const body = h("div");
    const draw = () => { body.innerHTML = ""; const m = items().filter(i => i.d.startsWith(month)); const tot = m.reduce((a, i) => a + i.a, 0);
      const by = {}; m.forEach(i => by[i.c] = (by[i.c] || 0) + i.a);
      body.append(h("div", { style: { textAlign: "center", margin: "6px 0 16px" } }, h("div.sub", "Spent this month"), h("div", { style: { fontSize: "44px", fontWeight: 700 }, dataset: { entity: "amount", title: tot.toFixed(2) } }, tot.toFixed(2))),
        h("div", { style: { display: "flex", height: "14px", borderRadius: "7px", overflow: "hidden", margin: "0 16px 16px", background: "var(--fill)" } }, ...Object.entries(by).map(([c, a]) => h("div", { style: { width: (a / tot * 100) + "%", background: CAT[c] } }))),
        T.list(...Object.keys(CAT).map(c => T.row({ title: h("span", h("span", { style: { display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: CAT[c], marginRight: "8px" } }), c), val: (by[c] || 0).toFixed(2) }))),
        T.hdr("Recent"), m.length ? T.list(...m.slice().reverse().slice(0, 30).map(i => T.row({ title: i.n, sub: `${i.c} · ${i.d}`, val: i.a.toFixed(2), entity: "expense", onclick: () => O.sheet({ title: i.n, actions: [{ label: "Delete", red: true, run: () => { st.set("x", items().filter(x => x.id !== i.id)); draw(); } }] }) }))) : h("div.empty", "No expenses yet")); };
    const add = async () => { const n = await O.prompt("What did you buy?", "", "Coffee"); if (!n) return; const a = parseFloat(await O.prompt("Amount", "", "4.50")); if (!a) return;
      O.sheet({ title: "Category", actions: Object.keys(CAT).map(c => ({ label: c, run: () => { st.set("x", [...items(), { id: T.uid(), n, a, c, d: new Date().toISOString().slice(0, 10) }]); draw(); } })) }); };
    ctx.el.append(head("Budget", h("button.btn", { onclick: add }, "+ Add")), h("div.scroll", body)); draw();
  } });

/* ---------- Piano ---------- */
store({ id: "piano", name: "Piano", subtitle: "Play a tiny keyboard", category: "Entertainment", bg: "linear-gradient(#434343,#000)", glyph: '<rect x="3" y="5" width="18" height="14" rx="2" fill="#fff" stroke="none"/><path d="M7 5v8M11 5v8M15 5v8M19 5v8" stroke="#111" stroke-width="2"/><path d="M7 13v6M11 13v6M15 13v6" stroke="#888" stroke-width=".6"/>', keywords: "music instrument keys keyboard", desc: "Two octaves of synthesised piano. Works with your computer keyboard too (A to K).",
  render(ctx) {
    ctx.el.style.background = "#111"; ctx.el.style.color = "#fff";
    let ac; const play = m => { ac = ac || new AudioContext(); const t = ac.currentTime; [1, 2, 3].forEach((hm, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = i ? "sine" : "triangle"; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12) * hm; g.gain.setValueAtTime(.25 / (hm * hm) * O.settings.volume, t); g.gain.exponentialRampToValueAtTime(.0001, t + 1.6); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 1.7); }); };
    const wrap = h("div", { style: { position: "relative", height: "420px", margin: "30px 8px", display: "flex" } });
    const whites = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23];
    whites.forEach(s => wrap.append(h("button", { dataset: { m: 60 + s }, style: { flex: 1, background: "#fff", border: "1px solid #ccc", borderRadius: "0 0 8px 8px" } })));
    [1, 3, 6, 8, 10, 13, 15, 18, 20, 22].forEach(s => { const wi = whites.filter(w => w < s).length; wrap.append(h("button", { dataset: { m: 60 + s }, style: { position: "absolute", left: `calc(${wi / whites.length * 100}% - 11px)`, width: "22px", height: "250px", background: "#111", borderRadius: "0 0 5px 5px", zIndex: 2 } })); });
    wrap.addEventListener("pointerdown", e => { const k = e.target.closest("[data-m]"); if (k) { play(+k.dataset.m); k.style.filter = "brightness(.75)"; setTimeout(() => k.style.filter = "", 150); } });
    const map = "awsedftgyhujk"; const keys = e => { if (O.state.front !== "piano" || e.repeat || e.target.closest("input,textarea")) return; const i = map.indexOf(e.key); if (i >= 0) { e.stopPropagation(); play(60 + i); } };
    document.addEventListener("keydown", keys, true); ctx.onClose(() => document.removeEventListener("keydown", keys, true));
    ctx.el.append(head("Piano"), wrap, h("div.sub", { style: { textAlign: "center", color: "#888" } }, "Keys A W S E D F T G Y H U J K play one octave"));
  } });

/* ---------- Reader (live Wikipedia summaries) ---------- */
store({ id: "reader", name: "Reader", subtitle: "Learn something new", category: "Information", bg: "linear-gradient(#4b6cb7,#182848)", glyph: "book", keywords: "wikipedia articles reading learn news", desc: "Random article summaries from Wikipedia, with a one-tap summary and save to Notes.",
  render(ctx) {
    const card = h("div", { style: { padding: "0 16px" } });
    async function load(title) { card.innerHTML = "<div class='empty'>Loading…</div>";
      try { const r = await fetch(title ? `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}` : "https://en.wikipedia.org/api/rest_v1/page/random/summary"); const j = await r.json(); card.innerHTML = "";
        card.append(j.thumbnail ? h("img", { src: j.thumbnail.source, style: { width: "100%", maxHeight: "240px", objectFit: "cover", borderRadius: "16px" } }) : "", h("h2", { dataset: { entity: "article", title: j.title } }, j.title), h("div.sub", j.description || ""), h("p", { style: { fontSize: "17px", lineHeight: 1.5 } }, j.extract),
          h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } }, h("button.pill-btn", { onclick: () => load() }, "Next"), h("button.pill-btn.grey", { onclick: () => O.alert({ title: "✦ Summary", message: T.summarizeText(j.extract) }) }, "✦ Summarize"), h("button.pill-btn.grey", { onclick: () => { O.emit("add-note", j.title + "\n" + j.extract); O.toast("Saved to Notes"); } }, "Save to Notes"), h("button.pill-btn.grey", { onclick: () => O.open("browser", null, { intent: { url: j.content_urls?.mobile?.page } }) }, "Open"))); }
      catch { card.innerHTML = "<div class='empty'>Reader needs an internet connection.</div>"; } }
    const q = h("input", { placeholder: "Look up a topic", style: { flex: 1, border: 0, outline: 0, background: "none", fontSize: "17px" }, onkeydown: e => e.key === "Enter" && load(q.value) });
    ctx.el.append(head("Reader"), h("div.searchbar", { html: sys("search") }, q), h("div.scroll", card)); load();
  } });

/* ======================================================================== */
/* Store                                                                     */
/* ======================================================================== */
O.registerApp({ id: "store", name: "Store", bg: "linear-gradient(#20b2ff,#1a6dff)", glyph: "store", category: "Utilities", removable: false, keywords: "app store download install get apps games",
  render(ctx) {
    const host = h("div", { style: { position: "absolute", inset: 0 } }); ctx.el.append(host);
    const stack = O.makeStack(host);
    const catalog = () => Object.values(O.apps).filter(a => !a.builtin || (O.saved.removed || []).includes(a.id));
    const getBtn = (a, onColor = false) => {
      const b = h("button.pill-btn.grey", { "aria-label": (O.isInstalled(a.id) ? "Open " : "Get ") + a.name, style: { minWidth: "72px", minHeight: "32px", fontSize: "14px", background: onColor ? "#fff" : "" }, onclick: async e => {
        e.stopPropagation();
        if (O.isInstalled(a.id) && !O.installing) return O.open(a.id);
        if (O.isInstalled(a.id)) return O.open(a.id);
        b.innerHTML = `<svg viewBox="0 0 36 36" width="22" height="22"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--fill)" stroke-width="3"/><circle class="p" cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" stroke-width="3" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90 18 18)"/></svg>`;
        const off = O.on("install-progress", (id, p) => { if (id === a.id) { const c = b.querySelector(".p"); if (c) c.setAttribute("stroke-dasharray", `${Math.round(p * 100)} 100`); } });
        if (a.builtin) { O.saved.removed = (O.saved.removed || []).filter(x => x !== a.id); O.placeApp(a.id); O.persist(); O.renderHome(); O.emit("install-progress", a.id, 1); }
        else await O.install(a.id);
        off(); b.textContent = "Open"; O.haptic(20);
      } }, O.isInstalled(a.id) ? "Open" : "Get");
      return b;
    };
    const appRow = a => h("div.row", { dataset: { entity: "app", title: a.name }, style: { padding: "10px 16px" }, onclick: () => product(a) }, O.iconEl(a, { size: 58 }), h("div.grow", h("div", a.name), h("div.sub", a.subtitle || a.category)), getBtn(a));
    const stars = r => "★★★★★".slice(0, Math.round(r)) + "☆☆☆☆☆".slice(0, 5 - Math.round(r));
    function product(a) {
      const shots = h("div", { style: { display: "flex", gap: "10px", overflowX: "auto", padding: "0 16px 6px" } }, ...[0, 1, 2].map(i => h("div", { style: { flex: "none", width: "180px", height: "360px", borderRadius: "22px", background: a.bg, display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, filter: `hue-rotate(${i * 25}deg)` } }, O.iconEl(a, { size: 80 }))));
      stack.push(() => ({ title: "", large: false, back: "Back", body: h("div", h("div", { style: { display: "flex", gap: "16px", padding: "0 16px 16px" } }, O.iconEl(a, { size: 110 }), h("div", { style: { display: "flex", flexDirection: "column", gap: "4px", flex: 1 } }, h("div", { style: { fontSize: "22px", fontWeight: 700 } }, a.name), h("div.sub", a.subtitle || a.category), h("div", { style: { marginTop: "auto" } }, getBtn(a)))),
        h("div", { style: { display: "flex", justifyContent: "space-around", textAlign: "center", borderTop: ".5px solid var(--sep)", borderBottom: ".5px solid var(--sep)", padding: "10px 0", margin: "0 16px 16px", fontSize: "12px", color: "var(--ink3)" } },
          h("div", h("div", { style: { fontSize: "18px", fontWeight: 700, color: "var(--ink2)" } }, a.rating.toFixed(1)), stars(a.rating)), h("div", h("div", { style: { fontSize: "18px", fontWeight: 700, color: "var(--ink2)" } }, a.age), "Age"), h("div", h("div", { style: { fontSize: "18px", fontWeight: 700, color: "var(--ink2)" } }, a.size), "Size"), h("div", h("div", { style: { fontSize: "18px", fontWeight: 700, color: "var(--ink2)" } }, a.category.slice(0, 10)), "Category")),
        shots, h("p", { style: { padding: "0 16px", fontSize: "16px", lineHeight: 1.45 } }, a.desc || ""), T.list(T.row({ title: "Developer", val: a.builtin ? "Glassline" : a.dev }), T.row({ title: "Price", val: "Free" }), T.row({ title: "Privacy", val: "Data stays on device" }))) }));
    }
    const pages = [
      () => { const feat = catalog().filter(a => !a.builtin); const pick = feat[new Date().getDate() % Math.max(1, feat.length)];
        // editorial card: illustrated top (the app's own colours, its icon floating), story text and the app below
        const card = (label, title, sub, a) => {
          const art = h("div.st-art", { style: { background: a.bg } },
            h("i.st-blob", { style: { left: "-40px", top: "-30px", width: "200px", height: "200px" } }), h("i.st-blob", { style: { right: "-50px", bottom: "-60px", width: "240px", height: "240px", opacity: .35 } }),
            h("i.st-ring", { style: { right: "28px", top: "26px" } }), O.iconEl(a, { size: 132 }));
          return h("div.st-card", { dataset: { entity: "story", title }, onclick: () => product(a) }, art,
            h("div.st-text", h("div.st-eyebrow", label), h("div.st-title", title), h("div.st-sub", sub),
              h("div.st-app", O.iconEl(a, { size: 44 }), h("div", { style: { flex: 1, minWidth: 0 } }, h("div.st-name", a.name), h("div.st-tag", a.subtitle || a.category)), getBtn(a))));
        };
        return { title: "Today", under: h("div.st-date", new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })),
          body: h("div", play() ? playCard() : null,
            pick ? card("APP OF THE DAY", pick.subtitle || pick.name, pick.desc || "", pick) : null,
            O.apps.bubbles ? card("GET STARTED", "Games for a spare minute", "Quick rounds you can pause any time, built for one thumb.", O.apps.bubbles) : null,
            O.apps.habits ? card("WELLBEING", "Small habits, big changes", "Tick off one thing a day and watch the streak build.", O.apps.habits) : null,
            h("div", { style: { height: "120px" } })) }; },
      () => ({ title: "Games", body: h("div", chart("Top Free Games", catalog().filter(a => a.category === "Games")), h("div", { style: { height: "120px" } })) }),
      () => { const cats = {}; catalog().filter(a => a.category !== "Games").forEach(a => (cats[a.category] = cats[a.category] || []).push(a));
        return { title: "Apps", body: h("div", ...Object.entries(cats).map(([c, l]) => shelf(c, l)), chart("Top Free Apps", catalog().filter(a => a.category !== "Games").slice(0, 8)), h("div", { style: { height: "120px" } })) }; },
      () => { const res = h("div.list.flush"); const q = h("input", { placeholder: "Games, Apps and More", oninput: () => { const v = q.value.toLowerCase(); res.innerHTML = ""; catalog().filter(a => !v || (a.name + " " + (a.keywords || "") + " " + (a.subtitle || "")).toLowerCase().includes(v)).forEach(a => res.append(appRow(a))); if (play()) res.prepend(playRow(q.value)); } });
        setTimeout(() => q.dispatchEvent(new Event("input")), 0);
        return { title: "Search", body: h("div", h("div.searchbar", { html: sys("search") }, q), res, foot()) }; },
    ];
    // In the Android app, real apps come from Google Play
    const play = () => O.platform && O.platform.playStore;
    function playRow(query) {
      return h("div.row", { style: { padding: "10px 16px" }, onclick: () => O.platform.playStore(query) },
        h("div", { style: { width: "58px", height: "58px", borderRadius: "14px", background: "var(--fill)", display: "grid", placeItems: "center", color: "var(--accent)" }, html: sys("search") }),
        h("div.grow", h("div", query ? `Search Google Play for “${query}”` : "Browse Google Play"), h("div.sub", "Real Android apps install onto your Home Screen")), h("span.go"));
    }
    function playCard() {
      return h("div", { style: { margin: "0 16px 18px", borderRadius: "22px", background: "var(--card)", padding: "18px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }, onclick: () => O.platform.playStore("") },
        h("div", { style: { flex: 1 } }, h("div", { style: { fontSize: "13px", fontWeight: 600, color: "var(--ink3)" } }, "YOUR PHONE'S APPS"), h("div", { style: { fontSize: "20px", fontWeight: 600, letterSpacing: "-0.374px" } }, "Get apps from Google Play"), h("div.sub", { style: { color: "var(--ink3)", fontSize: "14px" } }, "They appear on your Home Screen as soon as they install.")),
        h("button.pill-btn", { style: { minHeight: "32px" } }, "Open"));
    }
    // a horizontal shelf of apps, three to a column, like a store's category rows
    function shelf(title, list) {
      const cols = []; for (let i = 0; i < list.length; i += 3) cols.push(list.slice(i, i + 3));
      return h("div.st-shelf", h("div.st-shelf-h", title, h("span", "See All")),
        h("div.st-shelf-row", cols.map(col => h("div.st-col", col.map(a => h("div.st-mini", { dataset: { entity: "app", title: a.name }, onclick: () => product(a) },
          O.iconEl(a, { size: 58 }), h("div", { style: { flex: 1, minWidth: 0 } }, h("div.st-name", a.name), h("div.st-tag", a.subtitle || a.category)), getBtn(a)))))));
    }
    function chart(title, list) {
      return h("div.st-shelf", h("div.st-shelf-h", title), h("div", list.map((a, i) => h("div.st-mini.st-rank", { dataset: { entity: "app", title: a.name }, onclick: () => product(a) },
        O.iconEl(a, { size: 58 }), h("b.st-num", i + 1), h("div", { style: { flex: 1, minWidth: 0 } }, h("div.st-name", a.name), h("div.st-tag", a.subtitle || a.category)), getBtn(a)))));
    }
    function foot() { return h("p.sub", { style: { padding: "16px", color: "var(--ink3)", fontSize: "12px" } }, (play() ? "Apps listed here are Glassline’s own. Real Android apps come from Google Play." : "Store apps are original web apps bundled with Glassline OS. Real iPhone apps can't run in a browser.")); }
    const tabs = T.tabbar([{ icon: "star", label: "Today" }, { icon: "rec", label: "Games" }, { icon: "grid", label: "Apps" }, { icon: "search", label: "Search" }], i => stack.replaceRoot(pages[i]), 0);
    ctx.el.append(tabs); stack.replaceRoot(pages[0]);
    O.on("store-show", id => { const a = O.apps[id]; if (a) product(a); });
    ctx.onShow(() => { if (stack.depth === 1) stack.replaceRoot(pages[[...tabs.children].findIndex(b => b.classList.contains("on"))]); });
  } });
})();
