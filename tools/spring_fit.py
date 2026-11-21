#!/usr/bin/env python3
"""Fit a damped-spring model to a measured animation curve.

Reverse-engineering aid: record an iOS animation (screen recording at 60/120 fps),
track one element's position per frame (see track_video.py, or do it by hand),
and save a CSV with columns `t,x` (seconds, pixels). This script normalises the
curve so start=0 and resting value=1, then finds the spring that best explains it.

Output uses the same parameterisation as SwiftUI's `.spring(response:dampingFraction:)`
and the equivalent mass/stiffness/damping, so a fitted value can be dropped
straight into a SwiftUI, Core Animation or web recreation.

    python3 tools/spring_fit.py measured.csv
"""
from __future__ import annotations

import csv
import math
import sys
from dataclasses import dataclass

import numpy as np


@dataclass
class SpringFit:
    response: float          # seconds; period of the undamped oscillation
    damping_fraction: float  # zeta; 1.0 = critically damped
    initial_velocity: float  # in normalised units/second
    rmse: float              # fit error, in normalised units (0..1 scale)

    @property
    def stiffness(self) -> float:  # mass = 1
        return (2 * math.pi / self.response) ** 2

    @property
    def damping(self) -> float:
        return 4 * math.pi * self.damping_fraction / self.response

    def settle_time(self, epsilon: float = 0.001) -> float:
        w0 = 2 * math.pi / self.response
        return -math.log(epsilon) / (self.damping_fraction * w0)


def spring_curve(t: np.ndarray, response: float, zeta: float, v0: float = 0.0) -> np.ndarray:
    """Position of a unit-mass spring moving from 0 to 1 (closed form)."""
    w0 = 2 * math.pi / response
    d0 = -1.0  # displacement from the target at t=0
    if abs(zeta - 1.0) < 1e-6:
        disp = (d0 + (v0 + w0 * d0) * t) * np.exp(-w0 * t)
    elif zeta < 1.0:
        wd = w0 * math.sqrt(1 - zeta * zeta)
        a = d0
        b = (v0 + zeta * w0 * d0) / wd
        disp = np.exp(-zeta * w0 * t) * (a * np.cos(wd * t) + b * np.sin(wd * t))
    else:
        s = w0 * math.sqrt(zeta * zeta - 1)
        r1, r2 = -zeta * w0 + s, -zeta * w0 - s
        c2 = (v0 - r1 * d0) / (r2 - r1)
        c1 = d0 - c2
        disp = c1 * np.exp(r1 * t) + c2 * np.exp(r2 * t)
    return 1.0 + disp


def normalise(t: np.ndarray, x: np.ndarray, rest_tail: int = 5):
    t = t - t[0]
    start = x[0]
    rest = float(np.mean(x[-rest_tail:]))
    if abs(rest - start) < 1e-9:
        raise ValueError("start and resting positions are identical; nothing moved")
    return t, (x - start) / (rest - start)


def _rmse(t, y, r, z, v):
    return float(np.sqrt(np.mean((spring_curve(t, r, z, v) - y) ** 2)))


def fit(t: np.ndarray, y: np.ndarray, fit_velocity: bool = False) -> SpringFit:
    """Coarse grid search, then coordinate refinement. No SciPy needed."""
    best = (math.inf, 0.5, 1.0, 0.0)
    v_grid = np.linspace(-10, 10, 21) if fit_velocity else [0.0]
    for r in np.linspace(0.05, 2.0, 79):
        for z in np.linspace(0.05, 2.0, 79):
            for v in v_grid:
                e = _rmse(t, y, r, z, v)
                if e < best[0]:
                    best = (e, r, z, v)
    e, r, z, v = best
    step = [0.025, 0.025, 0.5 if fit_velocity else 0.0]
    for _ in range(60):
        improved = False
        for i in range(3):
            if step[i] == 0:
                continue
            for sign in (1, -1):
                cand = [r, z, v]
                cand[i] += sign * step[i]
                if cand[0] <= 0.01 or cand[1] <= 0.01:
                    continue
                ce = _rmse(t, y, *cand)
                if ce < e:
                    e, (r, z, v), improved = ce, cand, True
        if not improved:
            step = [s / 2 for s in step]
            if max(step) < 1e-5:
                break
    return SpringFit(r, z, v, e)


def load_csv(path: str):
    ts, xs = [], []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            ts.append(float(row["t"]))
            xs.append(float(row["x"]))
    return np.array(ts), np.array(xs)


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    t, x = load_csv(argv[1])
    t, y = normalise(t, x)
    result = fit(t, y, fit_velocity="--velocity" in argv)
    peak = float(np.max(y))
    print(f"samples             {len(t)} over {t[-1]:.3f}s")
    print(f"overshoot           {max(0.0, peak - 1) * 100:.1f}%")
    print(f"response            {result.response:.3f} s")
    print(f"dampingFraction     {result.damping_fraction:.3f}")
    print(f"initialVelocity     {result.initial_velocity:.3f}")
    print(f"stiffness (m=1)     {result.stiffness:.1f}")
    print(f"damping   (m=1)     {result.damping:.2f}")
    print(f"settle (0.1%)       {result.settle_time():.3f} s")
    print(f"fit RMSE            {result.rmse:.4f}")
    print(f"SwiftUI             .spring(response: {result.response:.3f}, dampingFraction: {result.damping_fraction:.3f})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
