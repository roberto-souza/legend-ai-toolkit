# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
"""Embed the images of a single-file prototype as WebP data URIs.

Why: the prototype travels as one HTML file. Each {{img:<name>}} or {{img:<name>|<alt>}} marker becomes an <img>
with the image inlined, its size and lazy loading; a missing alt means a decorative image (alt="").

Usage: uv run embed.py <src.html> <assets-dir> <out.html> [--max-height <name>=<px> ...]
Exits 1 when an image is missing or a {{ marker is left in the output.
"""
import argparse
import base64
import html
import io
import re
import sys
from pathlib import Path

from PIL import Image

MARKER = re.compile(r"\{\{img:([^|}]+)(?:\|([^}]*))?\}\}")
EXTENSIONS = (".webp", ".png", ".jpg")
QUALITY = 86


class Parser(argparse.ArgumentParser):
    """Usage errors exit 1, like the toolkit scripts (argparse alone exits 2)."""

    def error(self, message):
        self.print_usage(sys.stderr)
        self.exit(1, f"{self.prog}: error: {message}\n")


def parse_max_height(values: list[str]) -> dict[str, int]:
    limits = {}
    for value in values:
        name, sep, px = value.partition("=")
        if not sep or not px.isdigit() or int(px) <= 0:
            raise SystemExit(f"error: --max-height expects <name>=<px>, got {value!r}")
        limits[name] = int(px)
    return limits


def find_asset(assets: Path, name: str) -> Path | None:
    return next((assets / f"{name}{ext}" for ext in EXTENSIONS if (assets / f"{name}{ext}").is_file()), None)


def to_img(path: Path, alt: str, max_height: int | None) -> str:
    image = Image.open(path)
    image = image.convert("RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB")
    if max_height and image.height > max_height:
        width = round(image.width * max_height / image.height)
        image = image.resize((width, max_height), Image.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, "WEBP", quality=QUALITY)
    data = base64.b64encode(buffer.getvalue()).decode("ascii")
    return (f'<img src="data:image/webp;base64,{data}" width="{image.width}" height="{image.height}" '
            f'loading="lazy" decoding="async" alt="{html.escape(alt, quote=True)}">')


def main() -> int:
    parser = Parser(description="Embed {{img:<name>}} markers of an HTML file as WebP data URIs.")
    parser.add_argument("src", type=Path, help="HTML with {{img:<name>}} or {{img:<name>|<alt>}} markers")
    parser.add_argument("assets", type=Path, help="folder with <name>.webp, .png or .jpg")
    parser.add_argument("out", type=Path, help="output HTML")
    parser.add_argument("--max-height", action="append", default=[], metavar="NAME=PX",
                        help="downscale the named image to this height; repeatable")
    args = parser.parse_args()

    if not args.src.is_file():
        parser.error(f"source not found: {args.src}")
    limits = parse_max_height(args.max_height)
    missing = []

    def replace(match: re.Match) -> str:
        name, alt = match.group(1).strip(), (match.group(2) or "").strip()
        path = find_asset(args.assets, name)
        if path is None:
            missing.append(name)
            return match.group(0)
        return to_img(path, alt, limits.get(name))

    result = MARKER.sub(replace, args.src.read_text(encoding="utf-8"))
    if missing:
        print(f"error: image not found in {args.assets}: {', '.join(sorted(set(missing)))}", file=sys.stderr)
        return 1
    if "{{" in result:
        print("error: a {{ marker is left in the output", file=sys.stderr)
        return 1
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(result, encoding="utf-8")
    print(f"{args.out.name}\t{args.out.stat().st_size} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
