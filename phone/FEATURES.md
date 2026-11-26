# Glassline OS: feature map

Glassline OS is a phone operating system shell that runs in a web browser. Its behaviour follows iOS 27's interaction model, which is documented with graded sources in [`../EVIDENCE.md`](../EVIDENCE.md) and [`../SEARCH.md`](../SEARCH.md). Every visual asset, icon, sound, wallpaper, logo and line of code is original. It is not affiliated with Apple.

**How to check a claim:** each row names the test in `tests/phone.e2e.js` that drives it with real pointer events in Chromium. Run `node tests/phone.e2e.js`; screenshots land in `docs/screens/phone-*.png`.

## System

| Feature | How it works here | Verified by |
|---|---|---|
| Power on / boot | Black screen, original droplet logo, progress bar, then the lock screen. Hold the side button for 2 s and slide to power off; press it again to boot | `boots to the lock screen` |
| Lock screen | Live clock (four styles), date, glance widgets (weather, battery, next event, running timer, now playing), notifications, flashlight and camera buttons (press and hold) | `boots to the lock screen` |
| Unlock | Swipe up. A simulated face unlock opens the padlock after waking; with a passcode set, a keypad appears; a wrong code shakes and stays locked | `swipe up…unlocks`, `wrong passcode stays locked`, `right passcode unlocks` |
| Lock screen customisation | Press and hold the lock screen to choose the clock style and wallpaper | manual |
| Swipe left for camera | From the lock screen | manual |
| Home Screen | 4-column grid, widgets (small and wide), pages with dots, dock, Today view (swipe right), App Library (last page) with auto categories and search | `tapping Notes opens it` |
| App launch / close | Window springs out of the icon's rect and back into it (spring response 0.48 s, damping 0.84) | `tapping Notes opens it`, `fast flick…goes home` |
| Home gesture | Window follows the finger; release uses the projected end point `v/1000·r/(1−r)`; hold mid-screen to get the switcher | `fast flick up from the home bar goes home`, `drag up and pause opens the app switcher` |
| App switcher | Cards of recent apps; swipe a card up to close it; tap to reopen it from its own rect | `swiping a card up closes that app` |
| Quick app switch | Swipe left or right along the home bar | manual |
| Edit mode | Press and hold: context menu with quick actions, Edit Home Screen, Share, Remove. Icons jiggle, drag to reorder across pages and the dock, − to remove, + Add Widget | `press and hold…menu`, `Edit Home Screen enters jiggle mode`, `dragging an icon…reorders it` |
| Delete apps | “Delete App” or “Remove from Home Screen” (stays in App Library) | `deleting a store app removes it` |
| Control Centre | Pull down from the top right. Connectivity group, media, brightness and volume sliders, Focus, flashlight, timer, calculator, camera, dark mode, silent, hotspot, glass material, code scanner | `pull down from the top right opens Control Centre`, `Dark Mode toggle…` |
| Notification Centre | Pull down from the top left; grouped stacks by app; swipe left to clear; tap to open | `pull down from the top left opens notifications` |
| Banners and badges | Incoming messages drop a banner, play an original tone, vibrate (phones) and badge the icon | `incoming message shows a banner`, `Messages gets a badge` |
| Focus modes | Do Not Disturb, Sleep, Personal, Work, Driving; silence banners; timers and alarms break through | manual |
| Dynamic island | Live activities: timer countdown, now playing, recording, call, flashlight, charging, silent switch. Tap to expand, tap again to open the app, drag down to ask | manual |
| Status bar | Real time, real battery level where the browser exposes it, Wi-Fi/cellular/airplane/focus/silent indicators | manual |
| Hardware buttons | Side (lock/wake, hold for assistant, hold longer to power off), volume up/down with HUD, action button toggles silent | manual |
| Glass material | One value from clear to tinted drives blur and tint on every glass surface | Settings → Glass Material |
| Appearance | Light, dark, automatic (follows your computer), Night Shift, bold text, brightness, auto-lock | `Dark Mode toggle…` |
| Accessibility | Reduce Motion makes springs instant; Reduce Transparency | manual |
| Persistence | Everything is stored in this browser (localStorage) and survives reloads | `settings and layout persist across reloads` |
| Offline | Service worker caches the shell when served over http | manual |

## Intelligence

These are deterministic, rule-based features that run locally. They are not a large language model.

| Feature | How it works here | Verified by |
|---|---|---|
| Search or Ask | Hybrid index (keyword, meaning via concept lexicon, typo-tolerant trigrams) fused with Reciprocal Rank Fusion over apps, settings, contacts, notes, reminders, events, messages, store apps and actions. Inline maths and unit conversion | `search finds a note…`, `…by meaning`, `…tolerates a typo`, `…answers arithmetic inline` |
| Assistant | Hold the side button, press A, or drag down from the island. Parses about 30 intents: timers, alarms, toggles, brightness, volume, media, messages, calls, notes, reminders, maths, weather, open/install apps, search, maps, translate. Speech input and spoken replies where the browser supports them | `assistant: timer…`, `…dark mode`, `…reminder`, `…maths` |
| On-screen awareness | Apps annotate views with `data-entity`; “what's on my screen” lists only what is visible | `screen context lists the visible notes` |
| Notification summary | Groups by app, names senders, extracts topic words and times | `summary groups by app, names people and topic` |
| Writing Tools (Notes) | Proofread, rewrite (friendly, professional, concise), summary, key points, make list | manual |
| Mail and Reader summaries | Extractive: sentences scored by word frequency | manual |
| Smart replies (Messages) | Rule-based suggestions keyed on the last incoming message | manual |

## Apps

Built in: Phone (keypad, recents, favourites, contacts, simulated calls), Messages (threads, tapbacks, photos, smart reply, auto replies), Mail (inbox, sent, trash, compose, summarize), Browser (address bar, favourites, reading list, history), Camera (photo, video, portrait, filters, zoom, front/back, QR scanning), Photos (library, favourites, videos, viewer with swipe, edit, share, set as wallpaper, import), Clock (world clock, alarms, stopwatch with laps, timers), Calendar (month view, events), Weather (live Open-Meteo forecast for any city or your location), Maps (OpenStreetMap, search, directions link), Notes (pinning, checklists, writing tools), Reminders (flags, completed), Music (five original, procedurally generated tracks), Calculator, Settings (about 20 pages), Store, Files (import, preview, download), Voice Memos (real microphone recording with waveform), Contacts, Video (camera self-view; calls simulated), Wallet (fictional demo cards), Health (activity rings, steps, water, sleep, mood; motion-sensor step counting on phones), Compass, Magnifier, Translate (offline phrasebook), Tips.

From the Store: Sketch, Tip Split, Units, Dice & Coin, Bubble Pop, Glow Worm, Memory Match, Breathe, Habits, Level, Focus Timer, Budget, Piano, Reader (live Wikipedia).

## What cannot be done, and why

| Request | Status |
|---|---|
| The Apple logo, Apple's icons, wallpapers, fonts, sounds | Not included. They are Apple's trademarks and copyrighted artwork. Glassline uses its own logo and artwork. |
| A pixel-identical copy of iOS | Not provided. The layout, gestures and motion follow the documented behaviour, but the look is Glassline's own. |
| Installing real App Store apps | Impossible. iPhone apps are signed ARM binaries for iOS and can't run in a browser or on a PC. On a Mac with Apple silicon, many iPhone apps run natively from the Mac App Store, and Xcode's Simulator runs real iOS. |
| Real cellular calls, SMS, video calls, payments | Simulated, and labelled as simulated in the UI. |
| Face ID | Simulated (unlock after wake). The optional passcode is a demo lock, not security. |
| Apple Intelligence / Siri language model | Replaced by local rules. The Foundation Models framework is only available on Apple devices. |
| iCloud, push notifications from real services | Not available. Data lives in your browser only. |
| Sites inside Browser | Many sites forbid being shown inside another page. Use ⤴/⧉ to open them in a real tab. |
