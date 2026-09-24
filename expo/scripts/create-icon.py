#!/usr/bin/env python3
"""Create a square AutiNote app icon from the supplied JPEG.

Requires Pillow. Run from the workspace root, for example:
    python3 expo/scripts/create-icon.py \
        attached_assets/IMG_7715_1790221284853.jpeg icon.png \
        --app-icon expo/assets/images/icon.png
"""

import argparse
from collections import Counter
from pathlib import Path

from PIL import Image, ImageOps


SIZE = 1024
PADDING = 0.15
EDGE_FEATHER = 24


def edge_cream(image: Image.Image) -> tuple[int, int, int]:
    """Choose an RGB color that occurs in the image's quiet corner edges."""
    width, height = image.size
    corner_width = max(1, round(width * 0.08))
    corner_height = max(1, round(height * 0.08))
    corners = (
        (0, 0),
        (width - corner_width, 0),
        (0, height - corner_height),
        (width - corner_width, height - corner_height),
    )
    colors: Counter[tuple[int, int, int]] = Counter()
    pixels = image.load()
    for start_x, start_y in corners:
        for y in range(start_y, start_y + corner_height):
            for x in range(start_x, start_x + corner_width):
                colors[pixels[x, y]] += 1
    return colors.most_common(1)[0][0]


def feather_mask(width: int, height: int) -> Image.Image:
    """Blend the JPEG's slightly varying edge into the sampled solid cream."""
    mask = Image.new("L", (width, height))
    mask.putdata(
        [
            round(255 * min(1, min(x, y, width - 1 - x, height - 1 - y) / EDGE_FEATHER))
            for y in range(height)
            for x in range(width)
        ]
    )
    return mask


def make_icon(source_path: Path) -> tuple[Image.Image, tuple[int, int, int], tuple[int, int]]:
    with Image.open(source_path) as original:
        source = ImageOps.exif_transpose(original).convert("RGB")

    cream = edge_cream(source)
    inset_size = round(SIZE * (1 - 2 * PADDING))
    centered = ImageOps.contain(source, (inset_size, inset_size), Image.Resampling.LANCZOS)
    offset = ((SIZE - centered.width) // 2, (SIZE - centered.height) // 2)

    icon = Image.new("RGB", (SIZE, SIZE), cream)
    icon.paste(centered, offset, feather_mask(*centered.size))
    return icon, cream, centered.size


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Original JPEG")
    parser.add_argument("output", type=Path, help="Square PNG to create")
    parser.add_argument("--app-icon", type=Path, help="Also update the Expo app icon")
    args = parser.parse_args()

    icon, cream, resized_size = make_icon(args.source)
    for destination in (args.output, args.app_icon):
        if destination is not None:
            destination.parent.mkdir(parents=True, exist_ok=True)
            icon.save(destination, format="PNG", optimize=True)
            print(f"Saved {destination}")
    print(
        f"1024x1024, center image {resized_size[0]}x{resized_size[1]}, "
        f"sampled edge cream #{cream[0]:02X}{cream[1]:02X}{cream[2]:02X}"
    )


if __name__ == "__main__":
    main()