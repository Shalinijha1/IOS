# Glassline

Behavioural reverse engineering of iOS 27 interaction patterns, plus original web recreations built from those findings.

## Glassline OS: a phone OS that runs in your browser (`phone/`)

A full iOS-style phone shell with a boot screen, lock screen, Home Screen, widgets, App Library, Control Centre, notifications, app switcher, island live activities, search, an assistant, a Store and 40 working apps. See [`phone/FEATURES.md`](phone/FEATURES.md) for every feature, how it works, the test that verifies it, and what can't be done in a browser.

**Run it on your computer** (needs Python 3, which is preinstalled on macOS and Linux; on Windows install it from python.org):

| System | Do this |
|---|---|
| macOS | Double-click `phone/start.command` (first time: right-click, Open) |
| Windows | Double-click `phone/start.bat` |
| Linux | `./phone/start.sh` |

Your browser opens at http://localhost:8080. Opening `phone/index.html` directly also works, but the camera, microphone and offline mode need the local server. On a phone, open the same address over your Wi-Fi network to run it full screen, and use “Add to Home Screen”.

Controls: swipe up from the bottom bar to go home (pause for the app switcher). Pull down from the top left for notifications and from the top right for Control Centre. Swipe down on the Home Screen to search, and press and hold an icon to edit. Keys: H home, L lock, S switcher, A assistant, / search, C Control Centre, N notifications.

## Motion lab and evidence (`prototype/`, `EVIDENCE.md`, `SEARCH.md`)

- `EVIDENCE.md`: every claim, graded by source (A = Apple developer docs quoted … D = community or own choice), with how to verify it on a device.
- `prototype/index.html`: interactive recreation with instruments (gesture readouts, live spring curve, CSV export, tuning) and the evidence ledger.
- `SEARCH.md` and `prototype/search-engine.js`: how iOS 27 search works (graded evidence) and a hybrid keyword, meaning and typo search engine modelled on it. Glassline OS uses the same engine.
- `tools/spring_fit.py`: fits `response` / `dampingFraction` to a measured curve (numpy only).
- `tools/track_video.py`: tracks an element through a screen recording to produce that curve (OpenCV).

## Tests

`python3 tests/test_spring_fit.py`, `node tests/search.test.js`, `node tests/e2e.js` (motion lab) and `node tests/phone.e2e.js` (Glassline OS: 38 checks driving real pointer gestures in Chromium; screenshots go to `docs/screens/phone-*.png`).

Not affiliated with Apple. No Apple code, logos, icons, fonts, sounds, wallpapers or binaries are used. Nothing was observed on an iOS 27 device in this pass; see the limits section in `EVIDENCE.md`.
