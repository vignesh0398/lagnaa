"""Process bee logo: transparent background + lighter panel so the bee reads clearly."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INPUT_CANDIDATES = [
    ROOT / "src" / "assets" / "lagnaa-logo.png",
    Path(r"C:\Users\viki\Downloads\Media (23).jfif"),
]
OUT_ASSETS = ROOT / "src" / "assets" / "lagnaa-logo.png"
OUT_PUBLIC = ROOT / "public" / "lagnaa-logo.png"


def is_yellow_orange(r: int, g: int, b: int) -> bool:
    return r > 130 and g > 85 and b < 140 and r >= g


def is_light(r: int, g: int, b: int) -> bool:
    return min(r, g, b) > 175


def is_background(r: int, g: int, b: int) -> bool:
    return max(r, g, b) < 22


def lighten_panel(r: int, g: int, b: int) -> tuple[int, int, int]:
    """Lift dark navy panel toward warm charcoal-gold (bee stripes stay darker)."""
    strength = max(0, 70 - max(r, g, b))
    nr = min(255, r + strength + 18)
    ng = min(255, g + strength + 12)
    nb = min(255, b + max(0, strength - 8))
    return nr, ng, nb


def process(src: Path, dest: Path) -> None:
    img = Image.open(src).convert("RGBA")
    px = img.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]

            if is_background(r, g, b):
                px[x, y] = (r, g, b, 0)
                continue

            if is_yellow_orange(r, g, b) or is_light(r, g, b):
                px[x, y] = (r, g, b, 255)
                continue

            if max(r, g, b) < 95:
                r, g, b = lighten_panel(r, g, b)

            px[x, y] = (r, g, b, 255)

    bbox = img.getbbox()
    if bbox:
        pad = 8
        left = max(0, bbox[0] - pad)
        top = max(0, bbox[1] - pad)
        right = min(w, bbox[2] + pad)
        bottom = min(h, bbox[3] + pad)
        img = img.crop((left, top, right, bottom))

    # Reasonable web size
    if max(img.size) > 640:
        img.thumbnail((640, 640), Image.Resampling.LANCZOS)

    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG", optimize=True)
    print(f"Wrote {dest} ({img.width}x{img.height})")


def main() -> None:
    src = next((p for p in INPUT_CANDIDATES if p.exists()), None)
    if not src:
        raise SystemExit("No logo source found")

    process(src, OUT_ASSETS)
    process(src, OUT_PUBLIC)


if __name__ == "__main__":
    main()