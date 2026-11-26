// Glassline OS desktop app (Electron). Opens phone/index.html in a transparent, phone-shaped window.
const { app, BrowserWindow, Menu, shell, session, nativeTheme } = require("electron");
const path = require("path");

const W = 393 + 24 + 34, H = 852 + 24 + 34;   // device frame plus a small margin for the shadow
let win;

if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function create() {
  win = new BrowserWindow({
    width: W, height: H, minWidth: Math.round(W * .55), minHeight: Math.round(H * .55),
    frame: false, transparent: true, hasShadow: false, resizable: true, backgroundColor: "#00000000",
    title: "Glassline OS", icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true },
  });
  win.setAspectRatio(W / H);
  win.loadFile(path.join(__dirname, "..", "phone", "index.html"), { query: { app: "1" } });
  // links meant for "a real browser tab" open in the user's browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("file:")) { e.preventDefault(); shell.openExternal(url); } });
}

app.whenReady().then(() => {
  // camera, microphone, location and notifications are used by Camera, Voice Memos, Maps, Weather and Video
  const allowed = new Set(["media", "geolocation", "notifications", "clipboard-sanitized-write", "fullscreen"]);
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(allowed.has(perm)));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => allowed.has(perm));
  const isMac = process.platform === "darwin";
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac ? [{ role: "appMenu" }] : []),
    { label: "Device", submenu: [
      { label: "Home", accelerator: "CmdOrCtrl+Shift+H", click: () => win.webContents.executeJavaScript("GOS.goHome()") },
      { label: "Lock", accelerator: "CmdOrCtrl+L", click: () => win.webContents.executeJavaScript("GOS.lock()") },
      { label: "App Switcher", accelerator: "CmdOrCtrl+Shift+S", click: () => win.webContents.executeJavaScript("GOS.showSwitcher()") },
      { type: "separator" },
      { label: "Actual Size", accelerator: "CmdOrCtrl+0", click: () => win.setSize(W, H) },
      { label: "Always on Top", type: "checkbox", click: m => win.setAlwaysOnTop(m.checked) },
      { type: "separator" },
      { label: "Erase All Content and Settings…", click: () => win.webContents.executeJavaScript("GOS.reset()") },
      { type: "separator" }, isMac ? { role: "close" } : { role: "quit" },
    ] },
    { role: "editMenu" },
    { label: "View", submenu: [{ role: "reload" }, { role: "toggleDevTools" }] },
  ]));
  nativeTheme.themeSource = "system";
  create();
  app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) create(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
