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

/* Android's own system apps (from Google, Samsung, Xiaomi, OnePlus and stock Android) take Glassline's iOS-style icon
   and plain name, so the built-in apps look like one family. Apps from other developers keep their own icon, as they
   would on an iPhone. Turn off in Home Settings › Restyle System Apps. */
const SYSTEM = {
  phone: ["com.google.android.dialer", "com.samsung.android.dialer", "com.android.dialer", "com.oneplus.dialer", "com.android.incallui", "com.miui.dialer"],
  contacts: ["com.google.android.contacts", "com.samsung.android.app.contacts", "com.android.contacts", "com.oneplus.contacts"],
  messages: ["com.google.android.apps.messaging", "com.samsung.android.messaging", "com.android.mms", "com.android.messaging", "com.oneplus.mms"],
  camera: ["com.android.camera", "com.android.camera2", "com.google.android.GoogleCamera", "com.sec.android.app.camera", "com.oneplus.camera", "com.oplus.camera"],
  photos: ["com.google.android.apps.photos", "com.sec.android.gallery3d", "com.miui.gallery", "com.android.gallery3d", "com.oneplus.gallery", "com.coloros.gallery3d"],
  clock: ["com.google.android.deskclock", "com.sec.android.app.clockpackage", "com.android.deskclock", "com.oneplus.deskclock"],
  calculator: ["com.google.android.calculator", "com.sec.android.app.popupcalculator", "com.android.calculator2", "com.miui.calculator", "com.oneplus.calculator"],
  calendar: ["com.google.android.calendar", "com.samsung.android.calendar", "com.android.calendar"],
  settings: ["com.android.settings"],
  files: ["com.google.android.apps.nbu.files", "com.sec.android.app.myfiles", "com.android.documentsui", "com.mi.android.globalFileexplorer"],
  voicememos: ["com.sec.android.app.voicenote", "com.google.android.apps.recorder", "com.android.soundrecorder"],
  weather: ["com.sec.android.daemonapp", "com.miui.weather2"],
  notes: ["com.samsung.android.app.notes", "com.miui.notes"],
  reminders: ["com.samsung.android.app.reminder"],
  health: ["com.sec.android.app.shealth"],
};
const SYSTEM_NAME = { phone: "Phone", contacts: "Contacts", messages: "Messages", camera: "Camera", photos: "Photos", clock: "Clock", calculator: "Calculator", calendar: "Calendar",
  settings: "Settings", files: "Files", voicememos: "Voice Memos", weather: "Weather", notes: "Notes", reminders: "Reminders", health: "Health" };
const IOS_ORDER = ["calendar", "photos", "camera", "clock", "weather", "notes", "reminders", "calculator", "files", "contacts", "voicememos", "health", "settings"];
const themeFor = pkg => O.settings.restyleSystem === false ? null : Object.keys(SYSTEM).find(k => SYSTEM[k].includes(pkg)) || null;

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
    const t = themeFor(x.pkg), look = t && O.apps[t];
    O.registerApp({ id, name: look ? SYSTEM_NAME[t] : x.label, native: x.pkg, theme: t || undefined, category: look ? look.category : CAT[x.category] || "Utilities",
      iconUrl: look ? undefined : x.icon, bg: look ? look.bg : "#fff", glyph: look ? look.glyph : "", removable: !x.system,
      keywords: "android " + x.pkg, launch: () => launch(x.pkg), render() {} });
    if (!known) fresh.push(id);
  });
  // a restyled system app replaces Glassline's simulated app of the same kind, so there aren't two of each
  const themed = new Set(list.map(x => themeFor(x.pkg)).filter(Boolean));
  Object.keys(SYSTEM).forEach(t => { if (O.apps[t] && t !== "settings") O.apps[t].hidden = themed.has(t); });
  if (!O.saved.androidLayout) firstLayout(list);
  else fresh.forEach(id => O.placeApp(id));           // installed while Glassline was in the background
  O.persist(); O.index.dirty = true;
  if (O.state.booted) O.renderHome();
}

function firstLayout(list) {
  let defs = {}; try { defs = JSON.parse(call("defaultApps") || "{}"); } catch {}
  const ids = list.slice().sort((a, b) => a.label.localeCompare(b.label)).map(x => aid(x.pkg));
  const dock = ["dialer", "sms", "browser", "camera"].map(k => defs[k] && aid(defs[k])).filter(id => id && ids.includes(id));
  // like an iPhone: the built-in apps fill the first page in a familiar order, everything else follows A to Z
  const rank = id => { const t = themeFor(id.slice(8)); const i = IOS_ORDER.indexOf(t); return t ? (i < 0 ? 50 : i) : 100; };
  const rest = ids.filter(id => !dock.includes(id)).sort((a, b) => rank(a) - rank(b));
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
  restyleOn: () => O.settings.restyleSystem !== false,
  setRestyle: on => { O.set("restyleSystem", !!on); sync(); },
  edgeOn: () => !!call("edgeSwipesOn"),
  setEdge: on => !!call("setEdgeSwipes", !!on),
  iconPacks: () => { try { return JSON.parse(call("listIconPacks") || "[]"); } catch { return []; } },
  iconPackName: () => { const cur = call("iconPack") || ""; return cur ? ((O.androidHome.iconPacks().find(p => p.pkg === cur) || {}).label || cur) : "App Icons"; },
  // icon packs restyle every app's icon; Glassline reads the pack's appfilter like other launchers do
  chooseIconPack: () => {
    const packs = O.androidHome.iconPacks();
    const pick = pkg => { call("setIconPack", pkg); sync(); O.toast(pkg ? "Icon pack applied" : "Using each app's own icon"); };
    O.sheet({ title: "Icon Pack", message: packs.length ? "Applies to every app on the Home Screen." : "No icon packs installed. Get one from Google Play, then come back here.",
      actions: [{ label: "App Icons (default)", run: () => pick("") }, ...packs.map(p => ({ label: p.label, run: () => pick(p.pkg) })), { label: "Find Icon Packs on Google Play", run: () => call("openPlayStore", "icon pack") }] });
  },
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
