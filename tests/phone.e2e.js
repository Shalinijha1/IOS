// End-to-end checks for phone/ (Glassline OS). Run: node tests/phone.e2e.js
// Serves phone/ over HTTP, drives real pointer gestures in Chromium and asserts on shell state.
// Writes screenshots to docs/screens/phone-*.png.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "phone");
const shots = path.join(__dirname, "..", "docs", "screens");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/$/, "/index.html"));
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});

let failures = 0;
const check = (name, ok, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`); if (!ok) failures++; };

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/index.html?fast`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 920 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());     // stay offline: no maps, weather or web
  await page.goto(base);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.waitForFunction(() => window.GOS && GOS.state.booted, null, { timeout: 8000 });
  const box = await (await page.$("#screen")).boundingBox(); const S = box.width / 393;
  const at = (x, y) => [box.x + x * S, box.y + y * S];
  const st = () => page.evaluate(() => ({ mode: GOS.state.mode, locked: GOS.state.locked, front: GOS.state.front, jiggle: GOS.state.jiggle, cc: GOS.state.ccOpen, recents: GOS.state.recents.slice() }));
  const shot = name => page.screenshot({ path: path.join(shots, `phone-${name}.png`), clip: { x: box.x - 14, y: box.y - 14, width: box.width + 28, height: box.height + 28 } });
  async function drag(a, b, { steps = 12, stepMs = 16, holdMs = 0 } = {}) {
    await page.mouse.move(...at(...a)); await page.mouse.down();
    for (let i = 1; i <= steps; i++) { await page.mouse.move(...at(a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps)); await page.waitForTimeout(stepMs); }
    if (holdMs) await page.waitForTimeout(holdMs);
    await page.mouse.up();
  }
  const tapEl = async sel => { const b = await (await page.$(sel)).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };

  // 1. Boot lands on the lock screen; swipe up unlocks to home
  await page.waitForTimeout(900);
  let s = await st(); check("boots to the lock screen", s.locked && s.mode === "lock");
  await shot("lock");
  await drag([196, 700], [196, 260]); await page.waitForTimeout(900);
  s = await st(); check("swipe up on the lock screen unlocks to home", !s.locked && s.mode === "home", JSON.stringify(s));
  await page.waitForTimeout(500); await shot("home");

  // 2. Tapping an icon launches the app from its icon
  await tapEl('#pages .cell[data-item="notes"] .icon'); await page.waitForTimeout(900);
  s = await st(); check("tapping Notes opens it", s.mode === "app" && s.front === "notes");

  // 3. Fast short flick on the home bar goes home (projected release)
  await drag([196, 845], [196, 690], { steps: 5, stepMs: 12 }); await page.waitForTimeout(900);
  s = await st(); check("fast flick up from the home bar goes home", s.mode === "home" && !s.front, JSON.stringify(s));

  // 4. Slow drag and pause opens the switcher; swiping a card up closes the app
  await tapEl('#pages .cell[data-item="settings"] .icon'); await page.waitForTimeout(900);
  await drag([196, 845], [196, 560], { steps: 20, stepMs: 20, holdMs: 300 }); await page.waitForTimeout(700);
  s = await st(); check("drag up and pause opens the app switcher", s.mode === "switcher", JSON.stringify(s));
  await shot("switcher");
  const card = await (await page.$('.card[data-app="settings"] .shot')).boundingBox();
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2 - i * 60); await page.waitForTimeout(12); }
  await page.mouse.up(); await page.waitForTimeout(900);
  const open = await page.evaluate(() => Object.keys(GOS.state.windows));
  check("swiping a card up closes that app", !open.includes("settings"), open.join(","));
  await page.evaluate(() => GOS.goHome()); await page.waitForTimeout(500);

  // 5. Navigation stack: push a page, then the interactive edge swipe pops it
  await page.evaluate(() => GOS.open("settings", null, { instant: true })); await page.waitForTimeout(400);
  await page.evaluate(() => [...document.querySelectorAll('.win[data-app="settings"] .row')].find(r => r.textContent.startsWith("General")).click());
  await page.waitForTimeout(700);
  const depth = () => page.evaluate(() => document.querySelectorAll('.win[data-app="settings"] .scr').length);
  check("tapping General pushes a page", await depth() === 2);
  await drag([6, 400], [300, 410], { steps: 10, stepMs: 16 }); await page.waitForTimeout(800);
  check("edge swipe from the left pops back", await depth() === 1);
  await drag([6, 400], [60, 400], { steps: 8, stepMs: 40 }); await page.waitForTimeout(600);
  check("short slow edge drag on a root page changes nothing", await depth() === 1);
  await page.evaluate(() => GOS.goHome()); await page.waitForTimeout(700);

  // 6. Top-right pull opens Control Centre; toggles change settings
  await drag([360, 8], [360, 300], { steps: 10 }); await page.waitForTimeout(700);
  s = await st(); check("pull down from the top right opens Control Centre", s.cc);
  await shot("control-centre");
  await page.click('#ccGrid [title="Dark Mode"]'); await page.waitForTimeout(200);
  check("Dark Mode toggle in Control Centre switches appearance", await page.evaluate(() => document.querySelector("#screen").classList.contains("dark")));
  await page.click('#ccGrid [title="Dark Mode"]');
  await page.keyboard.press("c"); await page.waitForTimeout(500);

  // 7. Press and hold an icon: context menu, then edit mode; Done exits
  const ib = await (await page.$('#pages .cell[data-item="maps"] .icon')).boundingBox();
  await page.mouse.move(ib.x + 30, ib.y + 30); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up();
  await page.waitForTimeout(400);
  check("press and hold an icon shows its menu", await page.$$eval(".ctx button", b => b.map(x => x.textContent)).then(t => t.includes("Edit Home Screen")));
  await page.evaluate(() => [...document.querySelectorAll(".ctx button")].find(b => b.textContent === "Edit Home Screen").click()); await page.waitForTimeout(400);
  s = await st(); check("Edit Home Screen enters jiggle mode", s.jiggle);
  await shot("edit-mode");
  const before = await page.evaluate(() => GOS.layout().pages[0].indexOf("maps"));
  const tgt = await (await page.$('#pages .cell[data-item="calendar"] .icon')).boundingBox();
  const src = await (await page.$('#pages .cell[data-item="maps"] .icon')).boundingBox();
  await page.mouse.move(src.x + 30, src.y + 30); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(src.x + 30 + (tgt.x - src.x) * i / 12, src.y + 30 + (tgt.y - src.y) * i / 12); await page.waitForTimeout(25); }
  await page.mouse.up(); await page.waitForTimeout(300);
  const after = await page.evaluate(() => GOS.layout().pages[0].indexOf("maps"));
  check("dragging an icon in edit mode reorders it", after < before, `${before} -> ${after}`);
  check("the drag ghost is removed on release", await page.$$eval("#dragGhost", g => g.length) === 0);
  await page.click("#doneBtn"); await page.waitForTimeout(300);
  check("Done leaves edit mode", !(await st()).jiggle);

  // 8. Store: install puts the app on the Home Screen with a progress ring, delete removes it
  await page.evaluate(() => GOS.install("bubbles"));
  check("installed app appears on the Home Screen", await page.evaluate(() => GOS.isInstalled("bubbles") && GOS.layout().pages.flat().includes("bubbles")));
  await page.evaluate(() => GOS.uninstall("bubbles")); await page.waitForTimeout(200);
  check("deleting a store app removes it", await page.evaluate(() => !GOS.isInstalled("bubbles") && !GOS.layout().pages.flat().includes("bubbles")));

  // 9. Assistant intents
  await page.evaluate(() => { GOS.openAssistant("test"); GOS.handleAsk("set a timer for 3 minutes"); GOS.handleAsk("turn on dark mode"); GOS.handleAsk("remind me to water the plants"); GOS.handleAsk("what is 12*7+3"); });
  await page.waitForTimeout(300);
  check("assistant: timer intent starts a timer", await page.evaluate(() => GOS.timerState.end > Date.now() + 170000));
  check("assistant: dark mode intent", await page.evaluate(() => GOS.settings.appearance === "dark"));
  check("assistant: reminder intent adds a reminder", await page.evaluate(() => (GOS.appStore("reminders").get("items", []) || []).some(i => /water the plants/.test(i.text))));
  check("assistant: maths", await page.evaluate(() => [...document.querySelectorAll(".as-msg")].some(m => m.textContent.includes("= 87"))));
  await shot("assistant");
  await page.evaluate(() => { GOS.handleAsk("turn on light mode"); GOS.stopTimer(); }); await page.keyboard.press("Escape");

  // 10. On-screen awareness: only annotated entities currently visible in the front app
  await page.evaluate(() => GOS.open("notes", null, { instant: true })); await page.waitForTimeout(400);
  const ents = await page.evaluate(() => GOS.screenEntities());
  check("screen context lists the visible notes", ents.app === "Notes" && ents.entities.filter(e => e.type === "note").length >= 2, JSON.stringify(ents.entities.slice(0, 3)));
  await page.evaluate(() => GOS.goHome()); await page.waitForTimeout(600);

  // 11. Search finds a note by content, a setting by meaning and an app despite a typo
  await page.evaluate(() => GOS.openSpotlight("groceries")); await page.waitForTimeout(300);
  check("search finds a note by its title", await page.$$eval("#spBody .sp-row .t", r => r.some(x => /Groceries/.test(x.textContent))));
  await page.fill("#spInput", "make the screen darker"); await page.waitForTimeout(200);
  check("search finds Display & Brightness by meaning", await page.$$eval("#spBody .sp-row .t", r => r.some(x => /Display/.test(x.textContent))));
  await page.fill("#spInput", "calculater"); await page.waitForTimeout(200);
  check("search tolerates a typo", await page.$$eval("#spBody .sp-row .t", r => r.some(x => x.textContent === "Calculator")));
  await page.fill("#spInput", "12*7"); await page.waitForTimeout(200);
  check("search answers arithmetic inline", await page.$$eval("#spBody .sp-row .t", r => r.some(x => x.textContent.includes("= 84"))));
  await shot("search");
  await page.click("#spCancel");

  // 12. Calculator works with chained operations
  await page.evaluate(() => GOS.open("calculator", null, { instant: true })); await page.waitForTimeout(300);
  for (const k of ["1", "2", "+", "7", "×", "2", "="]) await page.evaluate(k => [...document.querySelectorAll('.win[data-app="calculator"] button')].find(b => b.textContent === k).click(), k);
  const disp = await page.evaluate(() => document.querySelector('.win[data-app="calculator"] [data-entity="number"]').textContent);
  check("calculator: 12 + 7 × 2 chained left to right = 38", disp === "38", disp);
  await page.evaluate(() => GOS.goHome()); await page.waitForTimeout(600);

  // 13. Notifications: banner, badge, grouped summary
  await page.evaluate(() => { GOS.emit("incoming-message", { from: "Mia Chen", text: "Dinner at 7pm tonight?" }); GOS.emit("incoming-message", { from: "Leo Park", text: "Dinner sounds great" }); GOS.emit("incoming-message", { from: "Ava Rossi", text: "Running late for dinner" }); });
  await page.waitForTimeout(500);
  check("incoming message shows a banner", await page.$$eval("#banners .ntf", b => b.length) >= 1);
  check("Messages gets a badge", await page.evaluate(() => GOS.badges.messages >= 3));
  const sum = await page.evaluate(() => GOS.summarize(GOS.saved.notifications));
  check("summary groups by app, names people and topic", /3 from Messages/.test(sum) && /Mia Chen/.test(sum) && /dinner/.test(sum) && /7pm/.test(sum), sum);
  await page.waitForTimeout(4500);
  await drag([80, 8], [80, 600], { steps: 12 }); await page.waitForTimeout(700);
  check("pull down from the top left opens notifications", await page.evaluate(() => document.querySelector("#cover").classList.contains("nc")));
  await shot("notifications");
  await drag([196, 845], [196, 500], { steps: 6, stepMs: 12 }); await page.waitForTimeout(700);
  check("swipe up from the bottom closes notifications", await page.evaluate(() => !document.querySelector("#cover").classList.contains("on")));

  // 14. Passcode: wrong code shakes and stays locked, right code unlocks
  await page.evaluate(() => GOS.set("passcode", "1234")); await page.evaluate(() => GOS.set("faceUnlock", false));
  await page.evaluate(() => GOS.lock()); await page.waitForTimeout(200);
  await page.click("#hwPower"); await page.waitForTimeout(300);            // wake
  await drag([196, 700], [196, 260]); await page.waitForTimeout(500);
  check("swipe up with a passcode shows the keypad", await page.evaluate(() => document.querySelector("#passcode").classList.contains("on")));
  const key = k => page.evaluate(k => [...document.querySelectorAll(".pc-pad button")].find(b => b.firstChild.textContent === k).click(), k);
  for (const k of "9999") await key(k); await page.waitForTimeout(600);
  check("wrong passcode stays locked", (await st()).locked);
  for (const k of "1234") await key(k); await page.waitForTimeout(900);
  check("right passcode unlocks", !(await st()).locked);

  // 15. Persistence survives a reload
  await page.reload(); await page.waitForFunction(() => window.GOS && GOS.state.booted, null, { timeout: 8000 });
  check("settings and layout persist across reloads", await page.evaluate(() => GOS.settings.passcode === "1234" && GOS.layout().pages[0].indexOf("maps") < 5));

  check("no page errors", errors.length === 0, errors.join(" | "));
  await browser.close(); server.close();
  console.log(failures ? `\n${failures} failed` : "\nall passed");
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
