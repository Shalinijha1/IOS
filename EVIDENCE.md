# iOS 27 behavioural evidence dossier

Method: black-box behavioural reverse engineering. Observe what the system does, collect public statements about it, model it, rebuild the model, then compare the rebuild against measurements. No Apple binaries were disassembled and no Apple code or assets were used.

**Limits of this pass (read first)**

- No iOS 27 device or simulator was available (this was a Linux cloud container, with no Mac attached). Nothing below was observed first-hand on iOS 27.
- `developer.apple.com` pages were fetched and quoted. `apple.com`, `support.apple.com` and press sites did not resolve from this environment, so those claims come from search-result summaries only (grade B).
- The measurement pipeline (`tools/`) is tested against synthetic data and against the prototype's own animations. Device measurements are the next step; see "Verifying on a device".

## Grades

| Grade | Meaning |
|---|---|
| A | Apple developer documentation, fetched and quoted (WWDC26 guides) |
| B | Reported in search results; the source page could not be fetched here |
| C | Public Apple API or WWDC session from an earlier release; assumed still to hold |
| D | Community reverse engineering, or a design choice made for this prototype |

## Findings

### Interface and design language
| Claim | Grade | Evidence |
|---|---|---|
| Refreshed materials, refined typography, updated tab and navigation bars | A | "Refreshed materials, refined typography, and updated tab and navigation bars unify Apple platforms while letting your app keep its identity." ([WWDC26 iOS guide](https://developer.apple.com/wwdc26/guides/ios/)) |
| Glass material adjustable from "ultraclear to fully tinted" with a slider | B | Search summary of [apple.com/os/ios](https://www.apple.com/os/ios/) |
| SwiftUI apps pick up the updated glass appearance automatically | B | Third-party write-up ([dev.to](https://dev.to/arshtechpro/wwdc26-whats-new-in-swiftui-a-developers-breakdown-1333)) |
| iPhone apps become resizable; UIKit adds layouts for iPhone Mirroring | A/B | UIKit layouts for iPhone Mirroring: A ([iOS guide](https://developer.apple.com/wwdc26/guides/ios/)). Resizable iPhone apps: B (search summary) |

### Navigation and toolbars
| Claim | Grade | Evidence |
|---|---|---|
| `toolbarMinimizeBehavior` collapses the navigation bar while scrolling | A | [SwiftUI guide](https://developer.apple.com/wwdc26/guides/swiftui/) |
| `visibilityPriority`, `toolbarOverflowMenu`, `topBarPinnedTrailing` control toolbar items as the app resizes | A | [SwiftUI guide](https://developer.apple.com/wwdc26/guides/swiftui/) |
| Drag to reorder in any container; `swipeActionsContainer` on `ScrollView` | A | [SwiftUI guide](https://developer.apple.com/wwdc26/guides/swiftui/) |
| Interactive edge-swipe back with the underlying page moving at about 30% | D | Long-standing observed behaviour; the ratio is an approximation |

### Animation and gestures
| Claim | Grade | Evidence |
|---|---|---|
| Animations, scrolling and system interactions refined for responsiveness | B | Search summary; outlet not isolated |
| Siri animation moves into the Dynamic Island instead of lighting the screen edges | B | Search summary; related headline at [The Apple Post](https://www.theapplepost.com/2026/06/08/70870/ios-27-introduces-new-siri-animation-and-swipe-to-ask-gesture/) |
| New "swipe-to-ask" gesture for Siri | B | Headline only. **The direction and starting zone are not confirmed.** |
| Gestures decide on the projected end point: `v/1000 · r/(1−r)`, r = 0.998 | C | [WWDC18 session 803](https://developer.apple.com/videos/play/wwdc2018/803/), [`UIScrollView.DecelerationRate`](https://developer.apple.com/documentation/uikit/uiscrollview/decelerationrate) |
| Motion is described by springs (`response`, `dampingFraction`) | C | [SwiftUI `spring(response:dampingFraction:)`](https://developer.apple.com/documentation/swiftui/animation/spring(response:dampingfraction:blendduration:)) |
| Rubber-band resistance `(1 − 1/(0.55·x/d + 1))·d` | D | Community reverse engineering of UIScrollView |
| Reduce Motion swaps zooms for cross-fades | C | Long-standing accessibility behaviour; not re-checked on iOS 27 |

### System interactions and intelligence
| Claim | Grade | Evidence |
|---|---|---|
| Siri reaches app content and actions through App Intents, in natural language | A | [iOS guide](https://developer.apple.com/wwdc26/guides/ios/) |
| View Annotations API maps views to entities so people can act on what's on screen | A | [iOS guide](https://developer.apple.com/wwdc26/guides/ios/) |
| Entity schemas feed the Spotlight semantic index | A | [iOS guide](https://developer.apple.com/wwdc26/guides/ios/) |
| Foundation Models framework exposes the on-device Apple Intelligence model | A | [iOS guide](https://developer.apple.com/wwdc26/guides/ios/) |
| NowPlaying framework drives Lock Screen, Control Center, Dynamic Island, CarPlay | A | [iOS guide](https://developer.apple.com/wwdc26/guides/ios/) |
| Photos can reframe, extend borders and remove objects; Home summarises camera activity | B | Search summaries ([MacRumors roundup](https://www.macrumors.com/roundup/ios-27/), [Macworld](https://www.macworld.com/article/2986799/ios-27-features-compatiblity-siri-ai-updates.html)) |
| Siri AI needs iPhone 15 Pro or newer; not available in China, delayed in the EU | B | Search summaries |

## What the recreation does (`prototype/index.html`)

| Feature | Mechanism | Test |
|---|---|---|
| App launch and dismissal | Window rect interpolated from icon to full screen by a spring (default 0.50 s, ζ 0.86); dismiss inherits finger velocity | `fitter recovers the lab's own launch spring` |
| Home gesture | Window follows finger; release projects velocity. A rest before lifting opens the switcher, a projected end above 30% of the height goes home, anything else springs back | `fast short flick goes home`, `slow drag and pause opens switcher` |
| App switcher | Cards; swipe a card up (projected) to close it, tap to reopen it from its own rect | `card swipe closes app`, `tapping card reopens app` |
| Navigation stack | Push and pop springs, interactive edge swipe with 30% parallax and dimming, projected release | `edge swipe pops back`, `short slow edge drag stays on detail` |
| Collapsing chrome | Large title shrinks into the nav bar; tab bar minimizes on scroll down, restores on scroll up | `tab bar minimizes on scroll down` |
| Glass material | One `--glass` value drives tint and blur on every glass surface | `SetGlassIntent changes material` |
| Control panel | Pull down from top edge, rubber band past full, projected release | `pull-down opens panel…` |
| Assistant in the pill | Drag down on the pill or press and hold; pill springs into a prompt with an internal glow | `swipe down on pill opens assistant` |
| Intents | Typed registry matched against text: OpenApp, GoHome, SetGlass, SetAppearance, Summarize, ScreenContext | `SetAppearanceIntent…` |
| On-screen awareness | `data-entity` annotations; only currently visible entities are returned | `screen context…` (2 tests) |
| Notification summary | Deterministic heuristic, not a language model: group by app, rank by time and quantity mentions | `summary groups and ranks` |

## Verifying on a device

1. Record the interaction with screen recording (ProMotion devices record at up to 120 fps). Trim the clip so it starts where the finger lifts.
2. Track the element: `python3 tools/track_video.py clip.mov --roi X Y W H --axis y > curve.csv` (needs `opencv-python-headless`).
3. Fit: `python3 tools/spring_fit.py curve.csv` prints response, damping fraction, overshoot, settle time and a SwiftUI line.
4. Enter the fitted values in the lab's Tuning panel and compare the curves.
5. For each grade-B row, record a clip that shows the behaviour, then upgrade the row to "observed" with the clip as evidence.
