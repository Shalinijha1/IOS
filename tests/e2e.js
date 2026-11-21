// End-to-end checks for prototype/index.html. Run: node tests/e2e.js
// Drives real pointer gestures in Chromium and asserts on the lab's decisions and recorded curves.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const html = "<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1,viewport-fit=cover'></head><body>" +
  fs.readFileSync(path.join(root, "prototype/index.html"), "utf8")
    .replace('<script src="search-engine.js"></script>', () => "<script>" + fs.readFileSync(path.join(root, "prototype/search-engine.js"), "utf8") + "</script>") + "</body></html>";

let failures = 0;
const check = (name, ok, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`); if (!ok) failures++; };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1500 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/fonts.googleapis.com/**", r => r.abort());
  await page.setContent(html, { waitUntil: "load" });
  const dev = await (await page.$("#device")).boundingBox();
  const at = (x, y) => ({ x: dev.x + x, y: dev.y + y });
  const state = () => page.evaluate(() => ({ ...window.__lab.state, opened: [...window.__lab.state.opened] }));
  const decision = () => page.$eval("#rDecision", o => o.value);
  const waitMode = m => page.waitForFunction(m => window.__lab.state.mode === m, m, { timeout: 4000 });

  async function drag(from, to, { steps = 10, stepMs = 16, holdMs = 0 } = {}) {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
      await page.waitForTimeout(stepMs);
    }
    if (holdMs) await page.waitForTimeout(holdMs);
    await page.mouse.up();
  }

  // 1. Launch: spring curve is recorded and matches the configured parameters when fitted
  await page.click('.icon[data-app="notes"]');
  await waitMode("app");
  const curve = await page.evaluate(() => window.__lab.lastCurve);
  check("launch records a curve", curve && curve.label === "launch" && curve.samples.length > 20, `${curve?.samples.length} samples`);
  const csv = "t,x\n" + curve.samples.map(([t, y]) => `${t},${y}`).join("\n");
  const csvPath = path.join(root, "tests", ".launch_curve.csv");
  fs.writeFileSync(csvPath, csv);
  const fitOut = execFileSync("python3", [path.join(root, "tools/spring_fit.py"), csvPath]).toString();
  fs.unlinkSync(csvPath);
  const resp = +fitOut.match(/response\s+([\d.]+)/)[1], damp = +fitOut.match(/dampingFraction\s+([\d.]+)/)[1];
  check("fitter recovers the lab's own launch spring", Math.abs(resp - 0.5) < 0.03 && Math.abs(damp - 0.86) < 0.05, `fitted ${resp}s ζ${damp} vs 0.50s ζ0.86`);

  // 2. Fast short flick up from the home bar → projection says home
  await drag(at(195, 835), at(195, 700), { steps: 5, stepMs: 12 });
  check("fast short flick goes home", (await decision()) === "home", `decision=${await decision()}, proj=${await page.$eval("#rProj", o => o.value)}`);
  await waitMode("home");

  // 3. Slow drag with a pause → app switcher
  await page.click('.icon[data-app="weather"]'); await waitMode("app");
  await drag(at(195, 835), at(195, 560), { steps: 20, stepMs: 20, holdMs: 200 });
  check("slow drag and pause opens switcher", (await decision()) === "switcher");
  await waitMode("switcher");
  const s3 = await state();
  check("switcher lists both opened apps", s3.opened.join() === "weather,notes", s3.opened.join());

  // 4. Swipe a card up to close it
  const card = await (await page.$('.card[data-app="weather"]')).boundingBox();
  await drag({ x: card.x + card.width / 2, y: card.y + 300 }, { x: card.x + card.width / 2, y: card.y + 120 }, { steps: 5, stepMs: 12 });
  await page.waitForTimeout(900);
  check("card swipe closes app", !(await state()).opened.includes("weather"));

  // 5. Tap the remaining card → reopens notes
  await page.click('.card[data-app="notes"]'); await waitMode("app");
  check("tapping card reopens app", (await state()).app === "notes");

  // 6. Push a detail page, then interactive edge swipe back
  await page.click("#pList .row >> nth=0"); await page.waitForTimeout(700);
  check("row tap pushes detail", (await state()).depth === 1);
  await drag(at(8, 400), at(260, 400), { steps: 8, stepMs: 14 });
  await page.waitForTimeout(700);
  check("edge swipe pops back", (await state()).depth === 0, `decision=${await decision()}`);

  // 7. Short slow edge drag is cancelled
  await page.click("#pList .row >> nth=1"); await page.waitForTimeout(700);
  await drag(at(8, 400), at(70, 400), { steps: 10, stepMs: 30, holdMs: 150 });
  await page.waitForTimeout(700);
  check("short slow edge drag stays on detail", (await state()).depth === 1);
  await page.click("#backBtn"); await page.waitForTimeout(600);

  // 8. Scrolling down minimizes the tab bar
  const w0 = await page.$eval("#tabbar", e => e.getBoundingClientRect().width);
  await page.$eval("#scList", e => { e.scrollTop = 60; }); await page.waitForTimeout(50);
  await page.$eval("#scList", e => { e.scrollTop = 300; }); await page.waitForTimeout(800);
  const w1 = await page.$eval("#tabbar", e => e.getBoundingClientRect().width);
  check("tab bar minimizes on scroll down", w1 < w0 * 0.6, `${w0.toFixed(0)} → ${w1.toFixed(0)} px`);

  // 9. Assistant: on-screen context only lists what is visible
  const inApp = await page.evaluate(() => window.__lab.visibleEntities());
  check("screen context inside app excludes home icons", inApp.some(e => e.startsWith("item:")) && !inApp.some(e => e.startsWith("app:")), inApp.slice(0, 4).join(", "));
  await page.evaluate(() => window.__lab.ask("go home")); await waitMode("home");
  const onHome = await page.evaluate(() => window.__lab.visibleEntities());
  check("screen context on home lists app icons", onHome.includes("app:Notes") && !onHome.some(e => e.startsWith("item:")));

  // 10. Assistant: swipe down on the pill invokes it; intents run
  await drag(at(195, 28), at(195, 110), { steps: 8, stepMs: 16 });
  await page.waitForTimeout(800);
  check("swipe down on pill opens assistant", await page.$eval("#island", e => e.classList.contains("asking")));
  await page.fill("#askInput", "set glass to 80"); await page.press("#askInput", "Enter");
  const g = await page.$eval("#device", e => e.style.getPropertyValue("--glass"));
  check("SetGlassIntent changes material", g === "0.8", `--glass=${g}`);
  await page.fill("#askInput", "dark mode"); await page.press("#askInput", "Enter");
  check("SetAppearanceIntent switches device appearance", await page.$eval("#device", e => e.classList.contains("dark")));
  await page.screenshot({ path: path.join(root, "docs/screens/assistant.png"), clip: { x: dev.x - 12, y: dev.y - 12, width: dev.width + 24, height: dev.height + 24 } });
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);

  // 11. Notification summary groups by app, most-active first
  const sum = await page.evaluate(() => window.__lab.summarize([
    { app: "messages", who: "Mia", text: "Dinner moved to 8 pm." }, { app: "messages", who: "Mia", text: "Bring the speaker?" },
    { app: "weather", who: "Weather", text: "Rain at 6 pm." }]));
  check("summary groups and ranks", sum.length === 2 && sum[0].app === "Messages" && sum[0].count === 2 && /8 pm/.test(sum[0].line), JSON.stringify(sum[0]));

  // 12. Pull down from the top edge opens the panel; velocity projection decides
  await drag(at(300, 20), at(300, 260), { steps: 6, stepMs: 12 });
  await page.waitForTimeout(800);
  const py = await page.evaluate(() => getComputedStyle(document.querySelector("#panel")).transform);
  check("pull-down opens panel from a short fast drag", (await decision()) === "open" && /, 0\)$/.test(py), `decision=${await decision()} transform=${py}`);
  await page.click("#sumBtn"); await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(root, "docs/screens/panel.png"), clip: { x: dev.x - 12, y: dev.y - 12, width: dev.width + 24, height: dev.height + 24 } });

  // 13. Physics helpers
  const ph = await page.evaluate(() => ({ p: window.__lab.project(1000), r: window.__lab.rubber(1000, 844) }));
  check("velocity projection matches 0.998 deceleration", Math.abs(ph.p - 499) < 0.5, `1000 px/s → ${ph.p.toFixed(1)} px`);
  check("rubber band stays below the dimension", ph.r < 844 && ph.r > 300, `1000 px → ${ph.r.toFixed(0)} px`);

  // full-page screenshot with an app open
  await drag(at(300, 700), at(300, 200), { steps: 5, stepMs: 12 }); await page.waitForTimeout(700);
  await page.click('.icon[data-app="settings"]'); await waitMode("app");
  await page.screenshot({ path: path.join(root, "docs/screens/lab.png"), fullPage: true });

  // 14. Search: swipe down in the middle of the Home Screen
  await drag(at(195, 835), at(195, 650), { steps: 4, stepMs: 12 }); await waitMode("home"); await page.waitForTimeout(300);
  await page.waitForFunction(() => /indexed on this device/.test(document.querySelector("#sStatus").textContent), null, { timeout: 4000 });
  await drag(at(195, 400), at(195, 560), { steps: 6, stepMs: 14 });
  await page.waitForTimeout(700);
  check("swipe down mid-screen opens search", (await state()).mode === "search" && await page.$eval("#sInput", e => document.activeElement === e), `decision=${await decision()}`);
  await page.keyboard.type("dentist"); await page.waitForTimeout(250);
  const top = await page.$eval("#sResults .srow", e => e.dataset.id + "|" + e.textContent);
  check("'dentist' returns the Dr. Patel note by meaning", top.startsWith("note:") && /Patel/.test(top) && /meaning/.test(top), top);
  await page.screenshot({ path: path.join(root, "docs/screens/search-meaning.png"), clip: { x: dev.x - 12, y: dev.y - 12, width: dev.width + 24, height: dev.height + 24 } });
  const inspector = await page.$eval("#sTBody tr", e => e.textContent);
  check("inspector shows per-ranker ranks", /Patel/.test(inspector), inspector);
  await page.fill("#sInput", "ma"); await page.waitForTimeout(400);
  const prov = await page.$eval("#sProv", e => e.textContent);
  check("live provider results arrive after indexed ones", /Mara Lind/.test(prov) && /live lookup/.test(prov), prov.slice(0, 60));
  await page.fill("#sInput", "wether"); await page.waitForTimeout(100);
  check("typo-tolerant top hit", (await page.$eval("#sResults .tophit .srow", e => e.dataset.id)) === "app:weather");
  await page.screenshot({ path: path.join(root, "docs/screens/search.png"), clip: { x: dev.x - 12, y: dev.y - 12, width: dev.width + 24, height: dev.height + 24 } });
  await page.keyboard.press("Enter"); await waitMode("app");
  check("Enter opens the top hit", (await state()).app === "weather");

  // 15. Index maintenance through the assistant, then search finds it immediately
  await page.evaluate(() => window.__lab.ask("new note: Call the plumber about the leak"));
  await page.evaluate(() => window.__lab.openSearch("plumber")); await page.waitForTimeout(1200);
  const hit = await page.$eval("#sResults .srow", e => e.textContent);
  check("a new note is searchable at once", /plumber/i.test(hit), hit.slice(0, 50));
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowUp"); await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await waitMode("app"); await page.waitForTimeout(600);
  check("opening a note result navigates into the note", (await state()).app === "notes" && (await state()).depth === 1 && /plumber/i.test(await page.$eval("#dTitle", e => e.textContent)));

  // 16. Ask fallback and search intent
  await page.evaluate(() => window.__lab.ask("search for vacation")); await page.waitForTimeout(1300);
  check("SearchIntent opens search with the query", (await page.$eval("#sInput", e => e.value)) === "vacation" && /Trip/.test(await page.$eval("#sResults .srow", e => e.textContent)));
  await page.click('.srow[data-id="ask"]'); await page.waitForTimeout(800);
  check("Ask row hands the query to the assistant", await page.$eval("#island", e => e.classList.contains("asking")));

  check("no page errors", errors.length === 0, errors.join(" | "));
  await browser.close();
  console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
