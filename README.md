# Glassline Motion Lab

Behavioural reverse engineering of iOS 27 interaction patterns, with an original web recreation and tools to measure a real device.

- `EVIDENCE.md`: every claim, graded by source (A = Apple developer docs quoted … D = community or own choice), with how to verify it on a device.
- `prototype/index.html`: interactive recreation, with instruments (gesture readouts, live spring curve, CSV export, tuning) and the evidence ledger.
- `SEARCH.md` and `prototype/search-engine.js`: how iOS 27 search works (graded evidence) and a hybrid keyword, meaning and typo search engine modelled on it.
- `tools/spring_fit.py`: fits `response` / `dampingFraction` to a measured curve (numpy only).
- `tools/track_video.py`: tracks an element through a screen recording to produce that curve (OpenCV).
- `tests/`: `python3 tests/test_spring_fit.py`, `node tests/search.test.js` and `node tests/e2e.js` (Playwright with Chromium). The e2e run drives real pointer gestures and writes screenshots to `docs/screens/`.

Not affiliated with Apple. No Apple code, assets or binaries are used. Nothing was observed on an iOS 27 device in this pass; see the limits section in `EVIDENCE.md`.
