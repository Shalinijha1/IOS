// Android-mode checks for phone/ (what the APK runs), with a simulated window.GlasslineAndroid bridge.
// Run: node tests/android.e2e.js. Screenshots go to docs/screens/android-*.png.
// This exercises the web side of the bridge contract; the Java side is checked by building the APK.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "phone");
const shots = path.join(__dirname, "..", "docs", "screens");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/$/, "/index.html"));
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});

let failures = 0;
const check = (name, ok, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`); if (!ok) failures++; };

// A pretend phone: 30 apps with generated icons; default dialer, SMS, browser and camera; records every bridge call.
const BRIDGE = () => {
  // A realistic phone: the stock system apps (restyled by Glassline) plus fictional third-party apps with designed icons.
  const SYS = [["com.google.android.dialer", "Phone"], ["com.google.android.apps.messaging", "Messages"], ["com.google.android.GoogleCamera", "Camera"], ["com.google.android.apps.photos", "Photos"],
    ["com.google.android.deskclock", "Clock"], ["com.google.android.calculator", "Calculator"], ["com.google.android.calendar", "Calendar"], ["com.google.android.contacts", "Contacts"],
    ["com.android.settings", "Settings"], ["com.google.android.apps.nbu.files", "Files"], ["com.google.android.apps.recorder", "Recorder"]];
  const THIRD = [["Wave Browser", "#4facfe", "#00c6fb", "globe"], ["Pocket Bank", "#11998e", "#38ef7d", "coin"], ["ChatMate", "#7f5af0", "#2cb67d", "bubble"], ["Trail Run", "#f7971e", "#ffd200", "bolt"],
    ["Daily News", "#232526", "#414345", "lines"], ["Chess Club", "#3a3a3a", "#000", "king"], ["Podcast Hub", "#8e2de2", "#4a00e0", "mic"], ["Recipe Box", "#ff512f", "#f09819", "bowl"],
    ["Flight Deck", "#36d1dc", "#5b86e5", "plane"], ["Book Nook", "#c94b4b", "#4b134f", "book"], ["Ride Now", "#000", "#434343", "car"], ["Fit Coach", "#ff416c", "#ff4b2b", "heart"],
    ["Tune Box", "#fc466b", "#3f5efb", "note"], ["Photo Lab", "#f953c6", "#b91d73", "aperture"], ["Shop Cart", "#f12711", "#f5af19", "bag"], ["Lingo Daily", "#56ab2f", "#a8e063", "speech"],
    ["Budget Buddy", "#0f2027", "#2c5364", "chart"], ["Video Play", "#e52d27", "#b31217", "play"], ["Sky Weather", "#2980b9", "#6dd5fa", "sun"]];
  const icon = (a, b, kind) => {
    const c = document.createElement("canvas"); c.width = c.height = 96; const g = c.getContext("2d");
    if (a) { const gr = g.createLinearGradient(0, 0, 96, 96); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 96, 96); }
    g.fillStyle = "#fff"; g.strokeStyle = "#fff"; g.lineWidth = 7; g.lineCap = g.lineJoin = "round";
    const P = { globe: () => { g.beginPath(); g.arc(48, 48, 26, 0, 7); g.stroke(); g.beginPath(); g.ellipse(48, 48, 11, 26, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(22, 48); g.lineTo(74, 48); g.stroke(); },
      coin: () => { g.beginPath(); g.arc(48, 48, 26, 0, 7); g.fill(); g.fillStyle = a; g.font = "bold 34px sans-serif"; g.textAlign = "center"; g.fillText("$", 48, 60); },
      bubble: () => { g.beginPath(); g.ellipse(48, 44, 28, 22, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(30, 58); g.lineTo(24, 74); g.lineTo(42, 63); g.fill(); },
      bolt: () => { g.beginPath(); g.moveTo(54, 16); g.lineTo(28, 54); g.lineTo(46, 54); g.lineTo(40, 80); g.lineTo(68, 40); g.lineTo(50, 40); g.closePath(); g.fill(); },
      lines: () => { g.fillRect(22, 24, 52, 10); [44, 56, 68].forEach(y => g.fillRect(22, y, y === 68 ? 34 : 52, 6)); },
      king: () => { g.fillRect(30, 66, 36, 10); g.beginPath(); g.moveTo(34, 64); g.lineTo(38, 38); g.lineTo(58, 38); g.lineTo(62, 64); g.fill(); g.fillRect(45, 18, 6, 18); g.fillRect(38, 24, 20, 6); },
      mic: () => { g.beginPath(); g.roundRect(37, 18, 22, 38, 11); g.fill(); g.beginPath(); g.arc(48, 46, 20, 0, Math.PI); g.stroke(); g.fillRect(45, 66, 6, 12); },
      bowl: () => { g.beginPath(); g.arc(48, 46, 28, 0, Math.PI); g.fill(); g.beginPath(); g.moveTo(36, 36); g.lineTo(44, 18); g.moveTo(52, 36); g.lineTo(60, 18); g.stroke(); },
      plane: () => { g.save(); g.translate(48, 48); g.rotate(-0.6); g.beginPath(); g.ellipse(0, 0, 30, 6, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(-4, 0); g.lineTo(-16, -24); g.lineTo(-6, -24); g.lineTo(10, 0); g.lineTo(-6, 24); g.lineTo(-16, 24); g.fill(); g.restore(); },
      book: () => { g.beginPath(); g.moveTo(48, 28); g.quadraticCurveTo(34, 20, 20, 24); g.lineTo(20, 72); g.quadraticCurveTo(34, 68, 48, 76); g.quadraticCurveTo(62, 68, 76, 72); g.lineTo(76, 24); g.quadraticCurveTo(62, 20, 48, 28); g.fill(); g.strokeStyle = b; g.lineWidth = 3; g.beginPath(); g.moveTo(48, 30); g.lineTo(48, 74); g.stroke(); },
      car: () => { g.beginPath(); g.roundRect(18, 44, 60, 20, 8); g.fill(); g.beginPath(); g.moveTo(28, 46); g.lineTo(36, 30); g.lineTo(60, 30); g.lineTo(68, 46); g.fill(); g.fillStyle = a; [32, 64].forEach(x => { g.beginPath(); g.arc(x, 66, 8, 0, 7); g.fill(); }); },
      heart: () => { g.beginPath(); g.moveTo(48, 76); g.bezierCurveTo(10, 50, 22, 18, 48, 34); g.bezierCurveTo(74, 18, 86, 50, 48, 76); g.fill(); },
      note: () => { g.fillRect(38, 22, 6, 40); g.fillRect(38, 22, 28, 8); g.fillRect(60, 22, 6, 34); g.beginPath(); g.arc(34, 64, 9, 0, 7); g.arc(56, 58, 9, 0, 7); g.fill(); },
      aperture: () => { g.beginPath(); g.arc(48, 48, 27, 0, 7); g.stroke(); for (let k = 0; k < 6; k++) { const t = k * Math.PI / 3; g.beginPath(); g.moveTo(48 + 10 * Math.cos(t), 48 + 10 * Math.sin(t)); g.lineTo(48 + 27 * Math.cos(t + .9), 48 + 27 * Math.sin(t + .9)); g.stroke(); } },
      bag: () => { g.beginPath(); g.roundRect(24, 36, 48, 40, 6); g.fill(); g.beginPath(); g.arc(48, 36, 12, Math.PI, 0); g.stroke(); },
      speech: () => { g.font = "bold 40px sans-serif"; g.textAlign = "center"; g.fillText("Aa", 48, 62); },
      chart: () => { [[24, 50], [40, 36], [56, 24]].forEach(([x, y]) => g.fillRect(x, y, 12, 72 - y)); },
      play: () => { g.beginPath(); g.moveTo(38, 26); g.lineTo(70, 48); g.lineTo(38, 70); g.closePath(); g.fill(); },
      sun: () => { g.beginPath(); g.arc(48, 48, 14, 0, 7); g.fill(); for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4; g.beginPath(); g.moveTo(48 + 21 * Math.cos(t), 48 + 21 * Math.sin(t)); g.lineTo(48 + 29 * Math.cos(t), 48 + 29 * Math.sin(t)); g.stroke(); } } };
    (P[kind] || P.globe)(); return c.toDataURL();
  };
  const names = [...SYS.map(x => x[1]), ...THIRD.map(x => x[0])];
  let apps = null;
  const calls = window.__bridgeCalls = [];
  const rec = (n, ...a) => { calls.push([n, ...a]); };
  window.GlasslineAndroid = {
    listApps() { if (!apps) apps = [...SYS.map(([pkg, label]) => ({ pkg, label, category: -1, system: pkg === "com.android.settings", icon: icon("#999", "#666", "globe") })),
        ...THIRD.map(([label, a, b, kind], i) => ({ pkg: "com.example." + label.toLowerCase().replace(/[^a-z0-9]/g, ""), label, category: i % 8, system: false, icon: icon(a, b, kind), mono: i % 3 ? icon(null, null, kind) : undefined }))]; return JSON.stringify(apps); },
    defaultApps() { return JSON.stringify({ dialer: "com.google.android.dialer", sms: "com.google.android.apps.messaging", browser: "com.example.wavebrowser", camera: "com.google.android.GoogleCamera" }); },
    launch(p) { rec("launch", p); return true; }, launchFrom(p, x, y, w, h) { rec("launchFrom", p, x, y, w, h); return true; },
    uninstall(p) { rec("uninstall", p); }, appInfo(p) { rec("appInfo", p); }, torch(on) { rec("torch", on); return true; },
    setVolume(v) { rec("setVolume", v); }, setBrightness(v) { rec("setBrightness", v); }, openPanel(n) { rec("openPanel", n); },
    isDefaultHome() { return false; }, chooseHomeApp() { rec("chooseHomeApp"); }, hasNotificationAccess() { return false; }, requestNotificationAccess() { rec("requestNotificationAccess"); },
    openNotification(k) { rec("openNotification", k); return true; }, cancelNotification(k) { rec("cancelNotification", k); }, openPlayStore(q) { rec("openPlayStore", q); }, openSystemSettings() { rec("openSystemSettings"); },
    edgeSwipesOn() { return !!window.__edge; }, setEdgeSwipes(on) { rec("setEdgeSwipes", on); window.__edge = on; return on; },
    listIconPacks() { return JSON.stringify([{ pkg: "com.example.roundpack", label: "Round Pack" }]); }, iconPack() { return window.__pack || ""; },
    setIconPack(p) { rec("setIconPack", p); window.__pack = p; apps = null; }, closePanel() { rec("closePanel"); },
    __remove(pkg) { apps = apps.filter(a => a.pkg !== pkg); },
    // voice: "hearing" whatever the test queued in window.__heard
    startListening() { rec("startListening"); const said = window.__heard; setTimeout(() => { GOS.androidSpeech(JSON.stringify({ state: "ready" })); GOS.androidSpeech(JSON.stringify({ partial: (said || "").split(" ")[0] })); GOS.androidSpeech(JSON.stringify(said ? { final: said } : { error: "no-match" })); }, 60); },
    stopListening() { rec("stopListening"); }, speak(t) { rec("speak", t); },
    findContact(n) { rec("findContact", n); if (!window.__contactsOk) { window.__contactsOk = true; return JSON.stringify({ permission: true }); } return /mia/i.test(n) ? JSON.stringify({ name: "Mia Chen", number: "+15550101" }) : "{}"; },
    dial(n) { rec("dial", n); return true; }, sms(n, b) { rec("sms", n, b); return true; }, setAlarm(h, m, l) { rec("setAlarm", h, m, l); return true; }, setTimer(sec, l) { rec("setTimer", sec, l); return true; },
    navigate(q) { rec("navigate", q); return true; }, webSearch(q) { rec("webSearch", q); return true; }, openCamera() { rec("openCamera"); return true; },
    isAssistant() { return false; }, chooseAssistant() { rec("chooseAssistant"); },
  };
};

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?app=1&android=1&fast`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ctx.addInitScript(BRIDGE);
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.waitForFunction(() => window.GOS && GOS.state.booted, null, { timeout: 8000 });
  const calls = () => page.evaluate(() => window.__bridgeCalls.slice());

  check("screen fills the phone's aspect ratio (no letterbox)", await page.evaluate(() => GOS.H) === Math.round(393 * 915 / 412), String(await page.evaluate(() => GOS.H)));
  check("no device frame in the Android app", await page.evaluate(() => getComputedStyle(document.querySelector(".hw")).display === "none"));
  await page.evaluate(() => GOS.unlockFlow());
  // first-run setup prompt appears shortly after unlocking
  const prompted = await page.waitForFunction(() => [...document.querySelectorAll(".as-group button")].some(x => /Home Screen/.test(x.textContent)), null, { timeout: 4000 }).then(() => true, () => false);
  check("first run offers to become the Home app and read notifications", prompted && await page.$$eval(".as-group button", b => b.some(x => /notifications/.test(x.textContent))));
  await page.evaluate(() => [...document.querySelectorAll(".as-group button")].find(b => /Home Screen/.test(b.textContent)).click()); await page.waitForTimeout(400);
  check("…and opens Android's Home app setting", (await calls()).some(c => c[0] === "chooseHomeApp"));

  const L = await page.evaluate(() => GOS.layout());
  const onHome = L.pages.flat().filter(id => id.startsWith("android:"));
  check("every phone app is on the Home Screen", onHome.length + L.dock.filter(id => id.startsWith("android:")).length === 30, `${onHome.length} on pages, dock ${L.dock}`);
  check("dock holds the default dialer, messages, browser and camera", JSON.stringify(L.dock) === JSON.stringify(["android:com.google.android.dialer", "android:com.google.android.apps.messaging", "android:com.example.wavebrowser", "android:com.google.android.GoogleCamera"]));
  check("pages hold at most 24 slots", L.pages.every(p => p.reduce((n, it) => n + (it.startsWith("w:") ? 4 : 1), 0) <= 24));
  check("Glassline's duplicate apps stay off the Home Screen", !L.pages.flat().some(id => ["phone", "messages", "camera", "photos"].includes(id)));
  const sys = await page.evaluate(() => { const a = GOS.apps["android:com.google.android.dialer"], p = GOS.apps["android:com.google.android.apps.photos"]; return { a: a.name, aIcon: !!a.iconUrl, p: p.name, pIcon: !!p.iconUrl, gl: GOS.apps.phone.hidden }; });
  check("system apps take Glassline's iOS-style icons and names", sys.a === "Phone" && !sys.aIcon && sys.p === "Photos" && !sys.pIcon, JSON.stringify(sys));
  check("…and replace Glassline's simulated copies, so there's one Phone", sys.gl === true);
  check("third-party apps keep their own icon", await page.evaluate(() => !!GOS.apps["android:com.example.pocketbank"].iconUrl));
  check("built-in apps fill the first page, like an iPhone", await page.evaluate(() => GOS.layout().pages[0].slice(2, 6).every(id => GOS.apps[id] && GOS.apps[id].theme)));
  check("Glassline's own Settings is renamed to avoid two “Settings”", await page.evaluate(() => GOS.apps.settings.name === "Home Settings"));
  await page.screenshot({ path: path.join(shots, "android-home.png") });

  // tap a real app icon
  const first = onHome.find(id => id.startsWith("android:com.example."));   // a system app can't be deleted, so use an ordinary one
  await page.click(`.page .cell[data-item="${first}"] .icon`); await page.waitForTimeout(300);
  const launched = (await calls()).find(c => c[0] === "launchFrom");
  check("tapping an icon launches the real app from the icon's rectangle", launched && launched[1] === first.slice(8) && launched[4] > 0, JSON.stringify(launched));

  // delete goes to Android's uninstall dialog; a non-system app is removable
  await page.evaluate(id => { GOS.state.jiggle = false; }, first);
  const cell = await page.$(`.page .cell[data-item="${first}"]`); const b = await cell.boundingBox();
  await page.mouse.move(b.x + 30, b.y + 30); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up(); await page.waitForTimeout(400);
  const menu = await page.$$eval(".ctx button", x => x.map(y => y.textContent));
  check("press and hold shows App Info for a phone app", menu.includes("App Info"), menu.join(", "));
  const sysMenu = await page.evaluate(() => GOS.apps["android:com.android.settings"].removable);
  check("a system app offers no Delete", sysMenu === false);
  await page.evaluate(() => [...document.querySelectorAll(".ctx button")].find(b => b.textContent === "Remove App").click()); await page.waitForTimeout(400);
  await page.evaluate(() => [...document.querySelectorAll(".as-group button")].find(b => b.textContent === "Delete App").click()); await page.waitForTimeout(300);
  check("Delete App asks Android to uninstall", (await calls()).some(c => c[0] === "uninstall" && c[1] === first.slice(8)));

  // app removed on the phone: icon disappears on return
  await page.evaluate(p => { window.GlasslineAndroid.__remove(p); GOS.emit("android-resume"); }, first.slice(8)); await page.waitForTimeout(300);
  check("an uninstalled app disappears from the Home Screen", await page.evaluate(id => !GOS.layout().pages.flat().includes(id) && !GOS.apps[id], first));

  // control centre drives hardware
  await page.evaluate(() => GOS.openCC()); await page.waitForTimeout(500);
  await page.click('#ccGrid [title="Flashlight"]'); await page.waitForTimeout(100);
  await page.click('#ccGrid [title="Wi-Fi"]'); await page.waitForTimeout(200);
  const c2 = await calls();
  check("flashlight tile switches the real torch", c2.some(c => c[0] === "torch" && c[1] === true));
  check("Wi-Fi tile opens Android's Wi-Fi panel", c2.some(c => c[0] === "openPanel" && c[1] === "wifi"));
  await page.evaluate(() => GOS.set("volume", .3));
  check("volume changes the phone's media volume", (await calls()).some(c => c[0] === "setVolume" && Math.abs(c[1] - .3) < 1e-6));

  // phone notifications
  const app2 = onHome.find(id => id !== first && id.startsWith("android:com.example."));
  await page.evaluate(pkg => GOS.androidNotify(JSON.stringify({ key: "k1", pkg, title: "Sam", text: "Lunch at 1pm?", time: Date.now() })), app2.slice(8)); await page.waitForTimeout(500);
  check("a phone notification shows as a banner", await page.$$eval("#banners .ntf", n => n.some(x => /Lunch at 1pm/.test(x.textContent))));
  await page.screenshot({ path: path.join(shots, "android-notification.png") });
  await page.click("#banners .ntf"); await page.waitForTimeout(300);
  check("tapping it opens it in its app", (await calls()).some(c => c[0] === "openNotification" && c[1] === "k1"));
  await page.evaluate(pkg => GOS.androidNotify(JSON.stringify({ key: "k2", pkg, title: "Sam", text: "Running late", time: Date.now() })), app2.slice(8));
  await page.evaluate(() => GOS.androidNotifyRemoved("k2"));
  check("clearing it on the phone removes it from Glassline", await page.evaluate(() => !GOS.saved.notifications.some(n => n.key === "k2")));

  // Store sends real-app searches to Google Play
  await page.evaluate(() => GOS.open("store", null, { instant: true })); await page.waitForTimeout(500);
  await page.evaluate(() => [...document.querySelectorAll('.win[data-app="store"] .tabbar button')].find(b => /Search/.test(b.textContent)).click()); await page.waitForTimeout(400);
  await page.fill('.win[data-app="store"] .searchbar input', "maps"); await page.waitForTimeout(200);
  await page.evaluate(() => [...document.querySelectorAll('.win[data-app="store"] .row')].find(r => /Google Play/.test(r.textContent)).click()); await page.waitForTimeout(200);
  check("Store searches Google Play for real apps", (await calls()).some(c => c[0] === "openPlayStore" && c[1] === "maps"));
  await page.evaluate(() => GOS.goHome()); await page.waitForTimeout(600);

  // the assistant ("Siri") on Android: voice in and out, and real actions through the phone's own apps
  await page.evaluate(() => { GOS.goHome(); document.querySelectorAll("#sheetLayer > *").forEach(x => x.remove()); });
  await page.evaluate(() => { window.__heard = "set a timer for 2 minutes"; GOS.openAssistant("test"); }); await page.waitForTimeout(200);
  await page.click("#asMic"); await page.waitForTimeout(400);
  let c3 = await calls();
  check("the mic uses Android's speech recognizer", c3.some(c => c[0] === "startListening"));
  check("a spoken timer request sets a real timer in the phone's Clock", c3.some(c => c[0] === "setTimer" && c[1] === 120));
  check("the island still shows the countdown, without ringing twice", await page.evaluate(() => GOS.timerState.end > Date.now() && GOS.timerState.silent === true));
  check("replies are spoken with the phone's voice", c3.some(c => c[0] === "speak" && /Timer set/.test(c[1])));
  await page.evaluate(() => { GOS.stopTimer(); GOS.handleAsk("set an alarm for 7:30 am"); });
  check("alarms go into the phone's Clock app", (await calls()).some(c => c[0] === "setAlarm" && c[1] === 7 && c[2] === 30));
  await page.evaluate(() => GOS.handleAsk("call Mia")); await page.waitForTimeout(100);
  check("calling a name first asks for Contacts access", (await calls()).some(c => c[0] === "findContact") && await page.evaluate(() => [...document.querySelectorAll(".as-msg")].some(m => /Allow Contacts access/.test(m.textContent))));
  await page.evaluate(() => GOS.androidSpeech(JSON.stringify({ contacts: true }))); await page.waitForTimeout(150);
  check("…then retries and opens the dialer with the contact's number", (await calls()).some(c => c[0] === "dial" && c[1] === "+15550101"));
  await page.evaluate(() => GOS.handleAsk("text Mia saying running 5 minutes late"));
  check("messages open pre-filled in the phone's messaging app", (await calls()).some(c => c[0] === "sms" && c[1] === "+15550101" && /running 5 minutes late/.test(c[2])));
  await page.evaluate(() => GOS.handleAsk("call 555 0199"));
  check("plain numbers are dialled as they are", (await calls()).some(c => c[0] === "dial" && c[1] === "5550199"));
  await page.evaluate(() => { GOS.openAssistant("test"); GOS.handleAsk("navigate to Golden Gate Bridge"); });
  check("directions open the phone's maps app", (await calls()).some(c => c[0] === "navigate" && /golden gate bridge/i.test(c[1])));
  await page.evaluate(() => { GOS.openAssistant("test"); GOS.handleAsk("google liquid glass design"); });
  check("web searches open the phone's browser", (await calls()).some(c => c[0] === "webSearch" && /liquid glass design/.test(c[1])));
  await page.evaluate(() => { GOS.openAssistant("test"); GOS.handleAsk("turn on wifi"); });
  check("Wi-Fi requests open Android's Wi-Fi panel", (await calls()).filter(c => c[0] === "openPanel" && c[1] === "wifi").length >= 1);
  await page.evaluate(() => { GOS.openAssistant("test"); GOS.handleAsk("open chatmate"); }); await page.waitForTimeout(200);
  check("“open” launches the phone's own app", (await calls()).some(c => (c[0] === "launch" || c[0] === "launchFrom") && c[1] === "com.example.chatmate"));
  await page.evaluate(() => GOS.goHome()); await page.waitForTimeout(400);

  // the assistant over another app (the phone's assistant gesture)
  const asst = await ctx.newPage(); asst.on("pageerror", e => errors.push("assist: " + e.message));
  await asst.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await asst.addInitScript(() => { window.__heard = "what time is it"; });
  await asst.goto(url.replace("&fast", "&panel=assist"));
  await asst.waitForFunction(() => window.GOS && GOS.state.booted, null, { timeout: 8000 }); await asst.waitForTimeout(900);
  check("the assistant gesture opens the assistant over the current app and starts listening", await asst.evaluate(() => document.querySelector("#assistant").classList.contains("on") && window.__bridgeCalls.some(c => c[0] === "startListening")));
  check("…and answers out loud", await asst.evaluate(() => window.__bridgeCalls.some(c => c[0] === "speak" && /It's/.test(c[1]))));
  await asst.screenshot({ path: path.join(shots, "android-assistant.png") });
  await asst.mouse.click(206, 260);   // tap outside the conversation
  await asst.waitForTimeout(500);
  check("closing it closes the overlay", await asst.evaluate(() => window.__bridgeCalls.some(c => c[0] === "closePanel")));
  await asst.close();

  // Back gesture closes overlays and never leaves Home
  await page.evaluate(() => GOS.openSpotlight("bank")); await page.waitForTimeout(300);
  check("search finds phone apps", await page.$$eval("#spBody .sp-row .t", r => r.some(x => /Bank/.test(x.textContent))));
  check("Back closes search", await page.evaluate(() => GOS.androidBack()) === true && await page.evaluate(() => !GOS.state.spotlight));

  // screen off / on shows the lock screen
  await page.evaluate(() => GOS.androidScreen(false)); check("screen off locks Glassline", await page.evaluate(() => GOS.state.locked));
  await page.evaluate(() => GOS.androidScreen(true)); await page.waitForTimeout(300);
  check("screen on shows the lock screen awake", await page.evaluate(() => GOS.state.awake && document.querySelector("#cover").classList.contains("on")));
  await page.screenshot({ path: path.join(shots, "android-lock.png") });

  // icon appearance: Tinted uses each app's monochrome icon where it has one; Large hides names
  await page.evaluate(() => { if (GOS.state.locked) GOS.unlockFlow(); }); await page.waitForTimeout(1600);
  await page.evaluate(() => { document.querySelectorAll("#sheetLayer .scrim").forEach(x => x.click()); document.querySelectorAll("#banners .ntf").forEach(x => x.remove()); });
  await page.evaluate(() => { GOS.set("iconStyle", "tinted"); GOS.set("iconTint", 200); GOS.goHome(); }); await page.waitForTimeout(700);
  const tint = await page.evaluate(() => { const el = document.querySelector('.page .cell[data-item="android:com.example.chatmate"] .icon'); const m = el && el.querySelector(".mono");
    return { has: !!el && el.classList.contains("has-mono"), shown: !!m && getComputedStyle(m).display === "block", filter: el && getComputedStyle(el).filter }; });
  check("Tinted mode draws an app's own monochrome icon in the tint colour", tint.has && tint.shown && tint.filter === "none", JSON.stringify(tint));
  await page.screenshot({ path: path.join(shots, "android-tinted.png") });
  await page.evaluate(() => GOS.set("iconLarge", true)); await page.waitForTimeout(200);
  check("Large icons hide the app names", await page.evaluate(() => getComputedStyle(document.querySelector(".page .cell .lbl")).display === "none"));
  await page.screenshot({ path: path.join(shots, "android-large-dark.png") });
  await page.evaluate(() => { GOS.set("iconStyle", "default"); GOS.set("iconLarge", false); });

  // Home Settings: edge swipes and icon packs
  await page.evaluate(() => GOS.androidHome.setEdge(true));
  check("edge swipes can be switched on from Home Settings", (await calls()).some(c => c[0] === "setEdgeSwipes" && c[1] === true));
  await page.evaluate(() => GOS.androidHome.chooseIconPack()); await page.waitForTimeout(400);
  await page.evaluate(() => [...document.querySelectorAll(".as-group button")].find(b => b.textContent === "Round Pack").click()); await page.waitForTimeout(300);
  check("choosing an icon pack applies it", (await calls()).some(c => c[0] === "setIconPack" && c[1] === "com.example.roundpack") && await page.evaluate(() => GOS.androidHome.iconPackName() === "Round Pack"));

  // panel mode: Control Centre over another app, then closes itself
  const panel = await ctx.newPage(); panel.on("pageerror", e => errors.push("panel: " + e.message));
  await panel.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await panel.goto(url.replace("&fast", "&panel=cc"));
  await panel.waitForFunction(() => window.GOS && GOS.state.booted, null, { timeout: 8000 }); await panel.waitForTimeout(600);
  check("panel opens Control Centre straight away, no boot or lock", await panel.evaluate(() => GOS.state.ccOpen && !GOS.state.locked && document.querySelector("#boot").style.display === "none"));
  check("panel background is see-through so the app behind shows", await panel.evaluate(() => getComputedStyle(document.body).backgroundColor === "rgba(0, 0, 0, 0)" && getComputedStyle(document.querySelector("#wall")).display === "none"));
  await panel.screenshot({ path: path.join(shots, "android-panel-cc.png") });
  await panel.keyboard.press("c"); await panel.waitForTimeout(600);
  check("closing Control Centre closes the panel", await panel.evaluate(() => window.__bridgeCalls.some(c => c[0] === "closePanel")));
  await panel.goto(url.replace("&fast", "&panel=nc")); await panel.waitForFunction(() => window.GOS && GOS.state.booted); await panel.waitForTimeout(600);
  check("left-edge panel opens Notification Centre", await panel.evaluate(() => document.querySelector("#cover").classList.contains("nc")));
  check("Back inside a panel closes it", await panel.evaluate(() => GOS.androidBack() === true && window.__bridgeCalls.some(c => c[0] === "closePanel")));
  await panel.close();

  check("no page errors", errors.length === 0, errors.join(" | "));
  await browser.close(); server.close();
  console.log(failures ? `\n${failures} failed` : "\nall passed");
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
