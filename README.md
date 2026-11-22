# Glassline

Behavioural reverse engineering of iOS 27 interaction patterns, plus original web recreations built from those findings.

## Glassline OS for Android: turn your phone's Home Screen into Glassline

`releases/GlasslineOS-android-27.0.0.apk` is an Android Home app (launcher). Once it's your Home app, your phone shows the Glassline interface with **your real Android apps** on its Home Screen.

1. On the Android phone, open this repository on GitHub (sign in if it's private), go to `releases/`, tap the APK and choose **Download**.
2. Open the downloaded file. Android asks to allow installs from your browser or file manager: allow it once, then tap **Install**. The APK isn't from Google Play, so Play Protect may warn you; it's built from the code in `android/` and `phone/`.
3. Open **Glassline OS**, swipe up, and tap **Use Glassline as Home Screen**, then pick it as the Home app. Tap **Show my app notifications** to allow notification access.
4. Press Home: you're in Glassline. To go back to your old launcher, choose it again in Android Settings › Apps › Default apps › Home app, or uninstall Glassline.

What you get: every installed app as an icon that opens the real app, with the dock holding your default phone, messages, browser and camera apps. Apps you install or remove elsewhere appear and disappear automatically, and Delete App and App Info use Android's own screens. It also has the lock screen, Control Centre (real flashlight and volume; Wi-Fi, Bluetooth, mobile data and Airplane Mode open Android's panels), your apps' notifications as banners and in Notification Centre, search across your apps, the assistant, widgets and Glassline's own apps. Android's Back gesture closes whatever is open in Glassline.

Limits: Android, not iOS, still runs underneath, so the phone's own settings, the system lock (PIN or fingerprint) and app screens stay Android's. Apps from Apple's App Store can't run on Android; the Store opens Google Play for real apps. Every push rebuilds the APK in GitHub Actions (`.github/workflows/android.yml`). To build it yourself, run `cd android && gradle assembleRelease`, which needs the Android SDK. The APK is signed with the standard debug key, so sign it with your own key before publishing it anywhere.

## Glassline OS: a phone OS that runs in your browser (`phone/`)

A full iOS-style phone shell with a boot screen, lock screen, Home Screen, widgets, App Library, Control Centre, notifications, app switcher, island live activities, search, an assistant, a Store and 40 working apps. Visual tokens (colour, type scale, radii, press feedback) follow `phone/DESIGN.md`, the Apple-inspired guide from [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (MIT); logo, icons and artwork remain Glassline's own. See [`phone/FEATURES.md`](phone/FEATURES.md) for every feature, how it works, the test that verifies it, and what can't be done in a browser.

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

`python3 tests/test_spring_fit.py`, `node tests/search.test.js`, `node tests/e2e.js` (motion lab) , `node tests/phone.e2e.js` (Glassline OS: gestures driven with real pointer events in Chromium; screenshots go to `docs/screens/phone-*.png`) and `node tests/android.e2e.js` (the Android app's Home Screen, launching, uninstall, Control Centre, notifications, Back and lock, at 412×915 with a simulated Android bridge; screenshots go to `docs/screens/android-*.png`).

Not affiliated with Apple. No Apple code, logos, icons, fonts, sounds, wallpapers or binaries are used. Nothing was observed on an iOS 27 device in this pass; see the limits section in `EVIDENCE.md`.
