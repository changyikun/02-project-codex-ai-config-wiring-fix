from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(r"C:/02-project")
PICTURE_FONT = ROOT / "picture" / "font"
PICTURE_BG = ROOT / "picture" / "background"
PUBLIC_ASSETS = ROOT / "public" / "assets" / "routes"


ROUTE_LABELS = {
    "lanyinxuguo": PICTURE_FONT / "兰因絮果.jpg",
    "fushengrumeng": PICTURE_FONT / "浮生如梦.jpg",
    "yingluoyeting": PICTURE_FONT / "影落掖庭.jpg",
    "chenyuansucuo": PICTURE_FONT / "尘缘夙错.jpg",
}


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def rgba(image_path: Path) -> Image.Image:
    return Image.open(image_path).convert("RGBA")


def mask_from_light_background(image: Image.Image, keep_if_dark: int = 214) -> Image.Image:
    source = image.convert("RGBA")
    alpha = Image.new("L", source.size, 0)
    src = source.load()
    dst = alpha.load()
    width, height = source.size
    for x in range(width):
      for y in range(height):
        r, g, b, _ = src[x, y]
        if min(r, g, b) <= keep_if_dark:
          dst[x, y] = 255
    return alpha


def bbox_from_mask(mask: Image.Image) -> tuple[int, int, int, int] | None:
    return mask.getbbox()


def split_character_boxes(mask: Image.Image) -> list[tuple[int, int, int, int]]:
    width, height = mask.size
    pix = mask.load()
    active_columns: list[int] = []
    for x in range(width):
        column_total = 0
        for y in range(height):
            column_total += pix[x, y]
        if column_total > 255 * 6:
            active_columns.append(x)

    if not active_columns:
        return []

    groups: list[list[int]] = [[active_columns[0]]]
    for x in active_columns[1:]:
        if x - groups[-1][-1] <= 12:
            groups[-1].append(x)
        else:
            groups.append([x])

    boxes: list[tuple[int, int, int, int]] = []
    for group in groups:
        left = max(0, group[0] - 8)
        right = min(width, group[-1] + 9)
        top = height
        bottom = 0
        for x in range(left, right):
            for y in range(height):
                if pix[x, y] > 0:
                    top = min(top, y)
                    bottom = max(bottom, y + 1)
        if bottom > top:
            boxes.append((left, max(0, top - 8), right, min(height, bottom + 8)))
    return boxes


def make_vertical_label(source_path: Path, out_path: Path) -> None:
    source = rgba(source_path)
    mask = mask_from_light_background(source)
    boxes = split_character_boxes(mask)
    if not boxes:
        raise RuntimeError(f"无法切分路线字图: {source_path}")

    characters: list[Image.Image] = []
    for box in boxes:
        crop = source.crop(box)
        crop_mask = mask.crop(box)
        character = Image.new("RGBA", crop.size, (0, 0, 0, 0))
        character.paste((38, 18, 18, 255), (0, 0), crop_mask)
        characters.append(character)

    max_width = max(character.width for character in characters)
    gap = 16
    top_bottom = 18
    total_height = sum(character.height for character in characters) + gap * (len(characters) - 1) + top_bottom * 2
    canvas = Image.new("RGBA", (max_width + 24, total_height), (0, 0, 0, 0))

    cursor_y = top_bottom
    for character in characters:
        x = (canvas.width - character.width) // 2
        canvas.alpha_composite(character, (x, cursor_y))
        cursor_y += character.height + gap

    ensure_dir(out_path.parent)
    canvas.save(out_path)


def make_confirm_stamp(source_path: Path, out_path: Path) -> None:
    source = rgba(source_path)
    corners = [
        source.getpixel((6, 6)),
        source.getpixel((source.width - 7, 6)),
        source.getpixel((6, source.height - 7)),
        source.getpixel((source.width - 7, source.height - 7)),
    ]
    bg_r = sum(pixel[0] for pixel in corners) // len(corners)
    bg_g = sum(pixel[1] for pixel in corners) // len(corners)
    bg_b = sum(pixel[2] for pixel in corners) // len(corners)

    output = Image.new("RGBA", source.size, (0, 0, 0, 0))
    src = source.load()
    dst = output.load()

    for x in range(source.width):
        for y in range(source.height):
            r, g, b, _ = src[x, y]
            distance = abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b)
            if distance < 44 and r > 198 and g > 198 and b > 198:
                dst[x, y] = (0, 0, 0, 0)
            else:
                dst[x, y] = (r, g, b, 255)

    bbox = output.getbbox()
    if bbox is None:
        raise RuntimeError("确认图裁剪失败")

    cropped = output.crop(bbox)
    ensure_dir(out_path.parent)
    cropped.save(out_path)


def copy_background(source_path: Path, out_path: Path) -> None:
    ensure_dir(out_path.parent)
    image = Image.open(source_path)
    image.save(out_path)


def main() -> None:
    for route_id, source_path in ROUTE_LABELS.items():
        make_vertical_label(source_path, PUBLIC_ASSETS / "labels" / f"{route_id}-vertical.png")

    make_confirm_stamp(PICTURE_FONT / "确认.jpg", PUBLIC_ASSETS / "buttons" / "confirm-flower.png")
    copy_background(PICTURE_BG / "背景.jpg", PUBLIC_ASSETS / "backgrounds" / "route-selection-bg.jpg")


if __name__ == "__main__":
    main()
