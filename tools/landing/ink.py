# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow"]
# ///
"""Split a line illustration from its flat background into a transparent ink layer.

Why: illustrations arrive as ink over a flat colour; the page needs the ink alone, so it sits on any background.
The alpha is the distance to the background colour, and the ink colour is recovered from that alpha.

Usage: uv run ink.py <src> <outdir> [--max-width 1600] [--bg <#rrggbb>] [--dark-ink <#rrggbb>]
Writes <name>-light.png and, with --dark-ink, <name>-dark.png.
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

NOISE_FLOOR = 0.06
DARK_MIX = 0.20


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


def corner_background(rgb: np.ndarray) -> np.ndarray:
    corners = np.stack([rgb[0, 0], rgb[0, -1], rgb[-1, 0], rgb[-1, -1]])
    return np.median(corners, axis=0)


def ink_layer(rgb: np.ndarray, bg: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Alpha from the distance to the background; colour un-mixed from the background by that alpha."""
    distance = np.linalg.norm(rgb - bg, axis=2)
    farthest = np.linalg.norm(np.maximum(bg, 255 - bg))
    alpha = np.clip((distance / farthest - NOISE_FLOOR) / (1 - NOISE_FLOOR), 0, 1)
    # The smallest alpha that can rebuild each channel; below it the un-mix clips and coloured ink loses colour.
    room = np.where(rgb < bg, bg, 255 - bg)
    needed = (np.abs(rgb - bg) / np.where(room > 0, room, 1)).max(axis=2)
    alpha = np.where(alpha > 0, np.maximum(alpha, needed), 0)
    safe = np.where(alpha > 0, alpha, 1)[..., None]
    colour = np.clip((rgb - bg * (1 - alpha[..., None])) / safe, 0, 255)
    return colour, alpha


def to_image(colour: np.ndarray, alpha: np.ndarray) -> Image.Image:
    rgba = np.dstack([colour, alpha * 255]).round().astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def dark_variant(colour: np.ndarray, dark_ink: np.ndarray) -> np.ndarray:
    """Neutral dark ink turns into the given colour; coloured ink keeps its hue, mixed 20% towards it."""
    spread = colour.max(axis=2) - colour.min(axis=2)
    neutral_dark = (spread < 24) & (colour.mean(axis=2) < 96)
    mixed = colour * (1 - DARK_MIX) + dark_ink * DARK_MIX
    return np.where(neutral_dark[..., None], dark_ink, mixed)


def main() -> int:
    parser = Parser(description="Split a line illustration from its flat background.")
    parser.add_argument("src", type=Path, help="illustration over a flat background")
    parser.add_argument("outdir", type=Path, help="where <name>-light.png (and -dark.png) go")
    parser.add_argument("--max-width", type=int, default=1600, help="downscale above this width (default 1600)")
    parser.add_argument("--bg", type=parse_hex, help="background colour; default: median of the four corners")
    parser.add_argument("--dark-ink", type=parse_hex, help="also write <name>-dark.png with neutral ink in this colour")
    args = parser.parse_args()

    if not args.src.is_file():
        parser.error(f"source not found: {args.src}")
    if args.max_width <= 0:
        parser.error("--max-width must be a positive integer")
    image = Image.open(args.src).convert("RGB")
    if image.width > args.max_width:
        height = round(image.height * args.max_width / image.width)
        image = image.resize((args.max_width, height), Image.LANCZOS)
    rgb = np.asarray(image, dtype=np.float64)
    bg = args.bg if args.bg is not None else corner_background(rgb)
    colour, alpha = ink_layer(rgb, bg)

    args.outdir.mkdir(parents=True, exist_ok=True)
    stem = args.src.stem
    outputs = [(args.outdir / f"{stem}-light.png", colour)]
    if args.dark_ink is not None:
        outputs.append((args.outdir / f"{stem}-dark.png", dark_variant(colour, args.dark_ink)))
    hex_bg = "#" + "".join(f"{int(round(c)):02x}" for c in bg)
    for path, layer in outputs:
        to_image(layer, alpha).save(path)
        print(f"{path.name}\t{image.width}x{image.height}\tbackground {hex_bg}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
