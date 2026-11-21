#!/usr/bin/env python3
"""Track a UI element through a screen recording and write `t,x` / `t,y` CSV.

Feeds tools/spring_fit.py. Uses OpenCV template matching:

    pip install opencv-python-headless numpy
    python3 tools/track_video.py recording.mov --roi X Y W H --axis y > curve.csv

--roi is the element's bounding box (pixels) in the first frame. Record on device with
Settings > Control Center > Screen Recording; ProMotion devices record at up to 120 fps,
which is what you want for animation curves. Trim the clip so it starts on the frame
where your finger lifts.
"""
import argparse
import sys

try:
    import cv2
except ImportError:  # pragma: no cover
    sys.exit("OpenCV missing: pip install opencv-python-headless")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--roi", nargs=4, type=int, required=True, metavar=("X", "Y", "W", "H"))
    ap.add_argument("--axis", choices=["x", "y", "scale"], default="y")
    args = ap.parse_args()

    cap = cv2.VideoCapture(args.video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 60.0
    ok, frame = cap.read()
    if not ok:
        sys.exit("could not read video")
    x, y, w, h = args.roi
    template = cv2.cvtColor(frame[y:y + h, x:x + w], cv2.COLOR_BGR2GRAY)
    print(f"t,x")
    i = 0
    while ok:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if args.axis == "scale":
            best = (-1, 1.0)
            for s in [0.2 + 0.02 * k for k in range(60)]:
                tw, th = int(w * s), int(h * s)
                if tw < 4 or th < 4 or tw > gray.shape[1] or th > gray.shape[0]:
                    continue
                res = cv2.matchTemplate(gray, cv2.resize(template, (tw, th)), cv2.TM_CCOEFF_NORMED)
                score = res.max()
                if score > best[0]:
                    best = (score, s)
            value = best[1]
        else:
            res = cv2.matchTemplate(gray, template, cv2.TM_CCOEFF_NORMED)
            _, _, _, loc = cv2.minMaxLoc(res)
            value = loc[0] if args.axis == "x" else loc[1]
        print(f"{i / fps:.5f},{value}")
        ok, frame = cap.read()
        i += 1


if __name__ == "__main__":
    main()
