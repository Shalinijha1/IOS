/* Glassline OS: system shell.
 * Everything here is original code. Interaction models (springs, projected release, rubber band) follow the
 * public behaviour documented in ../EVIDENCE.md. Not affiliated with Apple. */
(function () {
"use strict";
const W = 393, H = 852;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- DOM builder ---------- */
function h(sel, props, ...kids) {
  const m = sel.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i) || [];
  const el = document.createElement(m[1] || "div");
  (m[2] || "").replace(/([.#])([\w-]+)/g, (_, t, n) => { t === "." ? el.classList.add(n) : (el.id = n); });
  if (props && (typeof props !== "object" || props instanceof Node || Array.isArray(props))) { kids.unshift(props); props = null; }
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "html") el.innerHTML = v;
    else if (k === "text") el.textContent = v;
    else if (k === "class") el.className += " " + v;
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k in el && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return el;
}

/* ---------- glyphs: original line drawings on a 24 px grid ---------- */
const G = {
  phone: '<path d="M6.6 3.5 9 3l1.6 4-2 1.4a11 11 0 0 0 7 7l1.4-2 4 1.6-.5 2.4a2 2 0 0 1-2 1.6C10.6 19 5 13.4 5 5.5a2 2 0 0 1 1.6-2z" fill="#fff" stroke="none"/>',
  message: '<path d="M12 4c5 0 9 3.1 9 7s-4 7-9 7c-1 0-2-.1-2.9-.4L5 19.5l1.2-3.4C4.2 14.8 3 13 3 11c0-3.9 4-7 9-7z" fill="#fff" stroke="none"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5" fill="#fff" stroke="none"/><path d="m4 7 8 6 8-6" stroke="#2e7cf6" stroke-width="1.6"/>',
  compass: '<circle cx="12" cy="12" r="9" stroke-width="1.4"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" fill="#fff"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke-width="1.2"/>',
  camera: '<path d="M3.5 8h3.8l1.7-2.5h6l1.7 2.5h3.8v10.5h-17z" fill="#fff" stroke="none"/><circle cx="12" cy="13" r="3.6" fill="#555" stroke="#bbb" stroke-width="1.2"/>',
  photos: '<g stroke="none" opacity=".92"><ellipse cx="12" cy="6.5" rx="2.6" ry="4" fill="#ffb02e"/><ellipse cx="12" cy="17.5" rx="2.6" ry="4" fill="#3d8bfd"/><ellipse cx="6.5" cy="12" rx="4" ry="2.6" fill="#33c46b"/><ellipse cx="17.5" cy="12" rx="4" ry="2.6" fill="#ff4d6d"/><ellipse cx="8.2" cy="8.2" rx="2.6" ry="4" fill="#c5e33a" transform="rotate(-45 8.2 8.2)"/><ellipse cx="15.8" cy="15.8" rx="2.6" ry="4" fill="#9b6bff" transform="rotate(-45 15.8 15.8)"/><ellipse cx="15.8" cy="8.2" rx="2.6" ry="4" fill="#ff7a3d" transform="rotate(45 15.8 8.2)"/><ellipse cx="8.2" cy="15.8" rx="2.6" ry="4" fill="#2bc5c5" transform="rotate(45 8.2 15.8)"/></g>',
  clock: '<circle cx="12" cy="12" r="9" fill="#fff" stroke="none"/><path d="M12 6.5V12l3.5 2" stroke="#111" stroke-width="1.6"/><circle cx="12" cy="12" r="1" fill="#f60" stroke="none"/>',
  calendar: '<text x="12" y="9" text-anchor="middle" font-size="5" font-weight="700" fill="#ff3b30" stroke="none" font-family="system-ui">DAY</text><text x="12" y="20" text-anchor="middle" font-size="11" fill="#111" stroke="none" font-family="system-ui">1</text>',
  weather: '<circle cx="9" cy="9" r="3.6" fill="#ffd84a" stroke="none"/><path d="M7.5 19h9.5a3.5 3.5 0 0 0 .2-7 5 5 0 0 0-9.4 1.2A3 3 0 0 0 7.5 19z" fill="#fff" stroke="none"/>',
  map: '<path d="M3 6.5 8.5 4l7 2.5L21 4v13.5L15.5 20l-7-2.5L3 20z" fill="#fff" stroke="none" opacity=".95"/><path d="M8.5 4v13.5M15.5 6.5V20" stroke="#5ab0ff" stroke-width="1.2"/><circle cx="12" cy="11" r="2" fill="#ff3b30" stroke="none"/>',
  note: '<rect x="4.5" y="3.5" width="15" height="17" rx="2" fill="#fff" stroke="none"/><path d="M4.5 7.5h15" stroke="#f5c400" stroke-width="2.4"/><path d="M7.5 11.5h9M7.5 14.5h9M7.5 17.5h5" stroke="#ccc" stroke-width="1"/>',
  checklist: '<circle cx="6" cy="7" r="1.8" fill="#0a84ff" stroke="none"/><circle cx="6" cy="12" r="1.8" fill="#ff3b30" stroke="none"/><circle cx="6" cy="17" r="1.8" fill="#ff9500" stroke="none"/><path d="M10 7h9M10 12h9M10 17h9" stroke="#888" stroke-width="1.3"/>',
  music: '<path d="M9.5 17.5V6.5l9-2v11" stroke-width="1.8"/><circle cx="7.5" cy="17.5" r="2.2" fill="#fff"/><circle cx="16.5" cy="15.5" r="2.2" fill="#fff"/>',
  calc: '<g stroke="none"><circle cx="7" cy="7" r="2.4" fill="#a5a5a5"/><circle cx="12" cy="7" r="2.4" fill="#a5a5a5"/><circle cx="17" cy="7" r="2.4" fill="#ff9f0a"/><circle cx="7" cy="12" r="2.4" fill="#555"/><circle cx="12" cy="12" r="2.4" fill="#555"/><circle cx="17" cy="12" r="2.4" fill="#ff9f0a"/><circle cx="7" cy="17" r="2.4" fill="#555"/><circle cx="12" cy="17" r="2.4" fill="#555"/><circle cx="17" cy="17" r="2.4" fill="#ff9f0a"/></g>',
  gear: '<circle cx="12" cy="12" r="3" stroke-width="1.6"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="12" r="6.4" stroke-width="1.6"/>',
  store: '<path d="M8 17 12.8 7.5M16 17l-4.8-9.5M6.5 13.8h11" stroke-width="2" stroke-linecap="round"/>',
  folder: '<path d="M3 7a1.5 1.5 0 0 1 1.5-1.5h5L11 7.5h8.5A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" fill="#fff" stroke="none"/>',
  wave: '<path d="M4 12h1M7 9v6M10 6v12M13 8v8M16 10v4M19 11v2" stroke-width="2" stroke-linecap="round"/>',
  person: '<circle cx="12" cy="9" r="3.6" fill="#fff" stroke="none"/><path d="M5 19.5c1.2-3.4 4-5 7-5s5.8 1.6 7 5" fill="#fff" stroke="none"/>',
  video: '<rect x="3" y="7" width="12" height="10" rx="2.5" fill="#fff" stroke="none"/><path d="m16 11 5-3v8l-5-3z" fill="#fff" stroke="none"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="#ff2d55" stroke="none"/>',
  wallet: '<rect x="4" y="5" width="16" height="4.5" rx="1.5" fill="#3d8bfd" stroke="none"/><rect x="4" y="8" width="16" height="4.5" rx="1.5" fill="#ffb02e" stroke="none"/><rect x="4" y="11" width="16" height="4.5" rx="1.5" fill="#33c46b" stroke="none"/><path d="M3.5 14h17v4.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" fill="#fff" stroke="none"/>',
  bulb: '<path d="M9 17h6M10 20h4M12 3.5a5.5 5.5 0 0 0-3.2 10c.6.5 1 1.2 1 2V16h4.4v-.5c0-.8.4-1.5 1-2A5.5 5.5 0 0 0 12 3.5z" stroke-width="1.6"/>',
  magnifier: '<circle cx="10.5" cy="10.5" r="6" stroke-width="2"/><path d="m15 15 5 5" stroke-width="2.6" stroke-linecap="round"/><path d="M10.5 8v5M8 10.5h5" stroke-width="1.6"/>',
  translate: '<path d="M4 6h8M8 4v2M5.5 6c.5 3 2.5 5.5 5 6.5M10.5 6c-.5 3-2.5 5.5-5 6.5" stroke-width="1.5"/><path d="m12 20 3.5-8 3.5 8M13.2 17.5h4.6" stroke-width="1.6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5" stroke-width="2"/><path d="m15.5 15.5 5 5" stroke-width="2"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="#fff" stroke="none"/>',
  game: '<path d="M7 8h10a4 4 0 0 1 4 4.5l-.6 3.4a2 2 0 0 1-3.5.9L15 15H9l-1.9 1.8a2 2 0 0 1-3.5-.9L3 12.5A4 4 0 0 1 7 8z" fill="#fff" stroke="none"/><path d="M7 11v3M5.5 12.5h3" stroke="#555" stroke-width="1.4"/><circle cx="16" cy="11.5" r="1" fill="#555" stroke="none"/><circle cx="17.5" cy="13.5" r="1" fill="#555" stroke="none"/>',
  brush: '<path d="M19 4 10 13l1.5 1.5 9-9A1 1 0 0 0 19 4z" fill="#fff" stroke="none"/><path d="M9 14c-2 0-3.5 1.5-3.5 3.3 0 1-.7 1.7-1.5 2.2 3.5.9 7-.5 7-3.5z" fill="#fff" stroke="none"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="4" fill="#fff" stroke="none"/><g fill="#333" stroke="none"><circle cx="8.5" cy="8.5" r="1.4"/><circle cx="15.5" cy="15.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="15.5" cy="8.5" r="1.4"/><circle cx="8.5" cy="15.5" r="1.4"/></g>',
  leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15" fill="#fff" stroke="none"/><path d="M5 19 13 11" stroke="#2f9e5b" stroke-width="1.4"/>',
  coin: '<circle cx="12" cy="12" r="8.5" fill="#fff" stroke="none"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2-.4-2.5-1.2M12 6.5v11" stroke="#1f8a4c" stroke-width="1.5"/>',
  level: '<rect x="3" y="9" width="18" height="6" rx="3" stroke-width="1.6"/><circle cx="12" cy="12" r="1.8" fill="#fff"/><path d="M9 9v6M15 9v6" stroke-width="1"/>',
  breathe: '<g fill="#fff" stroke="none" opacity=".55"><circle cx="12" cy="8" r="4"/><circle cx="12" cy="16" r="4"/><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/></g>',
  ruler: '<rect x="3" y="8" width="18" height="8" rx="1.5" fill="#fff" stroke="none"/><path d="M6 8v3M9 8v2M12 8v3M15 8v2M18 8v3" stroke="#555" stroke-width="1.2"/>',
  book: '<path d="M4 5.5c3-1 5.5-.6 8 1 2.5-1.6 5-2 8-1v13c-3-1-5.5-.6-8 1-2.5-1.6-5-2-8-1z" fill="#fff" stroke="none"/><path d="M12 6.5v13" stroke="#999" stroke-width="1"/>',
  bolt: '<path d="M13 3 6 13h5l-1 8 7-10h-5z" fill="#fff" stroke="none"/>',
  tip: '<path d="M9 17h6M10 20h4M12 3.5a5.5 5.5 0 0 0-3.2 10c.6.5 1 1.2 1 2V16h4.4v-.5c0-.8.4-1.5 1-2A5.5 5.5 0 0 0 12 3.5z" fill="#fff" stroke="none"/>',
  timer: '<circle cx="12" cy="13" r="7.5" stroke-width="1.8"/><path d="M12 13V9M10 3h4" stroke-width="1.8" stroke-linecap="round"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
  pen: '<path d="M4 20l1-4L16 5l3 3L8 19z" fill="#fff" stroke="none"/>',
};
const SYS = { // small UI glyphs used by the shell (stroke = currentColor)
  plane: '<path d="M21 15.5v-2l-8-4.5V4a1.5 1.5 0 0 0-3 0v5L2 13.5v2l8-2.5v5l-2.5 1.8V21l4-1 4 1v-1.2L13 18v-5z" fill="currentColor" stroke="none"/>',
  cell: '<path d="M4 18v-3M9 18v-6M14 18V9M19 18V5" stroke-width="2.6" stroke-linecap="round"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.3a9.5 9.5 0 0 1 13 0M8.6 15.5a5 5 0 0 1 6.8 0" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor"/>',
  bt: '<path d="m7 7 10 10-5 4V3l5 4L7 17" stroke-width="1.9" stroke-linejoin="round"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" stroke="none"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke-linecap="round"/>',
  speaker: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" stroke-linecap="round"/>',
  torch: '<path d="M8 2.5h8v3.5l-2 4v11.5h-4V10l-2-4z"/><path d="M12 13v2"/>',
  lockrot: '<path d="M12 4a8 8 0 1 0 8 8" stroke-linecap="round"/><path d="m20 6-0 6-6-0" stroke-linecap="round"/><rect x="9" y="11" width="6" height="5" rx="1" fill="currentColor"/>',
  mirror: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M9 21h6M12 17v4"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>',
  bellOff: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0M3 3l18 18"/>',
  half: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>',
  rec: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5" fill="currentColor"/>',
  drop: '<path d="M12 3.5s6.5 7 6.5 11a6.5 6.5 0 0 1-13 0c0-4 6.5-11 6.5-11z"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z" fill="currentColor" stroke="none"/>',
  next: '<path d="M4 5v14l8-7zM12 5v14l8-7z" fill="currentColor" stroke="none"/>',
  prev: '<path d="M20 5v14l-8-7zM12 5v14l-8-7z" fill="currentColor" stroke="none"/>',
  back: '<path d="M15 4 7 12l8 8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke-width="2.2" stroke-linecap="round"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4M5 11v9h14v-9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  trash: '<path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13" stroke-width="1.8" stroke-linejoin="round"/>',
  sparkle: '<path d="M12 3c.8 4.4 2.6 6.2 7 7-4.4.8-6.2 2.6-7 7-.8-4.4-2.6-6.2-7-7 4.4-.8 6.2-2.6 7-7z" fill="currentColor" stroke="none"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 7h8M8.5 12h1M14.5 12h1M8.5 16h1M14.5 16h1"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 13V9M10 3h4" stroke-linecap="round"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  focus: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" stroke="none"/>',
  home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
  hotspot: '<circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M8 8a5.5 5.5 0 0 0 0 8M16 8a5.5 5.5 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" stroke-linecap="round"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z" stroke-linejoin="round"/><path d="m13.5 6.5 4 4"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/>',
};
const svg = (inner, vb = "0 0 24 24", cls = "") => `<svg viewBox="${vb}" class="${cls}" fill="none" stroke="currentColor" stroke-width="2">${inner}</svg>`;
const sys = (name, extra = "") => svg(SYS[name] || "", "0 0 24 24", extra);

/* ---------- persistence ---------- */
const KEY = "glassline.os.v1";
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { saved = {}; }
let saveTimer = 0;
function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { console.warn("storage full", e); } }, 150); }
function appStore(id) {
  saved.data = saved.data || {};
  return {
    get(k, d) { const v = (saved.data[id] || {})[k]; return v === undefined ? (typeof d === "function" ? d() : structuredClone(d)) : v; },
    set(k, v) { saved.data[id] = saved.data[id] || {}; saved.data[id][k] = v; persist(); index.dirty = true; },
  };
}

/* ---------- settings ---------- */
const DEFAULTS = {
  appearance: "auto", glass: 55, brightness: 1, volume: .6, wallpaper: 0, lockFont: 0,
  wifi: true, bluetooth: true, cellular: true, airplane: false, hotspot: false, silent: false, focus: null, rotationLock: true,
  reduceMotion: false, reduceTransparency: false, nightShift: false, passcode: "", faceUnlock: true, autoLock: 120,
  simulateMessages: true, summaries: true, sounds: true, haptics: true, name: "My Phone", owner: "You", textSize: 1,
  showHelp: true, lowPower: false, boldText: false,
};
const S = Object.assign({}, DEFAULTS, saved.settings || {});
function set(k, v) { S[k] = v; saved.settings = S; persist(); applySettings(k); emit("settings", k); }

/* ---------- tiny event bus ---------- */
const listeners = {};
function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return () => listeners[ev] = listeners[ev].filter(f => f !== fn); }
function emit(ev, ...a) { (listeners[ev] || []).forEach(f => { try { f(...a); } catch (e) { console.error(e); } }); }

/* ---------- springs ---------- */
function project(v, rate = .998) { return (v / 1000) * rate / (1 - rate); }       // px/s -> px of travel
function rubber(x, dim, c = .55) { const s = Math.sign(x), a = Math.abs(x); return s * (1 - 1 / (a * c / dim + 1)) * dim; }
const running = new Map();
function spring(key, from, to, { response = .5, damping = .86, velocity = 0 } = {}, onUpdate) {
  if (running.has(key)) running.get(key).cancel();
  return new Promise(resolve => {
    if (S.reduceMotion || document.hidden) { onUpdate(to, 1); resolve(true); return; }
    const k = (2 * Math.PI / response) ** 2, c = 4 * Math.PI * damping / response;
    const range = Math.abs(to - from) || 1;
    let x = from, v = velocity, last = performance.now(), dead = false, raf;
    const handle = { cancel() { dead = true; cancelAnimationFrame(raf); running.delete(key); resolve(false); } };
    running.set(key, handle);
    function frame(now) {
      if (dead) return;
      let dt = Math.min(.064, (now - last) / 1000); last = now;
      const steps = Math.ceil(dt / .004); dt /= steps;
      for (let i = 0; i < steps; i++) { const a = -k * (x - to) - c * v; v += a * dt; x += v * dt; }
      const done = Math.abs(x - to) < range * .0015 && Math.abs(v) < range * .02;
      if (done) x = to;
      onUpdate(x, 1 - (to - x) / ((to - from) || 1));
      if (done) { running.delete(key); resolve(true); } else raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  });
}

/* ---------- pointer tracking in screen coordinates ---------- */
let scale = 1, screen;
function local(e) { const r = screen.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; }
function track(e, { move, end, axis, slop = 6 }) {
  const el = e.currentTarget || e.target;
  const p0 = local(e), samples = [{ ...p0, t: performance.now() }];
  let locked = !axis, dir = null, lastMoveT = performance.now();
  try { el.setPointerCapture(e.pointerId); } catch {}
  const onMove = ev => {
    if (ev.pointerId !== e.pointerId) return;
    const p = local(ev), dx = p.x - p0.x, dy = p.y - p0.y;
    samples.push({ ...p, t: performance.now() }); if (samples.length > 8) samples.shift();
    if (Math.hypot(dx, dy) > 1.5) lastMoveT = performance.now();
    if (!locked) { if (Math.hypot(dx, dy) < slop) return; dir = Math.abs(dx) > Math.abs(dy) ? "x" : "y"; locked = true; }
    move && move(dx, dy, p, dir, ev);
  };
  const onUp = ev => {
    if (ev.pointerId !== e.pointerId) return;
    window.removeEventListener("pointermove", onMove, true); window.removeEventListener("pointerup", onUp, true); window.removeEventListener("pointercancel", onUp, true);
    const p = local(ev), now = performance.now();
    const old = samples.find(s => now - s.t < 90) || samples[0];
    const dt = Math.max(.008, (now - old.t) / 1000);
    let vx = (p.x - old.x) / dt, vy = (p.y - old.y) / dt;
    const held = now - lastMoveT;
    if (held > 70) { vx = 0; vy = 0; }
    end && end(p.x - p0.x, p.y - p0.y, vx, vy, { held, dir, p, moved: Math.hypot(p.x - p0.x, p.y - p0.y) > slop, cancelled: ev.type === "pointercancel" });
  };
  window.addEventListener("pointermove", onMove, true); window.addEventListener("pointerup", onUp, true); window.addEventListener("pointercancel", onUp, true);
  return p0;
}
function haptic(ms = 8) { if (S.haptics && navigator.vibrate) try { navigator.vibrate(ms); } catch {} }

/* ---------- sound: original synthesized tones (no recorded system sounds) ---------- */
let actx;
function audio() { if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); } if (actx && actx.state === "suspended") actx.resume(); return actx; }
function tone(notes, { type = "sine", gain = .08, force = false } = {}) {
  if ((!S.sounds || S.silent) && !force) return;
  const a = audio(); if (!a) return;
  let t = a.currentTime + .01;
  for (const [f, d] of notes) {
    if (f) {
      const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * S.volume * 1.6, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
    }
    t += d * .8;
  }
}
const SOUND = {
  lock: () => tone([[220, .07], [180, .08]], { type: "triangle", gain: .12 }),
  unlock: () => tone([[330, .05], [440, .06]], { type: "triangle", gain: .08 }),
  notify: () => tone([[880, .12], [1320, .22]], { gain: .07 }),
  sent: () => tone([[660, .05], [990, .1]], { gain: .05 }),
  click: () => tone([[2000, .015]], { type: "square", gain: .015 }),
  alarm: () => tone([[880, .2], [0, .1], [880, .2], [0, .1], [1175, .35]], { gain: .12, force: true }),
};

/* ---------- app registry ---------- */
const apps = {};
function registerApp(def) {
  def = Object.assign({ category: "Utilities", builtin: true, removable: true, bg: "linear-gradient(#888,#555)", glyph: "grid", status: "ink" }, def);
  apps[def.id] = def;
  return def;
}
function iconEl(app, opts = {}) {
  const el = h("div.icon", { style: { background: app.bg }, dataset: { app: app.id } });
  el.innerHTML = typeof app.glyph === "function" ? app.glyph() : svg(G[app.glyph] || app.glyph, "0 0 24 24") ;
  const svgEl = el.querySelector("svg"); if (svgEl) { svgEl.setAttribute("stroke", "#fff"); svgEl.setAttribute("stroke-width", "1.8"); }
  if (opts.size) Object.assign(el.style, { width: opts.size + "px", height: opts.size + "px", borderRadius: opts.size * .235 + "px" });
  return el;
}
const isInstalled = id => apps[id] && (apps[id].builtin ? !(saved.removed || []).includes(id) : (saved.installed || []).includes(id));

/* ---------- home layout ---------- */
const DEFAULT_LAYOUT = {
  pages: [
    ["w:weather", "w:calendar", "calendar", "photos", "camera", "mail", "clock", "maps", "weather", "reminders", "notes", "store", "calculator", "wallet", "settings", "health"],
    ["w:batteries", "files", "voicememos", "contacts", "compass", "magnifier", "translate", "tips", "facetime", "w:music"],
  ],
  dock: ["phone", "browser", "messages", "music"],
};
function layout() {
  if (!saved.layout) saved.layout = structuredClone(DEFAULT_LAYOUT);
  return saved.layout;
}
const SLOTS = 24;
const weight = it => it.startsWith("w:") ? (WIDGETS[it.slice(2)]?.size === "wide" ? 8 : 4) : 1;
function placeApp(id) {
  const L = layout();
  if (L.pages.flat().includes(id) || L.dock.includes(id)) return;
  let pg = L.pages.find(p => p.reduce((a, it) => a + weight(it), 0) < SLOTS);
  if (!pg) { pg = []; L.pages.push(pg); }
  pg.push(id); persist();
}
function unplace(id) {
  const L = layout();
  L.pages.forEach(p => { const i = p.indexOf(id); if (i >= 0) p.splice(i, 1); });
  const d = L.dock.indexOf(id); if (d >= 0) L.dock.splice(d, 1);
  L.pages = L.pages.filter((p, i) => p.length || i === 0);
  persist();
}

/* ---------- widgets ---------- */
const WIDGETS = {
  weather: { name: "Weather", size: "small", render: () => { const w = weatherNow(); return h("div.widget.w-weather", { onclick: () => open("weather") }, h("h4", w.city), h("div.big", w.temp + "°"), h("div.sm", w.cond), h("div.sm", `H:${w.hi}° L:${w.lo}°`)); } },
  calendar: { name: "Calendar", size: "small", render: () => { const d = new Date(); const ev = nextEvent();
    return h("div.widget.w-cal", { onclick: () => open("calendar") }, h("div.dow", d.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase()), h("div.num", d.getDate()),
      h("div.sm", { style: { opacity: .7, marginTop: "8px", color: "#333" } }, ev ? `${ev.title} · ${ev.time}` : "No more events today")); } },
  batteries: { name: "Batteries", size: "small", render: () => { const b = battery;
    const ring = (pct, label) => h("div", { style: { textAlign: "center" }, html: `<svg viewBox="0 0 40 40" width="54" height="54"><circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,.2)" stroke-width="4" fill="none"/><circle cx="20" cy="20" r="16" stroke="${pct < 20 ? "#ff453a" : "#30d158"}" stroke-width="4" fill="none" stroke-dasharray="${pct} 100" pathLength="100" transform="rotate(-90 20 20)" stroke-linecap="round"/><text x="20" y="24" text-anchor="middle" font-size="10" fill="#fff" font-family="system-ui">${label}</text></svg><div class="sm">${pct}%</div>` });
    return h("div.widget.w-batt", ring(Math.round(b.level * 100), b.charging ? "⚡" : "📱"), ring(74, "🎧")); } },
  music: { name: "Music", size: "small", render: () => { const m = media.state();
    return h("div.widget.w-music", { onclick: () => open("music") }, h("h4", m.playing ? "Now Playing" : "Recently Played"), h("div", { style: { fontSize: "17px", fontWeight: 700, marginTop: "40px" } }, m.title || "Synth Sessions"), h("div.sm", m.artist || "Glassline Studio")); } },
  clock: { name: "Clock", size: "small", render: () => h("div.widget.w-clock", { onclick: () => open("clock"), html: analogClock(130) }) },
  reminders: { name: "Reminders", size: "small", render: () => { const items = (appStore("reminders").get("items", []) || []).filter(i => !i.done).slice(0, 4);
    return h("div.widget.w-rem", { onclick: () => open("reminders") }, h("h4", "Reminders"), h("div", { style: { fontSize: "28px", fontWeight: 700 } }, items.length),
      ...items.map(i => h("div.sm", { style: { color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, "○ " + i.text))); } },
  photo: { name: "Photos", size: "small", render: () => { const ph = (appStore("photos").get("items", []) || [])[0];
    return h("div.widget.w-photo", { onclick: () => open("photos"), style: { backgroundImage: ph ? `url(${ph.src})` : WALLPAPERS[3].css } }, h("div.sm", "Featured Photo")); } },
  weatherWide: { name: "Weather (wide)", size: "wide", render: () => { const w = weatherNow();
    return h("div.widget.w-weather.w4", { onclick: () => open("weather") }, h("div", { style: { display: "flex", justifyContent: "space-between" } }, h("div", h("h4", w.city), h("div.big", w.temp + "°")), h("div.sm", { style: { textAlign: "right" } }, w.cond, h("br"), `H:${w.hi}° L:${w.lo}°`)),
      h("div", { style: { display: "flex", justifyContent: "space-between", marginTop: "14px" } }, ...w.hours.slice(0, 6).map(x => h("div.sm", { style: { textAlign: "center" } }, x.h, h("br"), x.i, h("br"), x.t + "°")))); } },
};
function analogClock(size) {
  const d = new Date(), hA = (d.getHours() % 12 + d.getMinutes() / 60) * 30, mA = d.getMinutes() * 6, sA = d.getSeconds() * 6;
  const ticks = Array.from({ length: 12 }, (_, i) => `<text x="${50 + 38 * Math.sin(i * Math.PI / 6)}" y="${54 + -38 * Math.cos(i * Math.PI / 6)}" font-size="10" text-anchor="middle" fill="#111" font-family="system-ui">${i || 12}</text>`).join("");
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}">${ticks}<line x1="50" y1="50" x2="50" y2="26" stroke="#111" stroke-width="3.5" stroke-linecap="round" transform="rotate(${hA} 50 50)"/><line x1="50" y1="50" x2="50" y2="14" stroke="#111" stroke-width="2.5" stroke-linecap="round" transform="rotate(${mA} 50 50)"/><line x1="50" y1="58" x2="50" y2="12" stroke="#ff9f0a" stroke-width="1" transform="rotate(${sA} 50 50)"/><circle cx="50" cy="50" r="2.5" fill="#ff9f0a"/></svg>`;
}

/* ---------- shared data the shell and apps both read ---------- */
let weatherCache = saved.weather || null;
function weatherNow() {
  if (weatherCache) return weatherCache;
  const hr = new Date().getHours();
  return { city: "Cupertino Valley", temp: 21, hi: 24, lo: 13, cond: "Mostly Sunny", code: 1,
    hours: Array.from({ length: 24 }, (_, i) => ({ h: i ? ((hr + i) % 24) + "h" : "Now", t: Math.round(21 + 3 * Math.sin((hr + i - 9) / 24 * 2 * Math.PI)), i: (hr + i) % 24 > 19 || (hr + i) % 24 < 6 ? "☾" : "☀" })),
    days: ["Today", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"].map((d, i) => ({ d, i: ["☀", "⛅", "☁", "🌧", "☀", "⛅", "☀", "🌧", "☁", "☀"][i], lo: 12 + (i % 3), hi: 22 + (i % 4) })) };
}
function setWeather(w) { weatherCache = w; saved.weather = w; persist(); emit("weather"); }
function nextEvent() {
  const evs = appStore("calendar").get("events", []) || [];
  const today = new Date().toISOString().slice(0, 10), now = new Date().toTimeString().slice(0, 5);
  return evs.filter(e => e.date === today && e.time >= now).sort((a, b) => a.time.localeCompare(b.time))[0];
}

/* ---------- media (Now Playing): the Music app registers a player; shell surfaces it ---------- */
const media = {
  player: null,
  state() { return this.player ? this.player.state() : { playing: false }; },
  toggle() { this.player ? this.player.toggle() : open("music"); },
  next() { this.player && this.player.next(); }, prev() { this.player && this.player.prev(); },
};

/* ---------- battery ---------- */
const battery = { level: .82, charging: false };
if (navigator.getBattery) navigator.getBattery().then(b => {
  const up = () => { battery.level = b.level; battery.charging = b.charging; renderStatus(); emit("battery"); };
  b.addEventListener("levelchange", up); b.addEventListener("chargingchange", () => { up(); if (b.charging) live.flash("charging"); }); up();
}).catch(() => {});

/* ---------- wallpapers: generated gradients, original ---------- */
const WALLPAPERS = [
  { name: "Dawn Glass", css: "radial-gradient(120% 80% at 20% 10%, #ffb38a 0%, transparent 55%), radial-gradient(90% 70% at 90% 30%, #c49bff 0%, transparent 60%), radial-gradient(120% 90% at 50% 100%, #3d6bff 0%, #1a2a6c 70%)" },
  { name: "Lagoon", css: "radial-gradient(100% 70% at 80% 0%, #6ff7e8 0%, transparent 55%), radial-gradient(120% 80% at 0% 60%, #1fa2ff 0%, transparent 60%), linear-gradient(180deg, #0b486b, #021b2e)" },
  { name: "Ember", css: "radial-gradient(110% 70% at 50% 0%, #ffd27a 0%, transparent 55%), radial-gradient(120% 90% at 10% 80%, #ff5f6d 0%, transparent 60%), linear-gradient(180deg, #8e2de2, #2b0a3d)" },
  { name: "Meadow", css: "radial-gradient(120% 70% at 30% 10%, #d4fc79 0%, transparent 55%), radial-gradient(120% 90% at 90% 80%, #30cfd0 0%, transparent 60%), linear-gradient(180deg, #1d976c, #0b3d2e)" },
  { name: "Graphite", css: "radial-gradient(100% 60% at 50% 0%, #5c6270 0%, transparent 60%), linear-gradient(180deg, #2a2d34, #0c0d10)" },
  { name: "Orchid", css: "conic-gradient(from 200deg at 50% 40%, #ff9ad5, #a18cd1, #6a85f1, #ff9ad5)" },
  { name: "Nightfall", css: "radial-gradient(80% 50% at 70% 20%, #4b6cb7 0%, transparent 60%), radial-gradient(80% 60% at 20% 70%, #6a3093 0%, transparent 60%), linear-gradient(180deg, #0f0c29, #000)" },
  { name: "Sandstone", css: "linear-gradient(160deg, #f6d365 0%, #fda085 45%, #c0587e 100%)" },
];
function wallpaperCSS() { const w = S.wallpaper; return typeof w === "string" ? `center/cover url("${w}")` : (WALLPAPERS[w] || WALLPAPERS[0]).css; }

/* ======================================================================== */
/*  Shell state                                                              */
/* ======================================================================== */
const state = { booted: false, locked: true, awake: true, mode: "boot", page: 0, jiggle: false, front: null, recents: [], windows: {}, ncOpen: false, ccOpen: false, spotlight: false, switcher: false };
let homeEl, pagesEl, dockEl, dotsEl, winsEl, coverEl, ccEl, islandEl;

function applySettings(k) {
  const dark = S.appearance === "dark" || (S.appearance === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  screen.classList.toggle("dark", dark);
  screen.style.setProperty("--glass", S.reduceTransparency ? 1 : S.glass / 100);
  screen.classList.toggle("reduce", S.reduceMotion);
  $("#dim").style.opacity = state.awake ? (1 - S.brightness) * .72 : 1;
  screen.style.filter = S.nightShift ? "sepia(.25) saturate(1.1) hue-rotate(-12deg)" : "";
  screen.style.fontWeight = S.boldText ? 600 : "";
  const wp = wallpaperCSS(); $("#wall").style.background = wp;
  if (coverEl) coverEl.querySelector(".bg").style.background = wp;
  $("#lockClock").className = "f" + (S.lockFont + 1);
  if (!k || ["wifi", "cellular", "airplane", "focus", "silent", "bluetooth", "lowPower"].includes(k)) renderStatus();
  if (k === "simulateMessages") scheduleIncoming();
  if (k === "focus" && ccEl && state.ccOpen) renderCC();
}

/* ---------- status bar ---------- */
function renderStatus() {
  const t = new Date(); $("#stTime").textContent = t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "");
  const r = $("#stRight"); const parts = [];
  if (S.focus) parts.push(sys("moon"));
  if (S.silent) parts.push(sys("bellOff"));
  if (S.airplane) parts.push(sys("plane"));
  else { if (S.cellular) parts.push(sys("cell")); if (S.wifi) parts.push(sys("wifi")); }
  const pct = Math.round(battery.level * 100);
  parts.push(`<span class="batt ${pct <= 20 ? "low" : ""} ${battery.charging ? "chg" : ""}" title="${pct}%"><i style="width:${pct}%;${S.lowPower ? "background:#ffd60a" : ""}"></i></span>`);
  r.innerHTML = parts.join("");
  $$("#stRight svg").forEach(s => { s.style.height = "13px"; s.style.width = "auto"; });
}
function statusInk() {
  const appInk = state.front && !state.switcher && !state.spotlight && !(coverEl && coverEl.classList.contains("on")) && !state.ccOpen;
  const dark = screen.classList.contains("dark");
  const a = state.front && apps[state.front];
  const ink = appInk && !dark && (a ? a.status !== "light" : true);
  $("#status").classList.toggle("ink", !!ink);
  $("#homeBarZone").classList.toggle("ink", !!ink);
}

/* ---------- home rendering ---------- */
function renderHome() {
  const L = layout();
  pagesEl.innerHTML = "";
  pagesEl.append(todayPage());
  L.pages.forEach((items, pi) => {
    const pg = h("div.page", { dataset: { page: pi } }, h("div.grid", items.map(it => itemEl(it, "page", pi))));
    pagesEl.append(pg);
  });
  pagesEl.append(libraryPage());
  dockEl.innerHTML = ""; L.dock.forEach(id => apps[id] && dockEl.append(cellEl(apps[id], "dock")));
  renderDots(); setPage(state.page, false);
  homeEl.classList.toggle("jiggle", state.jiggle);
}
function itemEl(it, where, pi) {
  if (it.startsWith("w:")) {
    const w = WIDGETS[it.slice(2)]; if (!w) return h("div");
    const el = w.render(); el.dataset.item = it; if (w.size === "wide") el.classList.add("w4");
    el.addEventListener("pointerdown", e => iconPress(e, el, it, where));
    el.append(h("button.del", { text: "−", onclick: ev => { ev.stopPropagation(); unplace(it); renderHome(); } }));
    return el;
  }
  const a = apps[it]; if (!a) return h("div");
  return cellEl(a, where);
}
function cellEl(a, where) {
  const ic = iconEl(a);
  const badge = badges[a.id]; if (badge) ic.parentNode;
  const cell = h("div.cell", { dataset: { item: a.id } }, ic, h("div.lbl", a.name));
  if (badge) cell.append(h("div.badge", badge > 99 ? "99+" : badge));
  if (installing[a.id] != null) { cell.classList.add("installing"); ic.append(h("div.progress-ring", { html: ring(installing[a.id]) })); cell.querySelector(".lbl").textContent = installing[a.id] < 1 ? "Loading…" : a.name; }
  cell.append(h("button.del", { text: "−", title: "Remove", onclick: ev => { ev.stopPropagation(); askRemove(a.id); } }));
  cell.addEventListener("pointerdown", e => iconPress(e, cell, a.id, where));
  return cell;
}
const ring = p => `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/><circle cx="18" cy="18" r="15" fill="none" stroke="#fff" stroke-width="3" pathLength="100" stroke-dasharray="${Math.round(p * 100)} 100" transform="rotate(-90 18 18)"/></svg>`;
const badges = {};
function setBadge(id, n) { badges[id] = n || 0; const c = $(`.cell[data-item="${id}"]`, homeEl); if (state.mode !== "boot") renderHome(); }

function todayPage() {
  const d = new Date();
  const L = saved.today || ["weatherWide", "reminders", "clock", "photo", "music"];
  return h("div.page.today", { dataset: { page: -1 } },
    h("div.today-search.glass", { onclick: () => openSpotlight() }, h("span", { html: sys("search") , style: { width: "18px" } }), "Search"),
    h("div.today-date", d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })),
    h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" } }, L.map(k => { const w = WIDGETS[k]; const el = w.render(); if (w.size === "wide") el.style.gridColumn = "span 2"; return el; })),
    h("button.glass", { style: { alignSelf: "center", padding: "6px 16px", borderRadius: "16px", fontSize: "14px", color: "var(--tint-ink)" }, onclick: () => widgetGallery(true) }, "Edit"));
}
const LIB_CATS = [["Suggestions", null], ["Recently Added", null], ["Social", "Social"], ["Utilities", "Utilities"], ["Productivity & Finance", "Productivity"], ["Creativity", "Creativity"], ["Entertainment", "Entertainment"], ["Information & Reading", "Information"], ["Health & Fitness", "Health"], ["Games", "Games"]];
function libraryPage() {
  const all = Object.values(apps).filter(a => isInstalled(a.id) && !a.hidden);
  const folders = LIB_CATS.map(([name, cat]) => {
    let list = cat ? all.filter(a => a.category === cat) : name === "Suggestions" ? state.recents.map(id => apps[id]).filter(Boolean) : (saved.installed || []).slice().reverse().map(id => apps[id]).filter(Boolean);
    if (name === "Suggestions" && list.length < 4) list = list.concat(all.filter(a => !list.includes(a))).slice(0, 4);
    return { name, list };
  }).filter(f => f.list.length);
  const listView = h("div.lib-list", { style: { display: "none" } });
  const search = h("input", { placeholder: "App Library", style: { border: 0, outline: 0, background: "none", flex: 1, color: "#fff", fontSize: "16px" },
    oninput: () => { const q = search.value.toLowerCase(); listView.style.display = "flex"; grid.style.display = "none"; listView.innerHTML = "";
      all.filter(a => a.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name)).forEach(a => listView.append(h("div.lib-row", { onclick: ev => open(a.id, ev.currentTarget.querySelector(".icon")) }, iconEl(a), a.name))); },
    onfocus: () => search.oninput(), onblur: () => setTimeout(() => { if (!search.value) { listView.style.display = "none"; grid.style.display = "grid"; } }, 200) });
  const grid = h("div.lib-grid", folders.map(f => {
    const big = f.list.slice(0, 3), rest = f.list.slice(3);
    const fold = h("div.lib-folder", big.map(a => { const ic = iconEl(a); ic.onclick = () => open(a.id, ic); return ic; }),
      rest.length ? (rest.length === 1 ? (() => { const ic = iconEl(rest[0]); ic.onclick = () => open(rest[0].id, ic); return ic; })() : h("div.mini", { onclick: () => folderOpen(f) }, rest.slice(0, 4).map(a => iconEl(a)))) : null);
    return h("div", fold, h("div.lib-name", f.name));
  }));
  return h("div.page.library", { dataset: { page: "lib" } }, h("div.lib-search.glass", h("span", { html: sys("search"), style: { width: "18px" } }), search), grid, listView);
}
function folderOpen(f) {
  const box = h("div.glass", { style: { position: "absolute", left: "30px", right: "30px", top: "160px", borderRadius: "36px", padding: "20px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "18px", maxHeight: "520px", overflowY: "auto" } },
    f.list.map(a => h("div.cell", { onclick: () => { close(); open(a.id); } }, iconEl(a), h("div.lbl", { style: { color: "var(--tint-ink)", textShadow: "none" } }, a.name))));
  const { close } = overlay(box, { title: f.name });
}
function overlay(content, { title } = {}) {
  const layer = $("#sheetLayer");
  const scrim = h("div.scrim", { style: { backdropFilter: "blur(14px)" } });
  const t = title ? h("div", { style: { position: "absolute", top: "110px", width: "100%", textAlign: "center", color: "#fff", fontSize: "28px", fontWeight: 700 } }, title) : null;
  const wrap = h("div", { style: { position: "absolute", inset: 0, pointerEvents: "auto", transform: "scale(.85)", opacity: 0, transition: "transform .35s cubic-bezier(.3,1.3,.5,1), opacity .25s" } }, t, content);
  const close = () => { scrim.classList.remove("in"); wrap.style.opacity = 0; wrap.style.transform = "scale(.85)"; setTimeout(() => { scrim.remove(); wrap.remove(); }, 300); };
  wrap.addEventListener("click", e => { if (e.target === wrap) close(); });
  layer.append(scrim, wrap); requestAnimationFrame(() => { scrim.classList.add("in"); wrap.style.opacity = 1; wrap.style.transform = "none"; });
  return { close };
}
function pageCount() { return layout().pages.length + 2; } // today + pages + library
function renderDots() {
  dotsEl.innerHTML = "";
  for (let i = -1; i <= layout().pages.length; i++) dotsEl.append(h("i", { class: (i === state.page ? "on " : "") + (i === layout().pages.length ? "lib" : "") }));
}
function setPage(p, animate = true, velocity = 0) {
  const n = layout().pages.length; p = clamp(p, -1, n); state.page = p;
  const target = -(p + 1) * W;
  renderDots();
  $("#dots").style.opacity = p === -1 || p === n ? .0 : 1;
  $("#dock").style.transform = p === -1 || p === n ? "translateY(140px)" : "none";
  $("#dock").style.transition = "transform .35s";
  if (!animate) { pagesEl.style.transform = `translateX(${target}px)`; pageX = target; return; }
  spring("pages", pageX, target, { response: .42, damping: 1, velocity }, x => { pageX = x; pagesEl.style.transform = `translateX(${x}px)`; });
}
let pageX = -W;

/* ---------- home gestures: page swipe, spotlight pull, icon press, edit mode ---------- */
function homePointer(e) {
  if (state.mode !== "home" || e.button > 0) return;
  if (e.target.closest(".cell, .widget, input, button, .lib-folder, .lib-row, .today-search")) return;
  if (state.jiggle && !e.target.closest(".cell")) { /* tapping empty space ends edit mode */ }
  const startX = pageX, n = layout().pages.length;
  let mode = null;
  const p0 = local(e);
  track(e, { axis: true,
    move(dx, dy, p, dir) {
      mode = mode || dir;
      if (mode === "x") {
        let x = startX + dx; const min = -(n + 1) * W, max = 0;
        if (x > max) x = max + rubber(x - max, W); if (x < min) x = min - rubber(min - x, W);
        pageX = x; pagesEl.style.transform = `translateX(${x}px)`;
      } else if (mode === "y" && dy > 0 && state.page >= 0 && state.page < n && p0.y > 60 && !state.jiggle) {
        spotlightPull(Math.min(1, dy / 160));
      }
    },
    end(dx, dy, vx, vy, info) {
      if (!info.moved) { if (state.jiggle) exitJiggle(); return; }
      if (mode === "x") {
        const proj = pageX + project(vx, .99);
        const target = clamp(Math.round(-proj / W) - 1, state.page - 1, state.page + 1);
        setPage(target, true, vx);
      } else if (mode === "y" && dy > 0 && state.page >= 0 && state.page < n && !state.jiggle) {
        if (dy + project(vy) > 90) openSpotlight(); else spotlightPull(0, true);
      }
    } });
}
let pressTimer = 0;
function iconPress(e, cell, id, where) {
  if (state.mode !== "home" || e.button > 0) return;
  if (e.target.closest(".del")) return;
  e.stopPropagation();
  const ic = cell.querySelector(".icon") || cell;
  ic.classList.add("pressed");
  let longFired = false, dragging = false, ghost = null, edgeTimer = 0;
  pressTimer = setTimeout(() => {
    longFired = true; ic.classList.remove("pressed"); haptic(12);
    if (!state.jiggle) iconMenu(cell, id);
  }, 480);
  const startPage = state.page, startX = pageX;
  let pageDrag = false;
  track(e, {
    move(dx, dy, p) {
      if (Math.hypot(dx, dy) > 8 && !longFired && !state.jiggle) {
        clearTimeout(pressTimer); ic.classList.remove("pressed");
        // treat as a page swipe started on an icon
        if (Math.abs(dx) > Math.abs(dy) || pageDrag) { pageDrag = true; const n = layout().pages.length; let x = startX + dx; const min = -(n + 1) * W; if (x > 0) x = rubber(x, W); if (x < min) x = min - rubber(min - x, W); pageX = x; pagesEl.style.transform = `translateX(${x}px)`; }
        else if (dy > 0 && where === "page") spotlightPull(Math.min(1, dy / 160));
        return;
      }
      if ((state.jiggle || longFired) && Math.hypot(dx, dy) > 6) {
        if (!state.jiggle) { closeCtx(); enterJiggle(); }
        if (!dragging) { dragging = true; ghost = cell.cloneNode(true); ghost.id = "dragGhost"; ghost.classList.remove("dragging"); screen.append(ghost); cell.classList.add("dragging"); }
        const r = cell.getBoundingClientRect(); // eslint-disable-line no-unused-vars
        ghost.style.left = (p.x - 40) + "px"; ghost.style.top = (p.y - 40) + "px"; ghost.style.width = "80px";
        reorderAt(p, id);
        clearTimeout(edgeTimer);
        if (p.x < 18 || p.x > W - 18) edgeTimer = setTimeout(() => { setPage(state.page + (p.x < 18 ? -1 : 1)); }, 550);
      }
    },
    end(dx, dy, vx, vy, info) {
      clearTimeout(pressTimer); clearTimeout(edgeTimer); ic.classList.remove("pressed");
      if (pageDrag) { const proj = pageX + project(vx, .99); setPage(clamp(Math.round(-proj / W) - 1, startPage - 1, startPage + 1), true, vx); return; }
      if (!longFired && !state.jiggle && dy > 30 && where === "page") { if (dy + project(vy) > 90) openSpotlight(); else spotlightPull(0, true); return; }
      if (dragging) { ghost.remove(); renderHome(); persist(); return; }
      if (!info.moved && !longFired && !state.jiggle) {
        if (id.startsWith("w:")) return;
        if (installing[id] != null) return toast("Downloading…");
        open(id, ic);
      }
    },
  });
}
function reorderAt(p, id) {
  const L = layout();
  const ghost = $("#dragGhost"); if (ghost) ghost.style.display = "none";
  const sr = screen.getBoundingClientRect();
  const under = document.elementFromPoint(sr.left + p.x * scale, sr.top + p.y * scale);
  if (ghost) ghost.style.display = "";
  const tgt = under && under.closest("[data-item]");
  const inDock = under && under.closest("#dock");
  const from = L.dock.includes(id) ? L.dock : L.pages.find(pg => pg.includes(id));
  if (inDock && !L.dock.includes(id)) {
    if (L.dock.length >= 4 && !tgt) return;
    from.splice(from.indexOf(id), 1);
    if (L.dock.length >= 4) { const swap = tgt.dataset.item; const i = L.dock.indexOf(swap); L.dock[i] = id; from.push(swap); } else L.dock.push(id);
    renderHome(); return;
  }
  const pageArr = L.pages[state.page];
  if (!inDock && L.dock.includes(id) && pageArr && under && under.closest(".page")) {
    L.dock.splice(L.dock.indexOf(id), 1); pageArr.push(id); renderHome(); return;
  }
  if (!tgt || tgt.dataset.item === id) {
    if (!inDock && pageArr && from !== pageArr && under && under.closest(".page")) { from.splice(from.indexOf(id), 1); pageArr.push(id); renderHome(); }
    return;
  }
  const to = L.dock.includes(tgt.dataset.item) ? L.dock : L.pages.find(pg => pg.includes(tgt.dataset.item));
  if (!to) return;
  from.splice(from.indexOf(id), 1);
  to.splice(to.indexOf(tgt.dataset.item), 0, id);
  renderHome();
}
function enterJiggle() { state.jiggle = true; homeEl.classList.add("jiggle"); addPlus(); haptic(); }
function exitJiggle() { state.jiggle = false; homeEl.classList.remove("jiggle"); renderHome(); $("#addWidget")?.remove(); }
function addPlus() {
  if ($("#addWidget")) return;
  homeEl.append(h("button#addWidget.glass", { style: { position: "absolute", top: "56px", left: "20px", padding: "6px 14px", borderRadius: "16px", fontWeight: 600, fontSize: "15px", zIndex: 5, color: "var(--tint-ink)" }, onclick: () => widgetGallery(false) }, "+ Add Widget"));
}
function widgetGallery(today) {
  const items = Object.entries(WIDGETS).map(([k, w]) => ({ label: w.name + (w.size === "wide" ? "" : ""), run: () => {
    if (today) { saved.today = saved.today || ["weatherWide", "reminders", "clock", "photo", "music"]; saved.today.unshift(k); }
    else { const L = layout(); const pg = L.pages[Math.max(0, Math.min(state.page, L.pages.length - 1))]; pg.unshift("w:" + k); }
    persist(); renderHome(); } }));
  if (today) items.push({ label: "Reset Today View", red: true, run: () => { delete saved.today; persist(); renderHome(); } });
  sheet({ title: "Add a widget", actions: items });
}
function iconMenu(cell, id) {
  const a = apps[id];
  const acts = [];
  if (a && a.quick) a.quick.forEach(q => acts.push({ label: q.label, run: () => { open(id); setTimeout(() => q.run(), 450); } }));
  acts.push({ label: "Edit Home Screen", run: enterJiggle });
  if (a) acts.push({ label: "Share App", run: () => share({ title: a.name, text: `${a.name} on Glassline OS` }) });
  if (id.startsWith("w:")) acts.push({ label: "Remove Widget", red: true, run: () => { unplace(id); renderHome(); } });
  else if (a && a.removable) acts.push({ label: "Remove App", red: true, run: () => askRemove(id) });
  ctxMenu(cell, acts);
}
function askRemove(id) {
  const a = apps[id];
  const acts = [];
  if (!a.builtin || a.removable) acts.push({ label: a.builtin ? "Delete App" : "Delete App", red: true, run: () => confirmDelete(id) });
  acts.push({ label: "Remove from Home Screen", run: () => { unplace(id); renderHome(); toast("Moved to App Library"); } });
  sheet({ title: `Remove “${a.name}”?`, message: "Removing from Home Screen keeps the app in App Library.", actions: acts });
}
function confirmDelete(id) {
  const a = apps[id];
  alertBox({ title: `Delete “${a.name}”?`, message: "Deleting this app will also delete its data.", buttons: [{ label: "Cancel" }, { label: "Delete", red: true, run: () => uninstall(id) }] });
}

/* ---------- install / uninstall (store apps) ---------- */
const installing = {};
function install(id) {
  const a = apps[id]; if (!a || isInstalled(id) && !installing[id]) return Promise.resolve();
  saved.installed = saved.installed || [];
  installing[id] = 0; placeApp(id); renderHome();
  return new Promise(res => {
    const t0 = performance.now(), dur = 1400 + Math.random() * 1400;
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / dur);
      installing[id] = p; const ic = $(`.cell[data-item="${id}"] .progress-ring`, homeEl);
      if (ic) ic.innerHTML = ring(p);
      emit("install-progress", id, p);
      if (p < 1) return requestAnimationFrame(step);
      delete installing[id];
      if (!saved.installed.includes(id)) saved.installed.push(id);
      persist(); renderHome(); index.dirty = true; emit("installed", id); res();
    };
    step();
  });
}
function uninstall(id) {
  const a = apps[id];
  closeApp(id);
  unplace(id);
  if (!a.builtin) { saved.installed = (saved.installed || []).filter(x => x !== id); if (saved.data) delete saved.data[id]; }
  else { saved.removed = [...new Set([...(saved.removed || []), id])]; }
  persist(); renderHome(); index.dirty = true; emit("uninstalled", id); toast(`${a.name} deleted`);
}

/* ======================================================================== */
/*  Windows: launch, home gesture, switcher                                 */
/* ======================================================================== */
function rectOf(el) {
  const r = el.getBoundingClientRect(), s = screen.getBoundingClientRect();
  return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, w: r.width / scale, h: r.height / scale, r: 15 };
}
const FULL = { x: 0, y: 0, w: W, h: H, r: 56 };
const lerpRect = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t), r: lerp(a.r, b.r, t) });
function applyRect(win, r) {
  const sx = r.w / W, sy = r.h / H;
  win.style.transform = `translate(${r.x}px, ${r.y}px) scale(${sx}, ${sy})`;
  win.style.borderRadius = `${r.r / sx}px / ${r.r / sy}px`;
}
function iconRect(id) {
  const ic = $(`#dock [data-app="${id}"], .page[data-page="${state.page}"] [data-app="${id}"]`, homeEl);
  if (ic && state.page >= 0) return { ...rectOf(ic), r: 15 };
  return { x: W / 2 - 32, y: H / 2 - 32, w: 64, h: 64, r: 15 };
}
function ensureWindow(id) {
  if (state.windows[id]) return state.windows[id];
  const a = apps[id];
  const win = h("div.win", { dataset: { app: id } });
  const appEl = h("div.app");
  const splash = h("div.splash", { style: { background: "var(--bg)" } }, iconEl(a));
  win.append(appEl, splash);
  winsEl.append(win);
  const ctx = makeCtx(a, appEl, win);
  state.windows[id] = { win, appEl, ctx, a };
  try { a.render(ctx); } catch (err) { console.error(err); appEl.append(h("div.empty", `This app hit an error: ${err.message}`)); }
  return state.windows[id];
}
function makeCtx(a, appEl, win) {
  const hooks = {};
  return {
    app: a, el: appEl, win, os: GOS, store: appStore(a.id), h, sys, svg, G, esc,
    onShow(fn) { hooks.show = fn; }, onHide(fn) { hooks.hide = fn; }, onClose(fn) { hooks.close = fn; }, onIntent(fn) { hooks.intent = fn; },
    hooks, close: () => goHome(), stack: (root) => makeStack(appEl, root), open,
  };
}
async function open(id, fromEl, opts = {}) {
  const a = apps[id]; if (!a) return toast("App not found");
  if (!isInstalled(id)) { open("store"); setTimeout(() => emit("store-show", id), 500); return; }
  if (state.locked) { pendingOpen = id; return unlockFlow(); }
  closeOverlays();
  if (state.jiggle) exitJiggle();
  const prev = state.front;
  if (prev === id && state.mode === "app") return;
  const w = ensureWindow(id);
  if (prev && prev !== id) hideWindow(prev);
  state.front = id; state.mode = "app"; screen.classList.add("in-app");
  state.recents = [id, ...state.recents.filter(x => x !== id)];
  w.win.style.display = "block"; w.win.style.zIndex = 2; w.win.classList.remove("ready");
  statusInk();
  const from = opts.fromRect || (fromEl ? { ...rectOf(fromEl), r: 15 } : iconRect(id));
  const fresh = !w.shown; w.shown = true;
  if (!fresh) w.win.classList.add("ready");
  const homeScale = p => { homeEl.style.transform = `scale(${1 - .08 * p})`; homeEl.style.opacity = 1 - .5 * p; $("#wall").style.transform = `scale(${1 + .05 * p})`; };
  if (opts.instant || S.reduceMotion) { applyRect(w.win, FULL); homeScale(1); w.win.style.opacity = 1; }
  else {
    w.win.style.opacity = 1;
    await spring("win", 0, 1, { response: .48, damping: .84 }, (t) => {
      applyRect(w.win, lerpRect(from, FULL, t)); homeScale(clamp(t, 0, 1));
      if (t > .55) w.win.classList.add("ready");
    });
  }
  w.win.classList.add("ready");
  w.win.style.borderRadius = "0";
  w.win.style.transform = "none";
  homeEl.style.visibility = "hidden";
  if (w.ctx.hooks.show) w.ctx.hooks.show();
  emit("app-open", id);
  if (opts.intent && w.ctx.hooks.intent) w.ctx.hooks.intent(opts.intent);
}
function hideWindow(id) {
  const w = state.windows[id]; if (!w) return;
  w.win.style.display = "none"; w.win.style.zIndex = 1;
  if (w.ctx.hooks.hide) w.ctx.hooks.hide();
}
async function goHome(velocity = 0, fromRect = null) {
  closeOverlays();
  if (state.mode === "switcher") { hideSwitcher(); }
  const id = state.front;
  homeEl.style.visibility = "visible";
  if (!id) { if (state.mode === "home" && !state.jiggle) setPage(0); if (state.jiggle) exitJiggle(); state.mode = "home"; statusInk(); return; }
  const w = state.windows[id];
  state.front = null; state.mode = "home"; screen.classList.remove("in-app"); statusInk();
  if (state.page < 0 || state.page >= layout().pages.length) setPage(Math.min(0, state.page), false);
  if (w.ctx.hooks.hide) w.ctx.hooks.hide();
  const start = fromRect || FULL, to = iconRect(id);
  const homeScale = p => { homeEl.style.transform = `scale(${1 - .08 * p})`; homeEl.style.opacity = 1 - .5 * p; $("#wall").style.transform = `scale(${1 + .05 * p})`; };
  const startHome = fromRect ? clamp(fromRect.w / W, 0, 1) : 1;
  w.win.classList.remove("ready");
  await spring("win", 0, 1, { response: .42, damping: .9, velocity: velocity / 600 }, t => {
    applyRect(w.win, lerpRect(start, to, t)); homeScale(lerp(startHome, 0, clamp(t, 0, 1)));
    w.win.style.opacity = t > .85 ? 1 - (t - .85) / .15 : 1;
  });
  if (state.front !== id) { w.win.style.display = "none"; }
  homeScale(0); homeEl.style.transform = ""; homeEl.style.opacity = "";
}
function closeApp(id) {
  const w = state.windows[id]; if (!w) return;
  if (w.ctx.hooks.close) try { w.ctx.hooks.close(); } catch {}
  w.win.remove(); delete state.windows[id];
  state.recents = state.recents.filter(x => x !== id);
  if (state.front === id) { state.front = null; state.mode = "home"; homeEl.style.visibility = "visible"; homeEl.style.transform = ""; homeEl.style.opacity = ""; screen.classList.remove("in-app"); }
  if (id === "music" && media.player) { media.player.stop && media.player.stop(); }
}

/* home bar gesture (and the bottom edge in general) */
function homeBarPointer(e) {
  if (e.button > 0) return;
  if (coverEl.classList.contains("on") && !state.locked) return coverPointer(e);
  if (state.locked) return;
  if (state.ccOpen) return ccClose();
  if (state.spotlight) return closeSpotlight();
  if (state.mode === "switcher") return goHome();
  if (state.mode === "home") {
    // swipe up and hold on home: app switcher
    track(e, { end(dx, dy, vx, vy, info) { if (dy < -40) { if (info.held > 120 || dy > -200) showSwitcher(); else goHome(); } } });
    return;
  }
  const id = state.front; const w = state.windows[id]; if (!w) return;
  let decided = null, quick = null;
  homeEl.style.visibility = "visible";
  track(e, { axis: true,
    move(dx, dy, p, dir) {
      if (dir === "x" && Math.abs(dy) < 30 && !decided) { quick = dx; w.win.style.transform = `translateX(${dx}px)`; return; }
      decided = "y";
      const up = Math.max(0, -dy);
      const s = 1 - Math.min(.55, up / H * 1.1);
      const r = { w: W * s, h: H * s, x: (W - W * s) / 2 + dx * .6, y: (H - H * s) * .45 + Math.min(0, dy) * .55 + Math.max(0, dy) * .2, r: 56 };
      applyRect(w.win, r); w.lastRect = r;
      const p2 = clamp(1 - up / (H * .5), 0, 1);
      homeEl.style.transform = `scale(${1 - .08 * p2})`; homeEl.style.opacity = 1 - .5 * p2;
    },
    end(dx, dy, vx, vy, info) {
      if (quick != null && decided !== "y") { // quick switch to the previous app
        const other = state.recents[1];
        if (Math.abs(dx + project(vx)) > 90 && other) { w.win.style.transform = ""; quickSwitch(other, dx > 0 ? 1 : -1); }
        else { spring("quick", dx, 0, { response: .35, damping: 1 }, x => w.win.style.transform = `translateX(${x}px)`).then(() => { w.win.style.transform = "none"; homeEl.style.visibility = "hidden"; }); }
        return;
      }
      const proj = -dy - project(vy);
      if (info.held > 140 && -dy > 90) return showSwitcher(w.lastRect);
      if (proj > H * .22) return goHome(-vy, w.lastRect);
      if (-dy < 12 && !info.moved) { homeEl.style.visibility = "hidden"; return; }
      const from = w.lastRect || FULL;
      spring("win", 0, 1, { response: .38, damping: .86 }, t => applyRect(w.win, lerpRect(from, FULL, t))).then(() => { w.win.style.transform = "none"; w.win.style.borderRadius = 0; homeEl.style.visibility = "hidden"; });
    } });
}
async function quickSwitch(id, dir) {
  const cur = state.front; const cw = state.windows[cur];
  const nw = ensureWindow(id);
  nw.win.style.display = "block"; nw.win.classList.add("ready"); nw.win.style.transform = `translateX(${-dir * W}px)`;
  await spring("quick", 0, 1, { response: .4, damping: 1 }, t => { cw.win.style.transform = `translateX(${dir * W * t}px)`; nw.win.style.transform = `translateX(${-dir * W * (1 - t)}px)`; });
  cw.win.style.transform = "none"; hideWindow(cur);
  nw.win.style.transform = "none"; state.front = id; state.recents = [id, ...state.recents.filter(x => x !== id)];
  homeEl.style.visibility = "hidden"; statusInk(); if (nw.ctx.hooks.show) nw.ctx.hooks.show();
}

function showSwitcher(fromRect) {
  closeOverlays();
  const sw = $("#switcher"), cards = $("#cards");
  cards.innerHTML = "";
  const ids = state.recents.filter(id => state.windows[id]);
  sw.classList.toggle("empty", !ids.length);
  homeEl.style.visibility = "visible"; homeEl.style.transform = "scale(.92)"; homeEl.style.opacity = .5;
  Object.values(state.windows).forEach(w => { w.win.style.display = "none"; });
  ids.slice().reverse().forEach(id => {
    const w = state.windows[id];
    const snap = w.appEl.cloneNode(true); snap.className = "app app-snap";
    $$("video", snap).forEach(v => v.remove());
    $$("canvas", w.appEl).forEach((c, i) => { try { const img = h("img", { src: c.toDataURL(), style: c.style.cssText }); $$("canvas", snap)[i].replaceWith(img); } catch {} });
    const card = h("div.card", { dataset: { app: id } }, h("div.cap", iconEl(w.a), w.a.name), h("div.shot", snap));
    card.addEventListener("pointerdown", e => cardPointer(e, card, id));
    cards.append(card);
  });
  sw.classList.add("on"); state.mode = "switcher"; state.switcher = true;
  if (state.front) { const w = state.windows[state.front]; if (w.ctx.hooks.hide) w.ctx.hooks.hide(); }
  state.front = null; screen.classList.remove("in-app"); statusInk();
  requestAnimationFrame(() => { sw.scrollLeft = sw.scrollWidth; });
  cards.style.transform = "scale(1.12)"; cards.style.opacity = .4;
  spring("sw", 0, 1, { response: .4, damping: .85 }, t => { cards.style.transform = `scale(${lerp(1.12, 1, t)})`; cards.style.opacity = lerp(.4, 1, clamp(t, 0, 1)); });
}
function hideSwitcher() { $("#switcher").classList.remove("on"); state.switcher = false; if (state.mode === "switcher") state.mode = "home"; homeEl.style.transform = ""; homeEl.style.opacity = ""; }
function cardPointer(e, card, id) {
  const sw = $("#switcher");
  track(e, { axis: true,
    move(dx, dy, p, dir) { if (dir === "y" && dy < 0) { card.style.transform = `translateY(${dy}px)`; card.style.opacity = 1 + dy / 600; } },
    end(dx, dy, vx, vy, info) {
      if (info.dir === "y" && dy + project(vy) < -220) {
        spring("card" + id, dy, -900, { response: .3, damping: 1, velocity: vy }, y => card.style.transform = `translateY(${y}px)`).then(() => {
          card.remove(); closeApp(id); if (!$$(".card").length) { sw.classList.add("empty"); setTimeout(() => state.mode === "switcher" && goHome(), 350); }
        });
        haptic();
      } else if (!info.moved) {
        hideSwitcher();
        open(id, null, { fromRect: { ...rectOf(card.querySelector(".shot")), r: 34 } });
      } else { card.style.transform = ""; card.style.opacity = ""; }
    } });
}

/* ======================================================================== */
/*  Navigation stack for apps: push/pop with interactive edge swipe          */
/* ======================================================================== */
function makeStack(host, rootFn) {
  const wrap = h("div.stack"); host.append(wrap);
  const screens = [];
  function build(fn, backTitle) {
    const spec = fn(api) || {};
    const nav = h("div.nav" + (spec.large === false ? ".inline" : ""));
    const left = h("div.grp");
    if (backTitle != null) left.append(h("button.btn", { onclick: () => api.pop(), html: `${sys("back", "chev")}<span>${esc(backTitle).slice(0, 14)}</span>` }));
    if (spec.left) left.append(spec.left);
    nav.append(h("div.bar", left, h("div.ttl", spec.title || ""), h("div.grp", spec.right || "")));
    if (spec.title && spec.large !== false) nav.append(h("h1", spec.title));
    if (spec.under) nav.append(spec.under);
    const body = spec.body || h("div");
    if (!body.classList.contains("scroll")) body.classList.add("scroll");
    body.addEventListener("scroll", () => { nav.classList.toggle("scrolled", body.scrollTop > 30); });
    const scr = h("div.scr", nav, body, spec.after || null);
    scr.spec = spec; scr.title = spec.title || ""; return scr;
  }
  const api = {
    push(fn) {
      const prev = screens[screens.length - 1];
      const scr = build(fn, prev ? (prev.spec.back || prev.title || "Back") : null);
      wrap.append(scr); screens.push(scr);
      if (!prev) return scr;
      const shade = h("div.edge-shade"); prev.append(shade); prev.classList.add("under");
      spring("push" + wrap.id, 0, 1, { response: .42, damping: 1 }, t => { scr.style.transform = `translateX(${(1 - t) * W}px)`; prev.style.transform = `translateX(${-t * W * .3}px)`; shade.style.opacity = t * .12; });
      edge(scr);
      return scr;
    },
    pop(velocity = 0, from = 0) {
      if (screens.length < 2) return;
      const scr = screens.pop(), prev = screens[screens.length - 1];
      const shade = prev.querySelector(".edge-shade");
      prev.classList.remove("under");
      spring("push" + wrap.id, from, 1, { response: .38, damping: 1, velocity: velocity / W }, t => { scr.style.transform = `translateX(${t * W}px)`; prev.style.transform = `translateX(${-(1 - t) * W * .3}px)`; if (shade) shade.style.opacity = (1 - t) * .12; })
        .then(() => { scr.remove(); shade && shade.remove(); prev.style.transform = ""; if (prev.spec.onReturn) prev.spec.onReturn(); });
    },
    popToRoot() { while (screens.length > 1) { const s = screens.pop(); s.remove(); } const r = screens[0]; r.style.transform = ""; r.classList.remove("under"); r.querySelector(".edge-shade")?.remove(); },
    get depth() { return screens.length; }, get top() { return screens[screens.length - 1]; },
    replaceRoot(fn) { screens.forEach(s => s.remove()); screens.length = 0; api.push(fn); },
  };
  function edge(scr) {
    const z = h("div", { style: { position: "absolute", left: 0, top: "100px", bottom: "40px", width: "22px", zIndex: 6, touchAction: "none" } });
    scr.append(z);
    z.addEventListener("pointerdown", e => {
      const prev = screens[screens.length - 2]; if (!prev || screens[screens.length - 1] !== scr) return;
      const shade = prev.querySelector(".edge-shade");
      track(e, { move(dx) { const x = Math.max(0, dx); scr.style.transform = `translateX(${x}px)`; prev.style.transform = `translateX(${-(1 - x / W) * W * .3}px)`; if (shade) shade.style.opacity = (1 - x / W) * .12; },
        end(dx, dy, vx) {
          const proj = dx + project(vx, .99);
          if (proj > W / 2) api.pop(vx, Math.max(0, dx) / W);
          else spring("push" + wrap.id, Math.max(0, dx) / W, 0, { response: .35, damping: 1 }, t => { scr.style.transform = `translateX(${t * W}px)`; prev.style.transform = `translateX(${-(1 - t) * W * .3}px)`; if (shade) shade.style.opacity = (1 - t) * .12; });
        } });
    });
  }
  wrap.id = "stk" + Math.random().toString(36).slice(2, 7);
  if (rootFn) api.push(rootFn);
  return api;
}

/* ======================================================================== */
/*  Cover sheet: lock screen and Notification Centre                         */
/* ======================================================================== */
let pendingOpen = null, pendingIntent = null;
function renderLock() {
  const d = new Date();
  $("#lockClock").textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "");
  $("#lockDate").textContent = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const w = weatherNow(), ev = nextEvent(), m = media.state();
  const lw = $("#lockWidgets"); lw.innerHTML = "";
  lw.append(h("div.lw", h("div", h("b", w.temp + "°"), w.cond.split(" ").pop())),
    h("div.lw", h("div", h("b", Math.round(battery.level * 100)), battery.charging ? "⚡ charging" : "battery")),
    timerState.end ? h("div.lw", h("div", h("b", fmtDur(Math.max(0, timerState.end - Date.now()))), "timer")) :
      h("div.lw.rect", h("div", { style: { fontSize: "12px" } }, ev ? "NEXT" : "TODAY", h("br"), h("b", { style: { fontSize: "14px" } }, ev ? `${ev.title}` : "No events"), h("br"), ev ? ev.time : "Enjoy your day")));
  if (m.playing) lw.replaceChildren(h("div.lw.rect", { style: { width: "320px" } }, h("div", h("b", { style: { fontSize: "15px" } }, m.title), h("br"), m.artist, " · ", h("button", { style: { color: "#fff", fontSize: "18px" }, onclick: e => { e.stopPropagation(); media.toggle(); renderLock(); }, html: m.playing ? "❚❚" : "▶" }))));
}
function coverShow(mode) {
  coverEl.classList.add("on"); coverEl.classList.toggle("nc", mode === "nc");
  coverEl.style.transform = "none"; renderLock(); renderNC(); statusInk();
}
function coverHide() { coverEl.classList.remove("on", "nc"); coverEl.style.transform = ""; state.ncOpen = false; $("#passcode").classList.remove("on"); statusInk(); }
function lock() {
  if (state.locked && !state.awake) return wake();
  closeOverlays(); SOUND.lock(); haptic();
  state.locked = true; screen.classList.add("locked");
  coverShow("lock"); $("#lockIcon").classList.remove("open");
  if (state.front) { const w = state.windows[state.front]; if (w.ctx.hooks.hide) w.ctx.hooks.hide(); }
  sleepScreen();
  emit("lock");
}
function sleepScreen() { state.awake = false; $("#dim").style.opacity = 1; screen.classList.add("screen-off"); }
function wake() {
  state.awake = true; screen.classList.remove("screen-off"); applySettings();
  if (state.locked) { renderLock(); faceScan(); }
  resetAutoLock();
}
function faceScan() {
  const li = $("#lockIcon"); li.classList.remove("open");
  if (!S.faceUnlock) return;
  li.classList.add("scan");
  setTimeout(() => { li.classList.remove("scan"); if (state.locked && state.awake) { li.classList.add("open"); $("#lockHint").classList.add("show"); } }, 700);
}
function unlockFlow() {
  if (!state.awake) { wake(); return; }
  const faceOK = S.faceUnlock && $("#lockIcon").classList.contains("open");
  if (S.passcode && !faceOK) { showPasscode(); return; }
  finishUnlock();
}
async function finishUnlock() {
  SOUND.unlock();
  const from = parseFloat((coverEl.style.transform.match(/-?[\d.]+/) || [0])[0]) || 0;
  await spring("cover", from, -H, { response: .38, damping: 1 }, y => coverEl.style.transform = `translateY(${y}px)`);
  coverHide(); state.locked = false; screen.classList.remove("locked"); state.mode = state.front ? "app" : "home"; $("#passcode").classList.remove("on");
  $("#lockHint").classList.remove("show");
  homeEl.style.transform = "scale(1.1)"; homeEl.style.opacity = 0;
  if (!state.front) spring("unlockHome", 0, 1, { response: .45, damping: .9 }, t => { homeEl.style.transform = `scale(${lerp(1.1, 1, t)})`; homeEl.style.opacity = clamp(t, 0, 1); }).then(() => { homeEl.style.transform = ""; homeEl.style.opacity = ""; });
  else { homeEl.style.transform = ""; homeEl.style.opacity = ""; const w = state.windows[state.front]; if (w && w.ctx.hooks.show) w.ctx.hooks.show(); }
  statusInk(); emit("unlock");
  if (pendingOpen) { const id = pendingOpen, intent = pendingIntent; pendingOpen = pendingIntent = null; setTimeout(() => open(id, null, { intent }), 120); }
}
let pcEntry = "";
function showPasscode() {
  const pc = $("#passcode"); pc.classList.add("on"); pcEntry = "";
  const len = S.passcode.length;
  const dots = $(".pc-dots", pc); dots.innerHTML = ""; for (let i = 0; i < len; i++) dots.append(h("i"));
  coverEl.style.transform = "none";
}
function pcKey(k) {
  const len = S.passcode.length; pcEntry += k; haptic(5); SOUND.click();
  $$(".pc-dots i").forEach((d, i) => d.classList.toggle("f", i < pcEntry.length));
  if (pcEntry.length === len) {
    if (pcEntry === S.passcode) setTimeout(finishUnlock, 120);
    else { const dots = $(".pc-dots"); dots.classList.add("shake"); haptic(60); setTimeout(() => { dots.classList.remove("shake"); pcEntry = ""; $$(".pc-dots i").forEach(d => d.classList.remove("f")); }, 420); }
  }
}
function coverPointer(e) {
  if (e.button > 0) return;
  if (!state.awake) { wake(); return; }
  if (e.target.closest(".ntf, .lock-btn, #passcode, button, .lw")) return;
  const nc = coverEl.classList.contains("nc");
  let holdT = setTimeout(() => { if (state.locked) lockCustomize(); }, 650);
  const p0 = local(e);
  track(e, { axis: true,
    move(dx, dy, p, dir) {
      clearTimeout(holdT);
      if (dir === "y") coverDrag(dy);
      else if (dir === "x" && state.locked && dx < 0) { coverEl.style.transform = `translateX(${dx}px)`; }
    },
    end(dx, dy, vx, vy, info) {
      clearTimeout(holdT);
      if (!info.moved) { if (state.locked && p0.y > 200) { $("#lockHint").classList.add("show"); faceScan(); } return; }
      if (info.dir === "x" && state.locked && dx + project(vx) < -150) { coverEl.style.transform = ""; pendingOpen = "camera"; unlockFlow(); return; }
      if (info.dir === "y") return coverRelease(dy, vy);
      spring("cover", 0, 0, { response: .35, damping: .9 }, y => coverEl.style.transform = `translateY(${y}px)`);
    } });
}
function coverDrag(dy) { coverEl.style.transform = `translateY(${dy < 0 ? dy : rubber(dy, H) * .2}px)`; }
function coverRelease(dy, vy) {
  if (dy + project(vy) < -120) { if (state.locked) unlockFlow(); else spring("cover", dy, -H, { response: .35, damping: 1 }, y => coverEl.style.transform = `translateY(${y}px)`).then(coverHide); return; }
  spring("cover", Math.min(0, dy), 0, { response: .35, damping: .9 }, y => coverEl.style.transform = `translateY(${y}px)`);
}
function lockCustomize() {
  haptic(15);
  const fonts = ["Bold", "Thin", "Serif", "Rounded"];
  sheet({ title: "Customize Lock Screen", actions: [
    ...fonts.map((f, i) => ({ label: `Clock: ${f}${S.lockFont === i ? " ✓" : ""}`, run: () => set("lockFont", i) })),
    { label: "Next Wallpaper", run: () => set("wallpaper", typeof S.wallpaper === "number" ? (S.wallpaper + 1) % WALLPAPERS.length : 0) },
  ] });
}
/* top-edge pull: left part opens Notification Centre, right part opens Control Centre */
function topPointer(e) {
  if (e.button > 0 || !state.booted) return;
  const p = local(e);
  if (p.y > 46) return;
  if (e.target.closest("#island")) return;
  e.stopPropagation(); e.preventDefault();
  const right = p.x > W * .62;
  if (right) {
    track(e, { move(dx, dy) { if (!state.ccOpen) { openCC(true); } ccProgress(clamp(dy / 260, 0, 1.2)); },
      end(dx, dy, vy0, vy) { if (dy + project(vy) > 120) ccProgress(1, true); else ccClose(); } });
  } else {
    if (state.locked) return;
    track(e, { move(dx, dy) { if (!coverEl.classList.contains("on")) { coverShow("nc"); state.ncOpen = true; } coverEl.style.transform = `translateY(${Math.min(0, -H + dy)}px)`; },
      end(dx, dy, vx, vy) { if (dy + project(vy) > H * .3) spring("cover", -H + dy, 0, { response: .4, damping: 1 }, y => coverEl.style.transform = `translateY(${y}px)`); else spring("cover", -H + dy, -H, { response: .35, damping: 1 }, y => coverEl.style.transform = `translateY(${y}px)`).then(coverHide); } });
  }
}
function openNC() { if (state.locked) return; coverShow("nc"); state.ncOpen = true; spring("cover", -H, 0, { response: .4, damping: 1 }, y => coverEl.style.transform = `translateY(${y}px)`); }

/* ---------- notifications ---------- */
saved.notifications = saved.notifications || [];
function notify(n) {
  n = Object.assign({ id: Math.random().toString(36).slice(2), time: Date.now(), app: "settings", title: "", body: "" }, n);
  const a = apps[n.app];
  const quiet = S.focus && !(n.breakthrough);
  saved.notifications.unshift(n); saved.notifications = saved.notifications.slice(0, 60); persist();
  badges[n.app] = (badges[n.app] || 0) + 1; if (state.mode === "home") renderHome();
  if (state.locked) { renderNC(); if (!quiet) { wakeBrief(); SOUND.notify(); haptic(30); } return n; }
  if (state.front === n.app && !n.force) { return n; }
  if (!quiet) { banner(n); SOUND.notify(); haptic(30); }
  if (coverEl.classList.contains("on")) renderNC();
  emit("notification", n);
  return n;
}
function wakeBrief() { if (!state.awake) { state.awake = true; screen.classList.remove("screen-off"); applySettings(); renderLock(); renderNC(); resetAutoLock(10000); } }
function ntfEl(n, opts = {}) {
  const a = apps[n.app] || apps.settings;
  const el = h("div.ntf.glass", { dataset: { id: n.id } }, iconEl(a), h("div.b", h("div.h", h("b", n.title || a.name), h("span", ago(n.time))), h("div.m", n.body)));
  el.addEventListener("pointerdown", e => {
    e.stopPropagation();
    // vertical drags on a notification in the cover sheet move the cover sheet itself (swipe up to unlock or dismiss)
    track(e, { axis: true, move(dx, dy, p, dir) { if (dir === "x") el.style.transform = `translateX(${Math.min(dx, 40)}px)`; if (dir === "y" && opts.banner && dy < 0) el.style.transform = `translateY(${dy}px)`; if (dir === "y" && !opts.banner) coverDrag(dy); },
      end(dx, dy, vx, vy, info) {
        if (info.dir === "x" && dx + project(vx) < -160) { el.style.transform = `translateX(-120%)`; el.style.opacity = 0; setTimeout(() => clearNtf(n.id), 220); return; }
        if (opts.banner && info.dir === "y" && dy < -20) { el.classList.remove("in"); setTimeout(() => el.remove(), 400); return; }
        if (!opts.banner && info.dir === "y") return coverRelease(dy, vy);
        el.style.transform = "";
        if (!info.moved) {
          if (opts.banner) el.remove(); clearNtf(n.id);
          if (n.app === "messages" || n.open !== false) {
            if (state.locked) { pendingOpen = n.app; pendingIntent = n.intent; unlockFlow(); }
            else { coverHide(); open(n.app, null, { intent: n.intent }); }
          }
        }
      } });
  });
  return el;
}
function clearNtf(id) {
  const n = saved.notifications.find(x => x.id === id);
  saved.notifications = saved.notifications.filter(x => x.id !== id); persist();
  if (n && badges[n.app]) badges[n.app]--;
  renderNC();
}
function banner(n) {
  const el = ntfEl(n, { banner: true }); $("#banners").append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
  setTimeout(() => { el.classList.remove("in"); setTimeout(() => el.remove(), 450); }, 4200);
}
function renderNC() {
  const list = $("#ncList"); list.innerHTML = "";
  const ns = saved.notifications;
  coverEl.classList.toggle("empty", !ns.length);
  if (!ns.length) return;
  if (S.summaries && ns.length >= 3) {
    const s = summarize(ns);
    list.append(h("div.ntf-summary.glass", h("div.h", { html: sys("sparkle") + " SUMMARY" }), s));
    $$(".ntf-summary svg", list).forEach(x => { x.style.width = "12px"; x.style.height = "12px"; });
  }
  list.append(h("div.nc-head", "Notifications", h("button", { onclick: e => { e.stopPropagation(); saved.notifications = []; Object.keys(badges).forEach(k => badges[k] = 0); persist(); renderNC(); renderHome(); } }, "Clear All")));
  // group by app: newest of each group shown, stacked if more than one
  const groups = new Map(); ns.forEach(n => { if (!groups.has(n.app)) groups.set(n.app, []); groups.get(n.app).push(n); });
  for (const [app, g] of groups) {
    const expanded = expandedGroups.has(app) || g.length === 1;
    if (expanded) g.forEach(n => list.append(ntfEl(n)));
    else { const el = ntfEl(g[0]); el.classList.add("stack"); el.querySelector(".m").textContent = g[0].body + (g.length > 1 ? `  (+${g.length - 1} more)` : "");
      el.addEventListener("click", ev => { ev.stopPropagation(); expandedGroups.add(app); renderNC(); }, { capture: true }); list.append(el); }
  }
}
const expandedGroups = new Set();
function ago(t) { const s = (Date.now() - t) / 1000; if (s < 60) return "now"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago"; return new Date(t).toLocaleDateString(); }
/* Notification summary: deterministic extractive heuristic (not a language model). */
function summarize(ns) {
  const by = new Map(); ns.forEach(n => { const k = n.app; if (!by.has(k)) by.set(k, []); by.get(k).push(n); });
  const STOPW = new Set("the a an to of and or for in on at is are be you your i we it this that with from just can will are was what how about have has get got let lets me my our up out its it's so do im i'm hey hi ok yes no not".split(" "));
  const parts = [];
  for (const [app, list] of [...by.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3)) {
    const people = [...new Set(list.map(n => n.title).filter(Boolean))];
    const words = {}; list.forEach(n => (n.body.toLowerCase().match(/[a-z']+/g) || []).forEach(w => { if (w.length > 3 && !STOPW.has(w)) words[w] = (words[w] || 0) + 1; }));
    const top = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]);
    const times = list.map(n => (n.body.match(/\b\d{1,2}(:\d2)?\s?(am|pm)\b/i) || [])[0]).filter(Boolean);
    const an = (apps[app] || {}).name || app;
    let s = `${list.length} from ${an}`;
    if (people.length && app !== "store") s += ` (${people.slice(0, 3).join(", ")}${people.length > 3 ? ` +${people.length - 3}` : ""})`;
    if (top.length) s += ` about ${top.join(" and ")}`;
    if (times.length) s += `, mentions ${times[0]}`;
    parts.push(s);
  }
  return parts.join("; ") + ".";
}

/* simulated incoming messages (so notifications, banners, badges and summaries have something to show) */
const INCOMING = [
  ["Mia Chen", "Are we still on for dinner at 7pm?"], ["Leo Park", "Sent you the photos from Saturday"], ["Ava Rossi", "Running 10 minutes late, sorry!"],
  ["Noah Smith", "Did you see the game last night?"], ["Mia Chen", "I booked the table for dinner"], ["Sam Patel", "Can you call me when you're free?"],
  ["Ava Rossi", "Coffee tomorrow at 9am?"], ["Leo Park", "Happy Friday! Any plans for the weekend?"], ["Grandma", "Call me back, love you"],
];
let incomingT = 0, incomingI = Math.floor(Math.random() * INCOMING.length);
function scheduleIncoming() {
  clearTimeout(incomingT); if (!S.simulateMessages) return;
  incomingT = setTimeout(() => {
    if (state.booted && !S.airplane) { const [from, text] = INCOMING[incomingI++ % INCOMING.length]; emit("incoming-message", { from, text }); }
    scheduleIncoming();
  }, 60000 + Math.random() * 60000);
}

/* ======================================================================== */
/*  Control Centre                                                            */
/* ======================================================================== */
function openCC(drag) {
  closeOverlays("cc"); state.ccOpen = true; renderCC(); ccEl.classList.add("on"); statusInk();
  if (!drag) ccProgress(1, true);
}
function ccProgress(p, animate) {
  const g = $("#ccGrid");
  const apply = t => { ccEl.style.opacity = clamp(t, 0, 1); g.style.transform = `translateY(${(1 - t) * -40}px) scale(${lerp(.9, 1, Math.min(1, t))})`; };
  if (!animate) return apply(p);
  spring("cc", p === 1 ? .3 : p, 1, { response: .38, damping: .8 }, apply);
}
function ccClose() { spring("cc", 1, 0, { response: .3, damping: 1 }, t => { ccEl.style.opacity = t; $("#ccGrid").style.transform = `scale(${lerp(.9, 1, t)})`; }).then(() => { ccEl.classList.remove("on"); state.ccOpen = false; statusInk(); }); }
function renderCC() {
  const g = $("#ccGrid"); g.innerHTML = "";
  const tog = (key, icon, color, label) => h("button.ccm.r" + (S[key] ? ".on." + color : ""), { title: label, html: sys(icon), onclick: e => { e.stopPropagation(); set(key, !S[key]); if (key === "airplane" && S.airplane) { set("wifi", false); set("cellular", false); set("bluetooth", false); } haptic(); renderCC(); toast(`${label} ${S[key] ? "On" : "Off"}`); } });
  const conn = h("div.ccm.cc-conn", tog("airplane", "plane", "orange", "Airplane Mode"), tog("cellular", "cell", "green", "Cellular Data"), tog("wifi", "wifi", "blue", "Wi-Fi"), tog("bluetooth", "bt", "blue", "Bluetooth"));
  const m = media.state();
  const music = h("div.ccm.cc-music", h("div", h("div.ttl", m.title || "Not Playing"), h("div.art", m.artist || "Music")),
    h("div.ctl", h("button", { html: sys("prev"), onclick: e => { e.stopPropagation(); media.prev(); setTimeout(renderCC, 50); } }), h("button", { html: sys(m.playing ? "pause" : "play"), onclick: e => { e.stopPropagation(); media.toggle(); setTimeout(renderCC, 50); } }), h("button", { html: sys("next"), onclick: e => { e.stopPropagation(); media.next(); setTimeout(renderCC, 50); } })));
  $$(".ctl svg", music).forEach(s => { s.style.width = "26px"; s.style.height = "26px"; });
  const slider = (key, icon, onSet) => {
    const el = h("div.ccm.cc-slider", { title: key, html: `<div class="fill" style="height:${S[key] * 100}%"></div>${sys(icon)}` });
    el.addEventListener("pointerdown", e => { e.stopPropagation(); const start = S[key]; track(e, { move(dx, dy) { const v = clamp(start - dy / 160, 0, 1); el.firstChild.style.height = v * 100 + "%"; onSet(v); }, end() {} }); });
    return el;
  };
  const focus = h("button.ccm.cc-focus" + (S.focus ? ".on.purple" : ""), { html: sys("moon") + `<span>${S.focus || "Focus"}</span>`, onclick: e => { e.stopPropagation(); focusMenu(); } });
  $$("svg", focus).forEach(s => { s.style.width = "22px"; s.style.height = "22px"; });
  const small = (icon, label, fn, on = false, color = "") => h("button.ccm.r" + (on ? ".on" + (color ? "." + color : "") : ""), { title: label, html: sys(icon), onclick: e => { e.stopPropagation(); fn(); haptic(); renderCC(); } });
  g.append(conn, music,
    small("lockrot", "Orientation Lock", () => set("rotationLock", !S.rotationLock), S.rotationLock, ""), small("mirror", "Screen Mirroring", () => toast("No displays found")),
    slider("brightness", "sun", v => set("brightness", Math.max(.15, v))), slider("volume", "speaker", v => { set("volume", v); hud(v); }),
    focus,
    small("torch", "Flashlight", () => torch(!torchOn), torchOn), small("timer", "Timer", () => { ccClose(); open("clock", null, { intent: { tab: "timer" } }); }),
    small("calc", "Calculator", () => { ccClose(); open("calculator"); }), small("cam", "Camera", () => { ccClose(); open("camera"); }),
    small("half", "Dark Mode", () => set("appearance", screen.classList.contains("dark") ? "light" : "dark"), screen.classList.contains("dark")),
    small(S.silent ? "bellOff" : "bell", "Silent Mode", () => set("silent", !S.silent), S.silent, "orange"),
    small("rec", "Screen Recording", () => toast("Screen recording isn't available in the browser")), small("hotspot", "Personal Hotspot", () => set("hotspot", !S.hotspot), S.hotspot, "green"),
    small("drop", "Glass Material: tap to cycle", () => { const order = [10, 55, 100]; const i = order.findIndex(v => v >= S.glass); set("glass", order[(i + 1) % 3]); toast(`Glass ${S.glass < 30 ? "Clear" : S.glass < 80 ? "Default" : "Tinted"}`); }),
    small("scan", "Code Scanner", () => { ccClose(); open("camera", null, { intent: { mode: "scan" } }); }),
  );
}
function focusMenu() {
  sheet({ title: "Focus", actions: [...["Do Not Disturb", "Sleep", "Personal", "Work", "Driving"].map(f => ({ label: f + (S.focus === f ? " ✓" : ""), run: () => { set("focus", S.focus === f ? null : f); renderCC(); toast(S.focus ? `${f} on` : `Focus off`); } })), ...(S.focus ? [{ label: "Turn Off Focus", red: true, run: () => { set("focus", null); renderCC(); } }] : [])] });
}
let torchOn = false;
function torch(on) { torchOn = on; $("#torchLight").classList.toggle("on", on); $("#lockTorch").classList.toggle("on", on); live.update(); }
let hudT = 0;
function hud(v) { const el = $("#hud"); el.innerHTML = `<i style="height:${v * 100}%"></i>`; el.classList.add("on"); clearTimeout(hudT); hudT = setTimeout(() => el.classList.remove("on"), 1200); }

/* ======================================================================== */
/*  Dynamic island and live activities                                       */
/* ======================================================================== */
const timerState = saved.timer || { end: 0, total: 0, label: "Timer" };
const live = {
  flashT: 0, expanded: false,
  update() {
    const inner = $("#islandInner"); const m = media.state();
    islandEl.classList.remove("wide", "big", "huge");
    let html = "";
    if (live.flashing) {
      const f = live.flashing; islandEl.classList.add("wide");
      html = f === "charging" ? `<span class="il">⚡ Charging</span><span>${Math.round(battery.level * 100)}%</span>` : f === "silent" ? `<span class="il" style="color:${S.silent ? "#ff9f0a" : "#fff"}">${S.silent ? "🔕 Silent" : "🔔 Ring"}</span><span></span>` : `<span class="il">${f}</span><span></span>`;
    } else if (assistantOn) {
      islandEl.classList.add("wide"); html = `<div class="glowring"></div><span class="il">✦</span><span>Listening…</span>`;
    } else if (live.expanded && (timerState.end || m.playing || recState.on)) {
      islandEl.classList.add(m.playing && !timerState.end ? "huge" : "big");
      if (timerState.end) html = `<span class="il" style="font-size:15px">⏱ ${esc(timerState.label)}</span><span style="font-size:30px;color:#ff9f0a;font-variant-numeric:tabular-nums">${fmtDur(timerState.end - Date.now())}</span>`;
      else if (recState.on) html = `<span class="il" style="color:#ff453a">● Recording</span><span style="font-size:24px">${fmtDur(Date.now() - recState.start)}</span>`;
      else html = `<div style="width:100%;display:flex;flex-direction:column;gap:14px;padding:12px 8px"><div style="display:flex;gap:12px;align-items:center"><div style="width:52px;height:52px;border-radius:12px;background:${m.art || "#ff375f"}"></div><div><div style="font-size:15px">${esc(m.title)}</div><div style="opacity:.6">${esc(m.artist)}</div></div></div><div style="height:4px;border-radius:2px;background:#444"><div style="height:4px;border-radius:2px;background:#fff;width:${(m.progress || 0) * 100}%"></div></div><div style="display:flex;justify-content:space-around;font-size:22px"><span data-act="prev">⏮</span><span data-act="toggle">${m.playing ? "⏸" : "▶"}</span><span data-act="next">⏭</span></div></div>`;
    } else if (timerState.end) {
      islandEl.classList.add("wide"); html = `<span class="il" style="color:#ff9f0a">⏱</span><span style="color:#ff9f0a;font-variant-numeric:tabular-nums">${fmtDur(timerState.end - Date.now())}</span>`;
    } else if (recState.on) {
      islandEl.classList.add("wide"); html = `<span class="il" style="color:#ff453a">●</span><span>${fmtDur(Date.now() - recState.start)}</span>`;
    } else if (callState.on) {
      islandEl.classList.add("wide"); html = `<span class="il" style="color:#30d158">📞</span><span style="color:#30d158">${fmtDur(Date.now() - callState.start)}</span>`;
    } else if (m.playing) {
      islandEl.classList.add("wide"); html = `<span class="il"><span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:${m.art || "#ff375f"}"></span></span><span style="letter-spacing:2px;color:${"#ff6b8a"}">▂▅▃▇▄</span>`;
    } else if (torchOn) {
      islandEl.classList.add("wide"); html = `<span class="il">🔦</span><span>On</span>`;
    }
    inner.innerHTML = html;
  },
  flash(what, ms = 1600) { live.flashing = what; live.update(); clearTimeout(live.flashT); live.flashT = setTimeout(() => { live.flashing = null; live.update(); }, ms); },
};
const recState = { on: false, start: 0 }, callState = { on: false, start: 0 };
function fmtDur(ms) { ms = Math.max(0, ms); const s = Math.ceil(ms / 1000), hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60; return (hh ? hh + ":" + String(mm).padStart(2, "0") : mm) + ":" + String(ss).padStart(2, "0"); }
function startTimer(ms, label = "Timer") { timerState.end = Date.now() + ms; timerState.total = ms; timerState.label = label; saved.timer = timerState; persist(); live.update(); emit("timer"); }
function stopTimer() { timerState.end = 0; saved.timer = timerState; persist(); live.update(); emit("timer"); }
function islandPointer(e) {
  if (!state.booted) return;
  e.stopPropagation();
  const m = media.state();
  track(e, { end(dx, dy, vx, vy, info) {
    if (dy > 30) return openAssistant("swipe"); // swipe-to-ask: drag down from the island
    if (info.moved) return;
    const act = e.target.closest("[data-act]");
    if (act) { media[act.dataset.act](); setTimeout(live.update, 60); return; }
    if (live.expanded) { live.expanded = false; live.update(); if (timerState.end) open("clock", null, { intent: { tab: "timer" } }); else if (m.playing) open("music"); else if (recState.on) open("voicememos"); return; }
    if (timerState.end || m.playing || recState.on) { live.expanded = true; live.update(); haptic(); return; }
    if (callState.on) return open("phone");
  } });
}

/* ======================================================================== */
/*  Sheets, alerts, context menus, toasts, share                             */
/* ======================================================================== */
function sheet({ title, message, actions = [], cancel = "Cancel" }) {
  const layer = $("#sheetLayer");
  const scrim = h("div.scrim"); const box = h("div.action-sheet");
  const done = () => { scrim.classList.remove("in"); box.classList.remove("in"); setTimeout(() => { scrim.remove(); box.remove(); }, 380); };
  const grp = h("div.as-group", (title || message) ? h("div.t", title ? h("b", title) : null, message ? h("div", message) : null) : null,
    actions.map(a => h("button" + (a.red ? ".red" : ""), { onclick: () => { done(); a.run && a.run(); } }, a.label)));
  box.append(grp, h("div.as-group", h("button.b", { onclick: done, style: { borderTop: 0 } }, cancel)));
  scrim.onclick = done; layer.append(scrim, box);
  requestAnimationFrame(() => { scrim.classList.add("in"); box.classList.add("in"); });
  return { close: done };
}
function alertBox({ title, message, input, buttons = [{ label: "OK" }] }) {
  return new Promise(res => {
    const layer = $("#sheetLayer"); const scrim = h("div.scrim");
    const inp = input ? h("input", { value: input.value || "", placeholder: input.placeholder || "", type: input.type || "text" }) : null;
    const box = h("div.alert", h("h3", title), message ? h("p", message) : null, inp,
      h("div.btns", buttons.map(b => h("button" + (b.red ? ".red" : ""), { onclick: () => { done(); b.run && b.run(inp ? inp.value : undefined); res(b.value ?? (inp ? (b.cancel ? null : inp.value) : b.label)); } }, b.label))));
    const done = () => { scrim.classList.remove("in"); box.classList.remove("in"); setTimeout(() => { scrim.remove(); box.remove(); }, 260); };
    layer.append(scrim, box); requestAnimationFrame(() => { scrim.classList.add("in"); box.classList.add("in"); inp && inp.focus(); });
    if (inp) inp.addEventListener("keydown", e => { if (e.key === "Enter") box.querySelector(".btns button:last-child").click(); });
  });
}
const prompt_ = (title, value = "", placeholder = "") => alertBox({ title, input: { value, placeholder }, buttons: [{ label: "Cancel", cancel: true }, { label: "OK" }] });
let ctxEl = null;
function ctxMenu(anchor, actions) {
  closeCtx();
  const r = rectOf(anchor);
  const scrim = h("div.scrim", { style: { backdropFilter: "blur(8px)" }, onclick: closeCtx });
  const lift = anchor.cloneNode(true); Object.assign(lift.style, { position: "absolute", left: r.x + "px", top: r.y + "px", width: r.w + "px", pointerEvents: "none", transform: "scale(1.08)", transition: "transform .3s" });
  if (!lift.classList.contains("widget")) lift.style.height = r.h + "px";
  const menu = h("div.ctx", actions.map(a => h("button" + (a.red ? ".red" : ""), { onclick: () => { closeCtx(); a.run(); } }, a.label)));
  const below = r.y + r.h + 10 + actions.length * 44 < H - 40;
  Object.assign(menu.style, { left: clamp(r.x, 12, W - 242) + "px", top: below ? (r.y + r.h + 12) + "px" : "", bottom: below ? "" : (H - r.y + 12) + "px", transformOrigin: below ? "top left" : "bottom left" });
  const layer = $("#sheetLayer"); layer.append(scrim, lift, menu);
  ctxEl = { scrim, lift, menu };
  requestAnimationFrame(() => { scrim.classList.add("in"); menu.classList.add("in"); });
}
function closeCtx() { if (!ctxEl) return; const c = ctxEl; ctxEl = null; c.scrim.classList.remove("in"); c.menu.classList.remove("in"); setTimeout(() => { c.scrim.remove(); c.lift.remove(); c.menu.remove(); }, 250); }
let toastT = 0;
function toast(msg, ms = 1800) {
  $$(".toast").forEach(t => t.remove());
  const t = h("div.toast.glass", msg); screen.append(t);
  clearTimeout(toastT); toastT = setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, ms);
}
function share(data) {
  const targets = [
    { label: "Copy", run: () => { navigator.clipboard?.writeText(data.url || data.text || data.title || "").then(() => toast("Copied"), () => toast("Copied")); } },
    { label: "Messages", run: () => open("messages", null, { intent: { compose: data.url || data.text } }) },
    { label: "Mail", run: () => open("mail", null, { intent: { compose: data.url || data.text } }) },
    { label: "Notes", run: () => open("notes", null, { intent: { create: (data.title ? data.title + "\n" : "") + (data.text || data.url || "") } }) },
  ];
  if (data.image) targets.push({ label: "Use as Wallpaper", run: () => { set("wallpaper", data.image); toast("Wallpaper set"); } });
  if (navigator.share && !data.image) targets.push({ label: "Share outside Glassline…", run: () => navigator.share({ title: data.title, text: data.text, url: data.url }).catch(() => {}) });
  sheet({ title: data.title || "Share", actions: targets });
}

/* ======================================================================== */
/*  Spotlight: search or ask                                                 */
/* ======================================================================== */
const index = { idx: null, dirty: true };
const SETTINGS_PAGES = [
  ["Wi-Fi", "wifi network internet wireless"], ["Bluetooth", "bluetooth headphones devices"], ["Display & Brightness", "dark mode light appearance brightness night shift text"],
  ["Wallpaper", "background lock screen image"], ["Sounds & Haptics", "volume ringtone vibration silent"], ["Focus", "do not disturb sleep work quiet"],
  ["Face Unlock & Passcode", "password security lock code"], ["Accessibility", "reduce motion transparency bold larger text"], ["Battery", "power low power mode"],
  ["Notifications", "alerts summaries banners"], ["General", "about storage software update name reset"], ["Home Screen & App Library", "icons widgets apps library"],
  ["Glass Material", "liquid clear tinted transparency material"], ["Privacy & Security", "location camera microphone permissions"],
];
function buildIndex() {
  const GS = window.GlasslineSearch; if (!GS) return null;
  const idx = GS.createIndex(); const list = [];
  Object.values(apps).filter(a => !a.hidden).forEach(a => list.push({ id: "app:" + a.id, type: isInstalled(a.id) ? "app" : "store", title: a.name, subtitle: isInstalled(a.id) ? a.category : "Store · Get", keys: [a.category, a.keywords || "", a.desc || ""], run: () => open(a.id) }));
  SETTINGS_PAGES.forEach(([t, k]) => list.push({ id: "set:" + t, type: "setting", title: t, subtitle: "Settings", keys: [k], run: () => open("settings", null, { intent: { page: t } }) }));
  ["Mia Chen", "Leo Park", "Ava Rossi", "Noah Smith", "Sam Patel", "Grandma"].forEach(n => list.push({ id: "c:" + n, type: "contact", title: n, subtitle: "Contact", keys: ["person phone call message"], run: () => open("phone", null, { intent: { contact: n } }) }));
  (appStore("notes").get("notes", []) || []).forEach(n => list.push({ id: "n:" + n.id, type: "note", title: n.text.split("\n")[0].slice(0, 60) || "New Note", subtitle: "Notes", body: n.text, run: () => open("notes", null, { intent: { note: n.id } }) }));
  (appStore("reminders").get("items", []) || []).forEach(n => list.push({ id: "r:" + n.id, type: "reminder", title: n.text, subtitle: n.done ? "Completed" : "Reminders", run: () => open("reminders") }));
  (appStore("calendar").get("events", []) || []).forEach(n => list.push({ id: "e:" + n.id, type: "event", title: n.title, subtitle: `${n.date} ${n.time}`, run: () => open("calendar", null, { intent: { date: n.date } }) }));
  Object.entries(appStore("messages").get("threads", {}) || {}).forEach(([who, msgs]) => (msgs || []).slice(-20).forEach((m, i) => list.push({ id: `m:${who}:${i}`, type: "message", title: who, subtitle: m.text, body: m.text, run: () => open("messages", null, { intent: { thread: who } }) })));
  ACTIONS.forEach(a => list.push({ id: "act:" + a.title, type: "action", title: a.title, subtitle: "Shortcut", keys: [a.keys], run: a.run }));
  idx.add(list); index.idx = idx; index.dirty = false; return idx;
}
const ACTIONS = [
  { title: "Turn on Dark Mode", keys: "dark appearance night", run: () => set("appearance", "dark") }, { title: "Turn on Light Mode", keys: "light appearance day", run: () => set("appearance", "light") },
  { title: "Start a 5 minute timer", keys: "timer countdown clock", run: () => { startTimer(5 * 60000); toast("Timer started"); } },
  { title: "Toggle Flashlight", keys: "torch light flashlight", run: () => torch(!torchOn) }, { title: "Take a selfie", keys: "camera front photo selfie", run: () => open("camera", null, { intent: { front: true } }) },
  { title: "New Note", keys: "write note create", run: () => open("notes", null, { intent: { create: "" } }) }, { title: "Lock phone", keys: "lock sleep screen", run: () => lock() },
  { title: "Summarize notifications", keys: "summary notifications digest", run: () => openAssistantWith("summarize my notifications") },
];
let spSel = 0, spResults = [];
function spotlightPull(p, release) {
  const sp = $("#spotlight");
  if (p <= 0 && release) { sp.style.opacity = ""; sp.classList.remove("on"); homeEl.style.transform = ""; return; }
  sp.classList.add("on"); sp.style.opacity = p; homeEl.style.transform = `translateY(${p * 30}px)`;
}
function openSpotlight(q = "") {
  closeOverlays("sp"); const sp = $("#spotlight"); sp.classList.add("on"); sp.style.opacity = 1; homeEl.style.transform = "";
  state.spotlight = true; statusInk();
  if (index.dirty) buildIndex();
  const inp = $("#spInput"); inp.value = q; renderSpotlight(); setTimeout(() => inp.focus(), 50);
}
function closeSpotlight() { $("#spotlight").classList.remove("on"); state.spotlight = false; $("#spInput").blur(); statusInk(); }
function calcAnswer(q) {
  const t = q.trim().replace(/×/g, "*").replace(/÷/g, "/").replace(/\^/g, "**");
  if (/^[\d\s.+\-*/()%*]+$/.test(t) && /\d/.test(t) && /[+\-*/%]/.test(t)) { try { const v = Function(`"use strict";return (${t})`)(); if (isFinite(v)) return `${q.trim()} = ${+v.toFixed(10)}`; } catch {} }
  const m = q.match(/^\s*([\d.]+)\s*(km|mi|miles?|kg|lb|lbs|pounds?|c|f|°c|°f|cm|in|inches|m|ft|feet)\s+(?:to|in)\s+(km|mi|miles?|kg|lb|lbs|pounds?|c|f|°c|°f|cm|in|inches|m|ft|feet)\s*$/i);
  if (m) { const v = +m[1], a = m[2].toLowerCase().replace("°", ""), b = m[3].toLowerCase().replace("°", "");
    const n = x => ({ miles: "mi", mile: "mi", lbs: "lb", pounds: "lb", pound: "lb", inches: "in", feet: "ft" }[x] || x);
    const A = n(a), B = n(b); const conv = { "km>mi": x => x * .621371, "mi>km": x => x / .621371, "kg>lb": x => x * 2.20462, "lb>kg": x => x / 2.20462, "c>f": x => x * 9 / 5 + 32, "f>c": x => (x - 32) * 5 / 9, "cm>in": x => x / 2.54, "in>cm": x => x * 2.54, "m>ft": x => x * 3.28084, "ft>m": x => x / 3.28084 }[A + ">" + B];
    if (conv) return `${v} ${A} = ${+conv(v).toFixed(3)} ${B}`; }
  return null;
}
function renderSpotlight() {
  const q = $("#spInput").value; const body = $("#spBody"); body.innerHTML = "";
  if (!q.trim()) {
    const sugg = state.recents.slice(0, 4).concat(["camera", "notes", "settings", "store", "messages", "music"]).filter((v, i, a) => a.indexOf(v) === i && apps[v] && isInstalled(v)).slice(0, 8);
    body.append(h("div.sp-sec", h("h5", "Siri-style Suggestions".replace("Siri-style ", "")), h("div.sp-box.sp-apps", sugg.map(id => h("div.cell", { onclick: e => { closeSpotlight(); open(id, e.currentTarget.querySelector(".icon")); } }, iconEl(apps[id]), h("div.lbl", apps[id].name))))));
    const rec = saved.spRecent || [];
    if (rec.length) body.append(h("div.sp-sec", h("h5", "Recent Searches", h("button", { style: { color: "var(--accent)", fontSize: "13px" }, onclick: () => { saved.spRecent = []; persist(); renderSpotlight(); } }, "Clear")), h("div.sp-box", rec.map(r => h("div.sp-row", { onclick: () => { $("#spInput").value = r; renderSpotlight(); } }, h("span", { html: sys("search"), style: { width: "18px", opacity: .6 } }), h("div.t", r))))));
    body.append(h("div.sp-sec", h("h5", "Try"), h("div.sp-box", ["notes about dinner", "dark mode", "messages from Mia", "12*7+3", "5 km to mi", "set a timer for 3 minutes"].map(r => h("div.sp-row", { onclick: () => { $("#spInput").value = r; renderSpotlight(); } }, h("div.t", r))))));
    spResults = []; return;
  }
  const out = [];
  const calc = calcAnswer(q);
  if (calc) out.push({ answer: calc, run: () => { navigator.clipboard?.writeText(calc.split("= ").pop()).catch(() => {}); toast("Result copied"); } });
  const intent = matchIntent(q);
  const res = index.idx ? index.idx.search(q, { limit: 24 }) : { results: [] };
  const grouped = index.idx ? index.idx.group(res.results, { labels: { app: "Apps", store: "Store", setting: "Settings", contact: "Contacts", note: "Notes", reminder: "Reminders", event: "Calendar", message: "Messages", action: "Shortcuts" } }) : { top: null, sections: [] };
  spResults = [];
  if (calc) { body.append(h("div.sp-sec", h("h5", "Calculator"), h("div.sp-box", h("div.sp-row.sel", { onclick: out[0].run }, h("div.t", { style: { fontSize: "20px" } }, calc))))); spResults.push(out[0]); }
  if (grouped.top) section("Top Hit", [grouped.top]);
  grouped.sections.forEach(s => section(s.label, s.items.slice(0, s.type === "message" ? 4 : 6)));
  if (intent && intent.name !== "search") { const r = { entity: { title: intent.describe, subtitle: "Do it", run: () => runIntent(intent) }, why: ["intent"] }; section("Actions", [r]); }
  body.append(h("div.sp-sec", h("div.sp-box", h("div.sp-row", { onclick: () => openAssistantWith(q) }, h("span", { html: sys("sparkle"), style: { width: "20px", color: "#b48cff" } }), h("div", h("div.t", `Ask “${q}”`), h("div.s", "Answer with the on-device assistant"))))),
    h("div.sp-box", { style: { marginTop: "8px" } }, h("div.sp-row", { onclick: () => { closeSpotlight(); open("browser", null, { intent: { search: q } }); } }, h("span", { html: sys("search"), style: { width: "18px" } }), h("div.t", `Search the web for “${q}”`))));
  spSel = 0; markSel();
  function section(label, items) {
    const box = h("div.sp-box");
    items.forEach(r => {
      const e = r.entity; const i = spResults.length; spResults.push(e);
      const icon = e.id && e.id.startsWith("app:") ? iconEl(apps[e.id.slice(4)]) : h("div.icon", { style: { background: typeIconBg(e.type), width: "36px", height: "36px", borderRadius: "9px" }, html: sys(typeGlyph(e.type)) });
      const s = icon.querySelector("svg"); if (s && !(e.id || "").startsWith("app:")) { s.style.color = "#fff"; s.style.width = "20px"; s.style.height = "20px"; }
      const hl = t => window.GlasslineSearch.highlight(t, r.highlight);
      box.append(h("div.sp-row", { dataset: { i }, onclick: () => runResult(e, q) }, icon, h("div", { style: { minWidth: 0, flex: 1 } }, h("div.t", { html: hl(e.title) }), h("div.s", { html: hl(e.subtitle || "") })),
        e.type === "store" ? h("button.pill-btn.grey", { style: { padding: "4px 12px", fontSize: "13px" }, onclick: ev => { ev.stopPropagation(); install(e.id.slice(4)); toast("Installing " + e.title); } }, "Get") : h("span.sp-why", (r.why || []).join(" + "))));
    });
    body.append(h("div.sp-sec", h("h5", label), box));
  }
}
const typeGlyph = t => ({ setting: "home", contact: "star", note: "calc", reminder: "star", event: "timer", message: "bell", action: "sparkle" }[t] || "search");
const typeIconBg = t => ({ setting: "#8e8e93", contact: "#64d2ff", note: "#ffd60a", reminder: "#ff9f0a", event: "#ff453a", message: "#30d158", action: "#5e5ce6" }[t] || "#8e8e93");
function runResult(e, q) {
  saved.spRecent = [q, ...(saved.spRecent || []).filter(x => x !== q)].slice(0, 5); persist();
  closeSpotlight(); e.run && e.run();
}
function markSel() { $$("#spBody .sp-row[data-i]").forEach(r => r.classList.toggle("sel", +r.dataset.i === spSel)); }

/* ======================================================================== */
/*  Assistant: intents parsed from text, plus on-screen awareness            */
/* ======================================================================== */
let assistantOn = false, recog = null;
function openAssistant(via) {
  closeOverlays("as"); assistantOn = true; $("#assistant").classList.add("on"); live.update(); haptic(15);
  $("#asLog").innerHTML = "";
  asSay(greeting(), [{ label: "What's on my screen?", q: "what's on my screen" }, { label: "Summarize notifications", q: "summarize my notifications" }, { label: "Set a 10 minute timer", q: "set a timer for 10 minutes" }]);
  setTimeout(() => $("#asInput").focus(), 80);
}
function openAssistantWith(q) { closeSpotlight(); openAssistant("text"); $("#asLog").innerHTML = ""; handleAsk(q); }
function closeAssistant() { assistantOn = false; $("#assistant").classList.remove("on"); live.update(); if (recog) try { recog.stop(); } catch {} }
function greeting() { const hr = new Date().getHours(); return `${hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening"}. What can I do for you?`; }
function asSay(text, chips = [], { speak = false } = {}) {
  const el = h("div.as-msg", text);
  chips.forEach(c => el.append(h("button", { onclick: () => { if (!asChip(c)) handleAsk(c.q); } }, c.label)));
  $("#asLog").append(el); $("#asLog").scrollTop = 1e6;
  if (speak && window.speechSynthesis && !S.silent) { try { const u = new SpeechSynthesisUtterance(text); u.volume = S.volume; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {} }
}
function screenEntities() {
  const front = state.front && state.windows[state.front];
  const root = front ? front.appEl : homeEl;
  const out = []; const sr = screen.getBoundingClientRect();
  $$("[data-entity]", root).forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom > sr.top && r.top < sr.bottom && r.width) out.push({ type: el.dataset.entity, text: (el.dataset.title || el.textContent).trim().slice(0, 80) }); });
  return { app: front ? front.a.name : "Home Screen", entities: out.slice(0, 12) };
}
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, a: 1, an: 1 };
function matchIntent(raw) {
  const q = raw.toLowerCase().trim().replace(/[?!.]+$/, "");
  const num = s => s == null ? null : (isNaN(+s) ? NUMW[s] : +s);
  let m;
  if ((m = q.match(/(?:set|start)?\s*(?:a\s+)?timer (?:for )?(\w+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)/)) || (m = q.match(/(\w+)\s*(hours?|minutes?|mins?|seconds?|secs?) timer/))) {
    const n = num(m[1]); if (n) { const unit = m[2][0] === "h" ? 3600000 : m[2][0] === "m" ? 60000 : 1000; return { name: "timer", ms: n * unit, describe: `Start a ${n} ${m[2]} timer` }; }
  }
  if ((m = q.match(/(?:set|wake me up)\s*(?:an?\s+)?(?:alarm)?\s*(?:for|at)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/))) { let hh = +m[1]; const mm = +(m[2] || 0); if (m[3] === "pm" && hh < 12) hh += 12; if (m[3] === "am" && hh === 12) hh = 0; return { name: "alarm", time: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, describe: `Set an alarm for ${m[1]}${m[2] ? ":" + m[2] : ""}${m[3] ? " " + m[3] : ""}` }; }
  if (/(cancel|stop) (the )?timer/.test(q)) return { name: "stoptimer", describe: "Stop the timer" };
  if ((m = q.match(/^(?:turn|switch)\s+(on|off)\s+(?:the\s+)?(.+)$/)) || (m = q.match(/^(?:turn|switch)\s+(?:the\s+)?(.+?)\s+(on|off)$/))) {
    const onOff = m[1] === "on" || m[1] === "off" ? m[1] : m[2]; const what = m[1] === "on" || m[1] === "off" ? m[2] : m[1];
    const map = { "dark mode": "dark", "light mode": "light", flashlight: "torch", torch: "torch", "wi-fi": "wifi", wifi: "wifi", bluetooth: "bluetooth", "airplane mode": "airplane", "silent mode": "silent", "do not disturb": "focus", "focus": "focus", "low power mode": "lowPower", "night shift": "nightShift", "reduce motion": "reduceMotion", "cellular": "cellular", "hotspot": "hotspot" };
    const key = Object.keys(map).find(k => what.includes(k)); if (key) return { name: "toggle", key: map[key], on: onOff === "on", describe: `Turn ${onOff} ${key}` };
  }
  if (/dark mode|go dark/.test(q)) return { name: "toggle", key: "dark", on: true, describe: "Turn on dark mode" };
  if (/light mode/.test(q)) return { name: "toggle", key: "light", on: true, describe: "Turn on light mode" };
  if ((m = q.match(/(?:set )?brightness (?:to )?(\d+)\s*%?/))) return { name: "brightness", v: +m[1] / 100, describe: `Set brightness to ${m[1]}%` };
  if (/(brighter|brightness up|increase brightness)/.test(q)) return { name: "brightness", v: Math.min(1, S.brightness + .2), describe: "Increase brightness" };
  if (/(dimmer|brightness down|decrease brightness)/.test(q)) return { name: "brightness", v: Math.max(.15, S.brightness - .2), describe: "Decrease brightness" };
  if ((m = q.match(/(?:set )?volume (?:to )?(\d+)\s*%?/))) return { name: "volume", v: +m[1] / 100, describe: `Set volume to ${m[1]}%` };
  if (/^(play|resume)( some)? music|^play$|^play a song/.test(q)) return { name: "media", act: "play", describe: "Play music" };
  if (/^(pause|stop)( the)?( music| song)?$/.test(q)) return { name: "media", act: "pause", describe: "Pause music" };
  if (/(next|skip)( song| track)?$/.test(q)) return { name: "media", act: "next", describe: "Next track" };
  if (/(what('s| is) on (my|the) screen|what am i looking at|on screen)/.test(q)) return { name: "screen", describe: "Describe what's on screen" };
  if (/summar(y|ise|ize).*(notification|alerts)|what did i miss/.test(q)) return { name: "summary", describe: "Summarize notifications" };
  if (/what('s| is) the time|what time is it|^time$/.test(q)) return { name: "time", describe: "Tell the time" };
  if (/what('s| is) (the |today's )?date|what day is it/.test(q)) return { name: "date", describe: "Tell the date" };
  if (/weather|temperature|is it (going to )?rain|forecast/.test(q)) return { name: "weather", describe: "Show the weather" };
  if ((m = q.match(/^(?:what(?:'s| is)\s+|calculate\s+|compute\s+)?([\d\s.+\-*/x×÷()%^]+)$/)) && /[+\-*/x×÷%^]/.test(m[1])) return { name: "calc", expr: m[1].replace(/x/g, "*"), describe: "Calculate " + m[1] };
  if ((m = raw.match(/^(?:remind me to|add a reminder to|add reminder|remember to)\s+(.+)$/i))) return { name: "reminder", text: m[1], describe: `Add reminder “${m[1]}”` };
  if ((m = raw.match(/^(?:note that|take a note|make a note|new note|write down|note)[:,]?\s*(.*)$/i))) return { name: "note", text: m[1], describe: `Create a note${m[1] ? ` “${m[1].slice(0, 30)}”` : ""}` };
  if ((m = raw.match(/^(?:text|message|send a message to|tell)\s+([a-z ]+?)\s+(?:saying|that|:)\s*(.+)$/i))) return { name: "message", to: titleCase(m[1]), text: m[2], describe: `Message ${titleCase(m[1])}` };
  if ((m = raw.match(/^(?:call|phone|ring)\s+(.+)$/i))) return { name: "call", to: titleCase(m[1]), describe: `Call ${titleCase(m[1])}` };
  if (/take a (photo|picture)|open (the )?camera|selfie/.test(q)) return { name: "camera", front: /selfie/.test(q), describe: "Open the camera" };
  if ((m = q.match(/^(?:install|download|get)\s+(.+)$/))) { const a = findApp(m[1]); if (a) return { name: "install", app: a.id, describe: `Get ${a.name}` }; }
  if ((m = q.match(/^(?:open|launch|start|show|go to)\s+(?:the\s+)?(.+?)(?:\s+app)?$/))) { const a = findApp(m[1]); if (a) return { name: "open", app: a.id, describe: `Open ${a.name}` }; if (/home/.test(m[1])) return { name: "home", describe: "Go home" }; if (/control/.test(m[1])) return { name: "cc", describe: "Open Control Centre" }; if (/notification/.test(m[1])) return { name: "nc", describe: "Show notifications" }; }
  if (/^(go )?home$/.test(q)) return { name: "home", describe: "Go home" };
  if (/^lock( (the )?(phone|screen))?$/.test(q)) return { name: "lock", describe: "Lock the phone" };
  if (/(app )?switcher|recent apps|multitask/.test(q)) return { name: "switcher", describe: "Show the app switcher" };
  if ((m = q.match(/^(?:search(?: for)?|find|look up)\s+(.+)$/))) return { name: "search", q: m[1], describe: `Search for ${m[1]}` };
  if ((m = q.match(/^(?:navigate|directions|take me) to\s+(.+)$/))) return { name: "maps", q: m[1], describe: `Find ${m[1]} in Maps` };
  if ((m = q.match(/^translate\s+(.+?)\s+(?:to|into)\s+(\w+)$/))) return { name: "translate", text: m[1], lang: m[2], describe: `Translate to ${m[2]}` };
  if (/glass|transparen/.test(q) && /(clear|tint|more|less)/.test(q)) return { name: "glass", v: /clear|less/.test(q) ? 10 : 100, describe: "Adjust the glass material" };
  if (/(who are you|what can you do|help)/.test(q)) return { name: "help", describe: "What I can do" };
  if (/^(hi|hello|hey)\b/.test(q)) return { name: "hello", describe: "Say hello" };
  return null;
}
const titleCase = s => s.trim().replace(/\b\w/g, c => c.toUpperCase());
function findApp(name) {
  const n = name.toLowerCase().replace(/\s+app$/, "").trim();
  const all = Object.values(apps).filter(a => !a.hidden);
  return all.find(a => a.name.toLowerCase() === n) || all.find(a => a.name.toLowerCase().startsWith(n)) || all.find(a => (a.keywords || "").toLowerCase().split(/[ ,]+/).includes(n)) || all.find(a => a.name.toLowerCase().includes(n) && n.length > 2);
}
function runIntent(it) {
  const say = (t, chips, o) => assistantOn ? asSay(t, chips, { speak: true, ...o }) : toast(t);
  switch (it.name) {
    case "timer": startTimer(it.ms); return say(`Timer set for ${fmtDur(it.ms)}.`);
    case "stoptimer": stopTimer(); return say("Timer cancelled.");
    case "alarm": emit("add-alarm", it.time); return say(`Alarm set for ${it.time}.`);
    case "toggle":
      if (it.key === "dark") set("appearance", "dark"); else if (it.key === "light") set("appearance", "light");
      else if (it.key === "torch") torch(it.on); else if (it.key === "focus") set("focus", it.on ? "Do Not Disturb" : null); else set(it.key, it.on);
      return say(`${it.describe.replace(/^Turn/, "Turned")}.`);
    case "brightness": set("brightness", clamp(it.v, .15, 1)); return say(`Brightness ${Math.round(S.brightness * 100)}%.`);
    case "volume": set("volume", clamp(it.v, 0, 1)); hud(S.volume); return say(`Volume ${Math.round(S.volume * 100)}%.`);
    case "media": if (!media.player) { open("music"); setTimeout(() => media.player && (it.act === "pause" ? null : media.player.play()), 600); } else { it.act === "play" ? media.player.play() : it.act === "pause" ? media.player.pause() : media.next(); } return say(it.describe + ".");
    case "screen": { const s = screenEntities(); const kinds = {}; s.entities.forEach(e => (kinds[e.type] = kinds[e.type] || []).push(e.text));
      const desc = Object.entries(kinds).map(([k, v]) => `${v.length} ${k}${v.length > 1 ? "s" : ""} (${v.slice(0, 3).map(x => `“${x.slice(0, 30)}”`).join(", ")})`).join("; ");
      return say(s.entities.length ? `You're in ${s.app}. I can see ${desc}.` : `You're on ${s.app}. Nothing on screen is annotated for me to act on.`); }
    case "summary": return say(saved.notifications.length ? summarize(saved.notifications) : "You have no notifications.");
    case "time": return say(`It's ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    case "date": return say(`Today is ${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}.`);
    case "weather": { const w = weatherNow(); return say(`${w.city}: ${w.temp}° and ${w.cond.toLowerCase()}. High ${w.hi}°, low ${w.lo}°.`, [{ label: "Open Weather", q: "open weather" }]); }
    case "calc": { const r = calcAnswer(it.expr); return say(r ? r : "I couldn't calculate that."); }
    case "reminder": emit("add-reminder", it.text); return say(`Added “${it.text}” to Reminders.`, [{ label: "Show Reminders", q: "open reminders" }]);
    case "note": emit("add-note", it.text); return say(it.text ? "Noted." : "Opening a new note.", [{ label: "Open Notes", q: "open notes" }]);
    case "message": emit("send-message", { to: it.to, text: it.text }); return say(`Sent to ${it.to}: “${it.text}”`, [{ label: "Open Messages", q: "open messages" }]);
    case "call": closeAssistant(); return open("phone", null, { intent: { call: it.to } });
    case "camera": closeAssistant(); return open("camera", null, { intent: { front: it.front } });
    case "install": install(it.app); return say(`Getting ${apps[it.app].name}. It will appear on your Home Screen.`);
    case "open": closeAssistant(); return open(it.app);
    case "home": closeAssistant(); return goHome();
    case "lock": closeAssistant(); return lock();
    case "switcher": closeAssistant(); return showSwitcher();
    case "cc": closeAssistant(); return openCC();
    case "nc": closeAssistant(); return openNC();
    case "search": closeAssistant(); return openSpotlight(it.q);
    case "maps": closeAssistant(); return open("maps", null, { intent: { q: it.q } });
    case "translate": closeAssistant(); return open("translate", null, { intent: { text: it.text, lang: it.lang } });
    case "glass": set("glass", it.v); return say(`Glass set to ${it.v < 50 ? "clear" : "tinted"}.`);
    case "help": return say("I can open and install apps, set timers and alarms, toggle settings, play music, send messages, make calls, create notes and reminders, do maths and unit conversions, read the weather, summarize notifications and tell you what's on screen. I run on this device with rules, not a large language model.");
    case "hello": return say(greeting());
  }
}
function handleAsk(text) {
  text = String(text || "").trim(); if (!text) return;
  asSay(text); $("#asLog").lastChild.classList.add("me");
  const it = matchIntent(text);
  if (it) return runIntent(it);
  // fall back to the local index: answer with the best matching thing on the device
  if (index.dirty) buildIndex();
  const res = index.idx ? index.idx.search(text, { limit: 3 }).results : [];
  if (res.length) return asSay(`Here's what I found on your phone:`, res.map(r => ({ label: r.entity.title.slice(0, 28), q: null, run: r.entity.run }))).valueOf();
  asSay("I can't answer that offline. Want me to search the web?", [{ label: "Search the web", q: "__web:" + text }]);
}
function asChip(c) { if (c.q && c.q.startsWith("__web:")) { closeAssistant(); open("browser", null, { intent: { search: c.q.slice(6) } }); return true; } if (c.run) { closeAssistant(); c.run(); return true; } return false; }

/* ======================================================================== */
/*  Overlays, power, hardware buttons, keyboard                              */
/* ======================================================================== */
function closeOverlays(except) {
  if (except !== "sp" && state.spotlight) closeSpotlight();
  if (except !== "cc" && state.ccOpen) { ccEl.classList.remove("on"); state.ccOpen = false; }
  if (except !== "as" && assistantOn) closeAssistant();
  if (!state.locked && except !== "nc" && coverEl.classList.contains("on")) coverHide();
  closeCtx(); live.expanded = false; live.update();
}
let autoLockT = 0;
function resetAutoLock(ms) { clearTimeout(autoLockT); const t = ms || S.autoLock * 1000; if (!t) return; autoLockT = setTimeout(() => { if (state.locked) sleepScreen(); else if (S.autoLock) lock(); }, t); }
function powerOffUI() {
  closeOverlays(); const po = $("#powerOff"); po.classList.add("on");
  const knob = $(".po-knob", po);
  knob.onpointerdown = e => { e.stopPropagation(); track(e, { move(dx) { knob.style.transform = `translateX(${clamp(dx, 0, 236)}px)`; }, end(dx) { if (dx > 220) powerDown(); else { knob.style.transition = "transform .3s"; knob.style.transform = ""; setTimeout(() => knob.style.transition = "", 300); } } }); };
  $("#poCancel").onclick = () => po.classList.remove("on");
}
async function powerDown() {
  $("#powerOff").classList.remove("on");
  Object.keys(state.windows).forEach(closeApp);
  state.booted = false; state.mode = "off"; $("#dim").style.opacity = 1; screen.classList.add("screen-off");
  toast("Press the side button to turn on");
}
function hardware() {
  let downT = 0, longT = 0, longerT = 0, fired = false;
  const pw = $("#hwPower");
  pw.addEventListener("pointerdown", () => { fired = false; downT = Date.now(); audio();
    longT = setTimeout(() => { if (state.booted && !state.locked) { fired = true; openAssistant("button"); } }, 600);
    longerT = setTimeout(() => { if (state.booted) { fired = true; closeAssistant(); powerOffUI(); } }, 2200); });
  pw.addEventListener("pointerup", () => { clearTimeout(longT); clearTimeout(longerT); if (fired) return;
    if (state.mode === "off") return boot();
    if (state.locked) { state.awake ? sleepScreen() : wake(); } else lock(); });
  const vol = d => { set("volume", clamp(+(S.volume + d).toFixed(2), 0, 1)); hud(S.volume); tone([[660, .04]], { gain: .05 }); };
  $("#hwVolUp").onclick = () => vol(.1); $("#hwVolDown").onclick = () => vol(-.1);
  $("#hwAction").onclick = () => { set("silent", !S.silent); live.flash("silent"); haptic(20); };
  document.addEventListener("keydown", e => {
    if (e.target.closest("input, textarea, [contenteditable]")) { if (e.key === "Escape") e.target.blur(); if (state.spotlight && e.target.id === "spInput") spKeys(e); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "h") goHome(); else if (k === "l") $("#hwPower").dispatchEvent(new PointerEvent("pointerdown")) || $("#hwPower").dispatchEvent(new PointerEvent("pointerup"));
    else if (k === "s") showSwitcher(); else if (k === "a") openAssistant("key"); else if (k === "/") { e.preventDefault(); if (state.locked) return; openSpotlight(); }
    else if (k === "c") state.ccOpen ? ccClose() : openCC(); else if (k === "n") coverEl.classList.contains("on") ? coverHide() : openNC();
    else if (k === "+" || k === "=") vol(.1); else if (k === "-") vol(-.1);
    else if (k === "escape") { if (state.locked) return; closeOverlays(); }
    else if (k === " " && state.locked) unlockFlow();
  });
}
function spKeys(e) {
  if (e.key === "ArrowDown") { spSel = Math.min(spResults.length - 1, spSel + 1); markSel(); e.preventDefault(); }
  else if (e.key === "ArrowUp") { spSel = Math.max(0, spSel - 1); markSel(); e.preventDefault(); }
  else if (e.key === "Enter") { const r = spResults[spSel]; if (r) { if (r.answer) r.run(); else runResult(r, $("#spInput").value); } else openAssistantWith($("#spInput").value); }
  else if (e.key === "Escape") closeSpotlight();
}

/* ======================================================================== */
/*  Boot: original logo, progress, then lock screen                         */
/* ======================================================================== */
const LOGO = `<svg viewBox="0 0 92 110" fill="none"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfd3dc"/></linearGradient></defs>
<path d="M46 4C60 26 84 44 84 68a38 38 0 0 1-76 0C8 44 32 26 46 4z" fill="url(#lg)"/><path d="M30 66a16 16 0 0 0 16 16" stroke="#000" stroke-width="5" stroke-linecap="round" opacity=".85"/></svg>`;
async function boot() {
  state.mode = "boot"; screen.classList.add("booting"); screen.classList.remove("screen-off");
  const b = $("#boot"); b.classList.remove("off"); b.style.display = "flex"; $("#dim").style.opacity = 0;
  $("#bootLogo").innerHTML = LOGO;
  const bar = $("#bootBar"), fill = $("#bootBar i"); fill.style.width = "0";
  const fast = new URLSearchParams(location.search).has("fast");
  await sleep(fast ? 50 : 900); bar.style.opacity = 1;
  const steps = fast ? 3 : 12;
  for (let i = 1; i <= steps; i++) { fill.style.width = (i / steps * 100) + "%"; await sleep(fast ? 20 : 90 + Math.random() * 120); }
  await sleep(fast ? 20 : 300);
  b.classList.add("off"); await sleep(fast ? 0 : 500); b.style.display = "none";
  screen.classList.remove("booting");
  state.booted = true; state.locked = true; state.mode = "lock"; screen.classList.add("locked");
  coverShow("lock"); wake(); scheduleIncoming();
  if (!saved.welcomed) { saved.welcomed = true; persist(); setTimeout(() => notify({ app: "tips", title: "Welcome to Glassline", body: "Swipe up from the bottom to open. Pull down from the top right for Control Centre.", open: true }), 1500); }
  emit("booted");
}

/* ---------- fit the device to the window ---------- */
function fit() {
  const full = innerWidth < 500 || new URLSearchParams(location.search).has("full");
  document.body.classList.toggle("full", full);
  const frame = $("#frame");
  if (full) { scale = Math.min(innerWidth / W, innerHeight / H); screen.style.transform = `scale(${scale})`; screen.style.transformOrigin = "0 0";
    frame.style.width = W * scale + "px"; frame.style.height = H * scale + "px"; frame.style.margin = "auto"; }
  else { screen.style.transform = ""; const fw = W + 24, fh = H + 24; const s = Math.min(1, (innerHeight - 30) / fh, (innerWidth - (innerWidth > 760 ? 330 : 20)) / fw); frame.style.transform = `scale(${s})`; frame.style.width = ""; frame.style.height = ""; scale = s; }
}

/* ---------- clock tick ---------- */
function tick() {
  renderStatus();
  if (coverEl.classList.contains("on")) { $("#lockClock").textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, ""); }
  if (timerState.end) {
    if (Date.now() >= timerState.end) { const label = timerState.label; stopTimer(); SOUND.alarm(); wakeBrief(); notify({ app: "clock", title: label, body: "Timer done", breakthrough: true, intent: { tab: "timer" } }); haptic(300); }
    else live.update();
  }
  if (recState.on || callState.on) live.update();
  emit("tick");
}

/* ======================================================================== */
/*  Start                                                                     */
/* ======================================================================== */
function start() {
  screen = $("#screen"); homeEl = $("#home"); pagesEl = $("#pages"); dockEl = $("#dock"); dotsEl = $("#dots"); winsEl = $("#windows");
  coverEl = $("#cover"); ccEl = $("#cc"); islandEl = $("#island");
  coverEl.prepend(h("div.bg"));
  addEventListener("resize", fit); fit();
  applySettings(); renderStatus(); renderHome();
  // pad
  const pad = $(".pc-pad"); [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["", ""], ["0", ""], ["", ""]].forEach(([n, l]) => pad.append(n ? h("button", { onclick: e => { e.stopPropagation(); pcKey(n); } }, n, h("small", l)) : h("span")));
  $("#pcCancel").onclick = e => { e.stopPropagation(); $("#passcode").classList.remove("on"); };
  $("#pcEmergency").onclick = e => { e.stopPropagation(); toast("Emergency calls aren't possible from a browser"); };
  // listeners
  $("#homeBarZone").addEventListener("pointerdown", homeBarPointer);
  screen.addEventListener("pointerdown", topPointer, true);
  pagesEl.addEventListener("pointerdown", homePointer);
  coverEl.addEventListener("pointerdown", coverPointer);
  islandEl.addEventListener("pointerdown", islandPointer);
  $("#doneBtn").onclick = exitJiggle;
  ccEl.addEventListener("pointerdown", e => { if (e.target === ccEl || e.target.id === "ccGrid") { track(e, { end(dx, dy, vx, vy, info) { if (!info.moved || dy < -40) ccClose(); } }); } });
  $("#spInput").addEventListener("input", renderSpotlight);
  $("#spCancel").onclick = closeSpotlight;
  $("#spotlight").addEventListener("pointerdown", e => { if (e.target.id === "spBody" || e.target.id === "spotlight") { track(e, { end(dx, dy, vx, vy, info) { if (dy < -60 || !info.moved) closeSpotlight(); } }); } });
  $("#asForm").onsubmit = e => { e.preventDefault(); const v = $("#asInput").value; $("#asInput").value = ""; handleAsk(v); };
  $("#assistant").addEventListener("pointerdown", e => { if (e.target.id === "assistant") closeAssistant(); });
  $("#asMic").onclick = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return asSay("Speech recognition isn't available in this browser. Type instead.");
    recog = new SR(); recog.lang = navigator.language || "en-US"; recog.interimResults = false; $("#asMic").classList.add("rec");
    recog.onresult = ev => { const t = ev.results[0][0].transcript; handleAsk(t); }; recog.onend = () => $("#asMic").classList.remove("rec"); recog.onerror = () => $("#asMic").classList.remove("rec");
    try { recog.start(); } catch {}
  };
  // lock-screen buttons: press and hold
  const holdBtn = (el, fn) => { let t; el.addEventListener("pointerdown", e => { e.stopPropagation(); el.classList.add("held"); t = setTimeout(() => { haptic(20); fn(); }, 450); }); ["pointerup", "pointerleave", "pointercancel"].forEach(ev => el.addEventListener(ev, () => { clearTimeout(t); el.classList.remove("held"); })); };
  holdBtn($("#lockTorch"), () => torch(!torchOn));
  holdBtn($("#lockCam"), () => { pendingOpen = "camera"; unlockFlow(); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => applySettings());
  ["pointerdown", "keydown"].forEach(ev => document.addEventListener(ev, () => { if (state.awake) resetAutoLock(); }, true));
  hardware();
  setInterval(tick, 1000);
  setInterval(() => { if (state.mode === "home") $$(".w-clock", homeEl).forEach(el => el.innerHTML = analogClock(130)); }, 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  boot();
}

window.GOS = {
  W, H, h, $, $$, sys, svg, G, SYS, esc, clamp, lerp, sleep, spring, project, rubber, track, haptic, tone, SOUND,
  registerApp, apps, iconEl, open, goHome, closeApp, lock, unlockFlow, install, uninstall, isInstalled, placeApp,
  notify, toast, sheet, alert: alertBox, prompt: prompt_, share, ctxMenu, overlay, hud, torch: v => torch(v), get torchOn() { return torchOn; },
  settings: S, set, on, emit, appStore, media, battery, live, startTimer, stopTimer, timerState, recState, callState, fmtDur,
  weatherNow, setWeather, WALLPAPERS, wallpaperCSS, WIDGETS, summarize, matchIntent, runIntent, handleAsk, openAssistant, openSpotlight, openCC, openNC, showSwitcher,
  screenEntities, setBadge, badges, state, saved, persist, layout, renderHome, index, calcAnswer, start, boot, makeStack, asChip, findApp,
  reset() { localStorage.removeItem(KEY); location.reload(); },
};
})();
