/* Glassline OS: Android integration. Active only inside the Android app (window.GlasslineAndroid exists); does nothing in a browser.
 *
 * - Every launchable Android app on the phone becomes a Home Screen icon (iOS-style rounded square) that opens the real app.
 * - First run lays out the Home Screen: widgets, then all apps alphabetically; the dock holds the phone's default
 *   dialer, messaging app, browser and camera. Installs and uninstalls made elsewhere are picked up on return.
 * - Delete App asks Android to uninstall; App Info opens Android's app page.
 * - Control Centre's flashlight, volume and connection tiles drive the real hardware or open Android's quick panels.
 * - With notification access, notifications from the phone's apps appear as banners, in Notification Centre and on
 *   the lock screen; tapping one opens it in its app, clearing one clears it on the phone.
 * - Glassline's own simulated apps that duplicate a real phone app stay in the App Library.
 */
(function () {
"use strict";
const O = window.GOS, A = window.GlasslineAndroid;
if (!O || !A) return;
const call = (fn, ...args) => { try { return typeof A[fn] === "function" ? A[fn](...args) : undefined; } catch (e) { console.warn("bridge", fn, e); return undefined; } };
const aid = pkg => "android:" + pkg;
const CAT = { 0: "Games", 1: "Entertainment", 2: "Entertainment", 3: "Creativity", 4: "Social", 5: "Information", 6: "Information", 7: "Productivity" };
// Glassline apps that a real phone app replaces: left off the first Home Screen layout, still in the App Library and Search
const DUPLICATES = ["phone", "messages", "browser", "camera", "photos", "mail", "clock", "calendar", "maps", "calculator", "contacts", "facetime", "music", "weather", "files", "voicememos", "compass", "magnifier", "translate", "health", "wallet", "notes", "reminders", "findmy", "home", "journal", "freeform", "shortcuts", "screentime"];
const SLOTS = 24;

function launch(pkg) {
  // open the real app from its icon's position so Android can animate out of it
  const el = [...document.querySelectorAll(`.icon[data-app="${aid(pkg)}"]`)].find(e => e.getBoundingClientRect().width > 0);
  const r = el ? el.getBoundingClientRect() : null, d = devicePixelRatio || 1;
  const ok = r && typeof A.launchFrom === "function" ? call("launchFrom", pkg, Math.round(r.left * d), Math.round(r.top * d), Math.round(r.width * d), Math.round(r.height * d)) : call("launch", pkg);
  if (ok === false) O.toast("Couldn't open this app");
}

function readApps() { try { return JSON.parse(call("listApps") || "[]"); } catch { return []; } }

function sync() {
  const list = readApps(); if (!list.length) return;
  const L = O.layout(), have = new Set(list.map(x => aid(x.pkg)));
  // removed from the phone: drop the icon everywhere
  Object.keys(O.apps).filter(id => id.startsWith("android:") && !have.has(id)).forEach(id => {
    L.pages.forEach(p => { const i = p.indexOf(id); if (i >= 0) p.splice(i, 1); });
    const d = L.dock.indexOf(id); if (d >= 0) L.dock.splice(d, 1);
    delete O.apps[id];
  });
  L.pages = L.pages.filter((p, i) => p.length || i === 0);
  const fresh = [];
  list.forEach(x => {
    const id = aid(x.pkg), known = O.apps[id];
    O.registerApp({ id, name: x.label, native: x.pkg, category: CAT[x.category] || "Utilities", iconUrl: x.icon, bg: "#fff", glyph: "", removable: !x.system,
      keywords: "android " + x.pkg, launch: () => launch(x.pkg), render() {} });
    if (!known) fresh.push(id);
  });
  if (!O.saved.androidLayout) firstLayout(list);
  else fresh.forEach(id => O.placeApp(id));           // installed while Glassline was in the background
  O.persist(); O.index.dirty = true;
  if (O.state.booted) O.renderHome();
}

function firstLayout(list) {
  let defs = {}; try { defs = JSON.parse(call("defaultApps") || "{}"); } catch {}
  const ids = list.slice().sort((a, b) => a.label.localeCompare(b.label)).map(x => aid(x.pkg));
  const dock = ["dialer", "sms", "browser", "camera"].map(k => defs[k] && aid(defs[k])).filter(id => id && ids.includes(id));
  const rest = ids.filter(id => !dock.includes(id));
  const pages = [["w:weather", "w:calendar"]];
  rest.forEach(id => { let p = pages[pages.length - 1]; const used = p.reduce((n, it) => n + (it.startsWith("w:") ? 4 : 1), 0); if (used >= SLOTS) { p = []; pages.push(p); } p.push(id); });
  const own = ["settings", "store", "tips"].filter(id => O.apps[id]);
  const last = pages[pages.length - 1]; if (last.length + own.length <= SLOTS) last.push(...own); else pages.push(own);
  O.saved.layout = { pages, dock: dock.length ? dock : ["phone", "browser", "messages", "music"] };
  O.saved.androidLayout = true;
}

/* ---------- platform hooks used by the shell ---------- */
const PANELS = { wifi: "wifi", cellular: "internet", bluetooth: "bluetooth", airplane: "airplane", hotspot: "hotspot" };
O.platform = {
  uninstall: a => call("uninstall", a.native),
  appInfo: a => call("appInfo", a.native),
  torch: on => call("torch", !!on) !== false,
  toggle: key => { if (!PANELS[key]) return false; call("openPanel", PANELS[key]); return true; },
  openNotification: n => { if (call("openNotification", n.key) === false) launch(n.pkg); },
  cancelNotification: n => call("cancelNotification", n.key),
  playStore: q => call("openPlayStore", q || ""),
};
O.on("settings", k => {
  if (k === "volume") call("setVolume", O.settings.volume);
  if (k === "brightness") call("setBrightness", O.settings.brightness);
});

/* ---------- notifications from the phone's apps (NotificationListenerService in the app) ---------- */
O.androidNotify = json => {
  let n; try { n = JSON.parse(json); } catch { return; }
  if (!O.apps[aid(n.pkg)]) sync();
  O.saved.notifications = (O.saved.notifications || []).filter(x => x.key !== n.key);  // updated notification replaces the old one
  O.notify({ app: O.apps[aid(n.pkg)] ? aid(n.pkg) : "settings", title: n.title || (O.apps[aid(n.pkg)] || {}).name, body: n.text || "", time: n.time || Date.now(), native: true, key: n.key, pkg: n.pkg, force: true });
};
O.androidNotifyRemoved = key => {
  const before = (O.saved.notifications || []).length;
  O.saved.notifications = (O.saved.notifications || []).filter(x => x.key !== key);
  if (O.saved.notifications.length !== before) { O.persist(); O.emit("notifications-changed"); }
};

/* ---------- screen off / on: show the Glassline lock screen when the phone wakes ---------- */
O.androidScreen = on => {
  if (O.settings.androidLock === false) return;
  if (!on) { if (!O.state.locked) O.lock(); }
  else if (O.state.locked) O.wake();
};

/* ---------- Settings > General entries and first-run setup ---------- */
O.androidHome = {
  isDefault: () => !!call("isDefaultHome"),
  choose: () => call("chooseHomeApp"),
  systemSettings: () => call("openSystemSettings"),
  hasNotificationAccess: () => !!call("hasNotificationAccess"),
  requestNotificationAccess: () => call("requestNotificationAccess"),
};
function setupPrompt() {
  const steps = [];
  if (!O.androidHome.isDefault()) steps.push({ label: "Use Glassline as Home Screen", run: () => O.androidHome.choose() });
  if (!O.androidHome.hasNotificationAccess()) steps.push({ label: "Show my app notifications", run: () => O.androidHome.requestNotificationAccess() });
  if (!steps.length) return;
  steps.push({ label: "Not Now", run: () => { O.saved.androidSetupSnoozed = Date.now(); O.persist(); } });
  O.sheet({ title: "Set Up Glassline", message: "Make Glassline your Home Screen so the Home gesture brings you here, and allow notification access so your apps' notifications appear on the lock screen and in Notification Centre.", actions: steps });
}

if (O.apps.settings) O.apps.settings.name = "Home Settings";   // Android's own Settings app keeps its name
sync();
O.on("booted", sync);
// ask once per unlock at most every three days, until both steps are done
O.on("unlock", () => { const t = O.saved.androidSetupSnoozed || 0; if (Date.now() - t > 3 * 86400e3) setTimeout(setupPrompt, 700); });
O.on("android-resume", sync);
O.on("android-packages", sync);
})();
