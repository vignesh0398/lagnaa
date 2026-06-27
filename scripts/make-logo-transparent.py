"""Remove white/light background from the Lagnaa logo source image."""
from PIL import Image

INPUT = "src/assets/lagnaa-logo-source.jpg"
OUTPUT = "src/assets/lagnaa-logo.png"
PUBLIC_OUTPUT = "public/lagnaa-logo.png"


def whiteness(r: int, g: int, b: int) -> float:
    return min(r, g, b) / 255.0


def alpha_for_pixel(r: int, g: int, b: int) -> int:
    w = whiteness(r, g, b)
    # Fully transparent for near-white pixels
    if w >= 0.94:
        return 0
    # Feather soft anti-aliased edges
    if w >= 0.82:
        return int(255 * (0.94 - w) / 0.12)
    return 255


def process(path_in: str, path_out: str) -> None:
    img = Image.open(path_in).convert("RGBA")
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, alpha_for_pixel(r, g, b))
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(path_out, "PNG", optimize=True)
    print(f"Wrote {path_out} ({img.width}x{img.height})")


if __name__ == "__main__":
    process(INPUT, OUTPUT)
    process(INPUT, PUBLIC_OUTPUT)