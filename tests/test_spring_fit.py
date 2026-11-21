"""Checks that the fitter recovers known springs, including from noisy 120 fps samples."""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
from spring_fit import fit, normalise, spring_curve  # noqa: E402


def _check(response, zeta, noise=0.0, fps=120, seconds=1.5):
    t = np.arange(0, seconds, 1 / fps)
    y = spring_curve(t, response, zeta)
    rng = np.random.default_rng(0)
    x = 200 + 300 * (y + rng.normal(0, noise, len(t)))  # pixels
    tn, yn = normalise(t, x)
    r = fit(tn, yn)
    assert abs(r.response - response) < 0.02, (r, response)
    assert abs(r.damping_fraction - zeta) < 0.04, (r, zeta)


def test_bouncy():
    _check(0.5, 0.6)


def test_critically_damped():
    _check(0.35, 1.0)


def test_overdamped():
    _check(0.4, 1.3, seconds=2.5)


def test_noisy_recording():
    _check(0.45, 0.8, noise=0.004)


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
