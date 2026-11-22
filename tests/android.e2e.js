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
  const names = ["Dialer", "Texts", "Web", "Cam", "Gallery", "Bank", "Chat", "Video Player", "Podcasts", "Notes Pro", "Fitness", "Recipes", "Trains", "Weather Now", "News", "Shop", "Banking 2", "Translator", "Scanner", "Radio",
    "Puzzle", "Racer", "Drawing", "Books", "Ride", "Flights", "Mail Pro", "Calendar+", "Files Go", "Android Settings"];
  const icon = i => { const c = document.createElement("canvas"); c.width = c.height = 48; const g = c.getContext("2d"); g.fillStyle = `hsl(${i * 37 % 360},70%,50%)`; g.fillRect(0, 0, 48, 48); g.fillStyle = "#fff"; g.font = "bold 26px sans-serif"; g.fillText(String.fromCharCode(65 + i % 26), 14, 33); return c.toDataURL(); };
  let apps = null;
  const calls = window.__bridgeCalls = [];
  const rec = (n, ...a) => { calls.push([n, ...a]); };
  window.GlasslineAndroid = {
    listApps() { if (!apps) apps = names.map((n, i) => ({ pkg: "com.example." + n.toLowerCase().replace(/[^a-z0-9]/g, ""), label: n, category: i % 8, system: i === 29, icon: icon(i) })); return JSON.stringify(apps); },
    defaultApps() { return JSON.stringify({ dialer: "com.example.dialer", sms: "com.example.texts", browser: "com.example.web", camera: "com.example.cam" }); },
    launch(p) { rec("launch", p); return true; }, launchFrom(p, x, y, w, h) { rec("launchFrom", p, x, y, w, h); return true; },
    uninstall(p) { rec("uninstall", p); }, appInfo(p) { rec("appInfo", p); }, torch(on) { rec("torch", on); return true; },
    setVolume(v) { rec("setVolume", v); }, setBrightness(v) { rec("setBrightness", v); }, openPanel(n) { rec("openPanel", n); },
    isDefaultHome() { return false; }, chooseHomeApp() { rec("chooseHomeApp"); }, hasNotificationAccess() { return false; }, requestNotificationAccess() { rec("requestNotificationAccess"); },
    openNotification(k) { rec("openNotification", k); return true; }, cancelNotification(k) { rec("cancelNotification", k); }, openPlayStore(q) { rec("openPlayStore", q); }, openSystemSettings() { rec("openSystemSettings"); },
    edgeSwipesOn() { return !!window.__edge; }, setEdgeSwipes(on) { rec("setEdgeSwipes", on); window.__edge = on; return on; },
    listIconPacks() { return JSON.stringify([{ pkg: "com.example.roundpack", label: "Round Pack" }]); }, iconPack() { return window.__pack || ""; },
    setIconPack(p) { rec("setIconPack", p); window.__pack = p; apps = null; }, closePanel() { rec("closePanel"); },
    __remove(pkg) { apps = apps.filter(a => a.pkg !== pkg); },
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
  check("dock holds the default dialer, messages, browser and camera", JSON.stringify(L.dock) === JSON.stringify(["android:com.example.dialer", "android:com.example.texts", "android:com.example.web", "android:com.example.cam"]));
  check("pages hold at most 24 slots", L.pages.every(p => p.reduce((n, it) => n + (it.startsWith("w:") ? 4 : 1), 0) <= 24));
  check("Glassline's duplicate apps stay off the Home Screen", !L.pages.flat().some(id => ["phone", "messages", "camera", "photos"].includes(id)));
  check("Glassline's own Settings is renamed to avoid two “Settings”", await page.evaluate(() => GOS.apps.settings.name === "Home Settings"));
  await page.screenshot({ path: path.join(shots, "android-home.png") });

  // tap a real app icon
  const first = onHome.find(id => !id.endsWith("androidsettings"));   // a system app can't be deleted, so use an ordinary one
  await page.click(`.page .cell[data-item="${first}"] .icon`); await page.waitForTimeout(300);
  const launched = (await calls()).find(c => c[0] === "launchFrom");
  check("tapping an icon launches the real app from the icon's rectangle", launched && launched[1] === first.slice(8) && launched[4] > 0, JSON.stringify(launched));

  // delete goes to Android's uninstall dialog; a non-system app is removable
  await page.evaluate(id => { GOS.state.jiggle = false; }, first);
  const cell = await page.$(`.page .cell[data-item="${first}"]`); const b = await cell.boundingBox();
  await page.mouse.move(b.x + 30, b.y + 30); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up(); await page.waitForTimeout(400);
  const menu = await page.$$eval(".ctx button", x => x.map(y => y.textContent));
  check("press and hold shows App Info for a phone app", menu.includes("App Info"), menu.join(", "));
  const sysMenu = await page.evaluate(() => GOS.apps["android:com.example.androidsettings"].removable);
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
  const app2 = onHome.find(id => id !== first && !id.endsWith("androidsettings"));
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

  // Back gesture closes overlays and never leaves Home
  await page.evaluate(() => GOS.openSpotlight("bank")); await page.waitForTimeout(300);
  check("search finds phone apps", await page.$$eval("#spBody .sp-row .t", r => r.some(x => /Bank/.test(x.textContent))));
  check("Back closes search", await page.evaluate(() => GOS.androidBack()) === true && await page.evaluate(() => !GOS.state.spotlight));

  // screen off / on shows the lock screen
  await page.evaluate(() => GOS.androidScreen(false)); check("screen off locks Glassline", await page.evaluate(() => GOS.state.locked));
  await page.evaluate(() => GOS.androidScreen(true)); await page.waitForTimeout(300);
  check("screen on shows the lock screen awake", await page.evaluate(() => GOS.state.awake && document.querySelector("#cover").classList.contains("on")));
  await page.screenshot({ path: path.join(shots, "android-lock.png") });

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
