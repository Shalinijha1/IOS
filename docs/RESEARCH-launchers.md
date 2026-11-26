# iOS-style launchers on Google Play: research (26 Nov 2026)

Source: the Google Play listings themselves (US store, English), fetched on 26 Nov 2026. Feature columns mark whether the listing's description or "What's new" mentions the feature; a missing mark means the listing doesn't mention it, not that the app lacks it. Nothing from these apps (code, artwork, text) is used in Glassline.

## The app you asked about: OS 27 Launcher : Golden Gate

- Package `com.ios.launcher.iphone.ios27`, by True Global Labs. Version 1.2.8, updated 25 Nov 2026.
- 1M+ downloads, 4.5 stars from 35.1K reviews (US store). Your screenshot of the Indian store showed 10L+ downloads and 4.1 stars from 551 reviews.
- Contains ads and in-app purchases.
- Listed features: Liquid Glass styling, weather with animated backgrounds, widgets (weather, clock, battery, calendar), App Library with automatic categories, swipe-down search, a wallpaper collection, dark mode and hidden apps.
- Data safety section: collects installed apps, app activity, crash logs and device or other IDs (for analytics and advertising). It says data can't be deleted on request.
- The listing says its code, design and graphics are copyright-protected and must not be copied.
- REA couldn't inspect its APK: the only download mirrors sit behind bot protection, which REA's rules forbid bypassing.

## The wider market

| App | Downloads | Rating | Ads | IAP | Control Centre | Widgets | App Library | Search | Wallpapers | Icon packs | Glass look | Weather | Hide apps | Lock screen | Island |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Launcher OS™ | 100M+ | 4.4 | ✓ | ✓ |  |  |  | ✓ | ✓ |  | ✓ |  |  | ✓ |  |
| Launcher OS | 10M+ | 4.7 | ✓ |  | ✓ | ✓ | ✓ |  |  |  | ✓ | ✓ |  |  |  |
| Glass Launcher | 10M+ | 4.7 | ✓ |  | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ |  |  |  |
| dynamicSpot (island) | 10M+ | 4.4 | ✓ | ✓ |  |  |  |  |  |  |  |  |  | ✓ | ✓ |
| OS 27 Launcher : Golden Gate | 1M+ | 4.5 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| Launcher OS - Liquid Glass | 1M+ | 4.1 | ✓ | ✓ |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| Liquid OS 27: Smart Launcher | 1M+ | 4.3 | ✓ |  |  | ✓ |  |  | ✓ | ✓ |  | ✓ |  |  |  |
| Control Center OS 26 Style | 1M+ | 3.2 | ✓ | ✓ | ✓ |  |  |  | ✓ |  | ✓ |  |  |  |  |
| Liquid OS 27: Glass Launcher | 5K+ | 5.0 |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Glassline OS** | — | — | **no** | **no** | ✓ | ✓ (incl. Smart Stack) | ✓ | ✓ | ✓ (painted) | ✓ | ✓ | ✓ (animated) | ✓ (with Face Unlock) | ✓ | ✓ (inside Glassline) |

## How they work (Android mechanisms)

- **Home Screen:** the app registers as Android's Home app (launcher).
- **Control Centre / notifications over other apps:** "Display over other apps" (`SYSTEM_ALERT_WINDOW`), and often the Accessibility API. Google Play restricts Accessibility to disability tools ([policy](https://support.google.com/googleplay/android-developer/answer/10964491?hl=en)), so Glassline uses only the overlay permission for its edge swipes.
- **Dynamic Island apps:** overlay windows fed by notification access, usually through Accessibility.
- **Icon theming:** reshape icons, or apply ADW/Nova-format icon packs (`appfilter.xml`).

## What Glassline added after this research

- Hide Apps with Face Unlock or passcode, a Hidden folder in the App Library, and notifications without previews. This matches Golden Gate's "hide confidential applications".
- Smart Stack widget: one tile, swipe between Weather, Calendar, Reminders, Batteries and Music. It opens on whichever suits the time of day.
- Animated weather backgrounds: rain, snow, storm flashes, drifting clouds, sun rays, twinkling stars and fog.
- An APK check: no ad or analytics code is present (`dexdump` class scan), and REA's signature inspection recorded the APK's fingerprint.
