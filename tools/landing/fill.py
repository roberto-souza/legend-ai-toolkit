# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow", "scipy"]
# ///
"""Give a line-art layer an opaque body, so stacked layers hide what is behind them.

Why: a transparent line layer stacked over another shows the lines underneath. Filling the closed silhouette with
the page colour gives the drawing a body without changing its lines.

Usage: uv run fill.py <layer.png> <out.png> --bg <#rrggbb>
--bg is required: the page colour is the project's, never a default.
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ALPHA_FLOOR = 16
CLOSE_ITERATIONS = 3
OPEN_ITERATIONS = 1
SOFTEN_SIGMA = 0.8


class Parser(argparse.ArgumentParser):
    """Usage errors exit 1, like the toolkit scripts (argparse alone exits 2)."""

    def error(self, message):
        self.print_usage(sys.stderr)
        self.exit(1, f"{self.prog}: error: {message}\n")


def parse_hex(value: str) -> np.ndarray:
    text = value.lstrip("#")
    if len(text) != 6:
        raise argparse.ArgumentTypeError(f"expected a colour as rrggbb, got {value!r}")
    try:
        return np.array([int(text[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)
    except ValueError as error:
        raise argparse.ArgumentTypeError(f"expected a colour as rrggbb, got {value!r}") from error


def body_mask(alpha: np.ndarray) -> np.ndarray:
    """Close the gaps in the lines, fill the holes, open away the specks and soften the edge (0..1)."""
    lines = alpha > ALPHA_FLOOR
    closed = ndimage.binary_closing(lines, iterations=CLOSE_ITERATIONS)
    filled = ndimage.binary_fill_holes(closed)
    opened = ndimage.binary_opening(filled, iterations=OPEN_ITERATIONS)
    return np.clip(ndimage.gaussian_filter(opened.astype(np.float64), SOFTEN_SIGMA), 0, 1)


def main() -> int:
    parser = Parser(description="Give a line-art layer an opaque body in the page colour.")
    parser.add_argument("layer", type=Path, help="RGBA line layer (for example the -light.png of ink.py)")
    parser.add_argument("out", type=Path, help="output PNG")
    parser.add_argument("--bg", type=parse_hex, required=True, help="page colour that fills the silhouette")
    args = parser.parse_args()

    if not args.layer.is_file():
        parser.error(f"layer not found: {args.layer}")
    rgba = np.asarray(Image.open(args.layer).convert("RGBA"), dtype=np.float64)
    colour, alpha = rgba[..., :3], rgba[..., 3]
    body = body_mask(alpha)

    line = alpha / 255
    out_alpha = np.maximum(line, body)
    # Lines over the body: composite the ink colour over the page colour inside the silhouette.
    safe = np.where(out_alpha > 0, out_alpha, 1)[..., None]
    blended = (colour * line[..., None] + args.bg * (body * (1 - line))[..., None]) / safe
    out = np.dstack([np.clip(blended, 0, 255), out_alpha * 255]).round().astype(np.uint8)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGBA").save(args.out)
    print(f"{args.out.name}\t{out.shape[1]}x{out.shape[0]}\tbody {int(body.round().sum())} px")
    return 0


if __name__ == "__main__":
    sys.exit(main())
