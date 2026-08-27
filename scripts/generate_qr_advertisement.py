from __future__ import annotations

from pathlib import Path
import re

import qrcode
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
from qrcode.constants import ERROR_CORRECT_H


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
LOGO_PATH = PUBLIC / "assets" / "navyuvak-mandal-2026.jpeg"
EVENT_SOURCE_PATH = ROOT / "src" / "event.ts"
INVITATION_URL = "https://navyuvak-ganesh-utsav-2026.vercel.app"
POSTER_LOCALITY = "म्हाडा कॉलनी, नागपूर"
POSTER_ADDRESS_LINE_1 = "म्हाडा कॉलनी, इलेक्ट्रॉनिक झोन चौक,"
POSTER_ADDRESS_LINE_2 = "नागपूर"

MARATHI_FONT = Path(r"C:\Windows\Fonts\Nirmala.ttc")
MARATHI_REGULAR = (MARATHI_FONT, 0)
MARATHI_BOLD = (MARATHI_FONT, 1)
LATIN_REGULAR = Path(r"C:\Windows\Fonts\segoeui.ttf")
LATIN_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")

RAW_QR_PATH = PUBLIC / "navyuvak-ganesh-utsav-qr.png"
SOCIAL_POSTER_PATH = PUBLIC / "navyuvak-ganesh-utsav-qr-advertisement.png"
PRINT_POSTER_PATH = PUBLIC / "navyuvak-ganesh-utsav-qr-print-a4.png"


def load_event_details() -> dict[str, str]:
    """Read the same Marathi event copy that powers the invitation website."""
    source = EVENT_SOURCE_PATH.read_text(encoding="utf-8")
    keys = (
        "mandalName",
        "locality",
        "title",
        "dateDisplay",
        "timeDisplay",
        "venueName",
        "address",
        "president",
        "presidentMandalName",
        "phoneDisplay",
    )
    details: dict[str, str] = {}
    for key in keys:
        match = re.search(rf"\b{key}:\s*'([^']+)'", source)
        if match is None:
            raise ValueError(f"Could not find {key!r} in {EVENT_SOURCE_PATH}")
        details[key] = match.group(1)
    return details


EVENT = load_event_details()


def make_qr() -> Image.Image:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=32,
        border=4,
    )
    qr.add_data(INVITATION_URL)
    qr.make(fit=True)
    return qr.make_image(fill_color="#160303", back_color="#fffaf0").convert("RGB")


def font(source: Path | tuple[Path, int], size: float) -> ImageFont.FreeTypeFont:
    if isinstance(source, tuple):
        path, index = source
        return ImageFont.truetype(str(path), max(10, round(size)), index=index)
    return ImageFont.truetype(str(source), max(10, round(size)))


def add_glow(canvas: Image.Image, center: tuple[int, int], radius: int, color: tuple[int, int, int]) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    x, y = center
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*color, 115))
    layer = layer.filter(ImageFilter.GaussianBlur(max(12, radius // 2)))
    canvas.alpha_composite(layer)


def add_background(canvas: Image.Image, scale: float) -> None:
    width, height = canvas.size
    pixels = canvas.load()
    for y in range(height):
        progress = y / max(1, height - 1)
        red = round(29 + 14 * (1 - abs(progress - 0.44) * 2))
        green = round(3 + 4 * (1 - abs(progress - 0.44) * 2))
        blue = round(3 + 2 * (1 - abs(progress - 0.44) * 2))
        for x in range(width):
            pixels[x, y] = (red, green, blue, 255)

    add_glow(canvas, (width // 2, round(height * 0.24)), round(width * 0.36), (158, 35, 12))
    add_glow(canvas, (width // 2, round(height * 0.69)), round(width * 0.48), (117, 22, 8))

    draw = ImageDraw.Draw(canvas, "RGBA")
    gold = (231, 183, 86, 110)
    inset = round(34 * scale)
    draw.rounded_rectangle(
        (inset, inset, width - inset, height - inset),
        radius=round(24 * scale),
        outline=gold,
        width=max(2, round(2 * scale)),
    )
    draw.rounded_rectangle(
        (inset + round(12 * scale), inset + round(12 * scale), width - inset - round(12 * scale), height - inset - round(12 * scale)),
        radius=round(18 * scale),
        outline=(231, 183, 86, 45),
        width=max(1, round(scale)),
    )

    motif_step = max(70, round(118 * scale))
    motif_size = round(22 * scale)
    for y in range(inset + motif_step, height - inset, motif_step):
        for x in (inset + round(28 * scale), width - inset - round(28 * scale)):
            draw.polygon(
                ((x, y - motif_size), (x + motif_size, y), (x, y + motif_size), (x - motif_size, y)),
                outline=(231, 183, 86, 38),
                width=max(1, round(scale)),
            )


def circular_logo(size: int) -> Image.Image:
    source = Image.open(LOGO_PATH).convert("RGB")
    fitted = ImageOps.fit(source, (size, size), method=Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    output.paste(fitted, (0, 0), mask)
    return output


def draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font_path: Path | tuple[Path, int],
    size: float,
    fill: tuple[int, int, int, int],
    max_width: int,
    stroke_width: int = 0,
    stroke_fill: tuple[int, int, int, int] | None = None,
) -> None:
    current_size = size
    selected = font(font_path, current_size)
    while current_size > 12:
        bounds = draw.textbbox((0, 0), text, font=selected)
        if bounds[2] - bounds[0] <= max_width:
            break
        current_size -= 1
        selected = font(font_path, current_size)
    draw.text(
        (draw._image.width // 2, y),
        text,
        font=selected,
        fill=fill,
        anchor="mm",
        align="center",
        stroke_width=stroke_width,
        stroke_fill=stroke_fill,
    )


def render_poster(width: int, height: int, output_path: Path, dpi: int) -> None:
    # The master layout is a 9:16 social poster. The same balanced layout is
    # centred and scaled for the A4 print export without stretching any asset.
    scale = min(width / 1080, height / 1920)
    design_height = 1920 * scale
    offset_y = round((height - design_height) / 2)

    def sx(value: float) -> int:
        return round(value * scale)

    def sy(value: float) -> int:
        return round(value * scale + offset_y)

    canvas = Image.new("RGBA", (width, height), (17, 3, 3, 255))
    add_background(canvas, scale)
    draw = ImageDraw.Draw(canvas, "RGBA")

    logo_size = sx(160)
    logo_x = (width - logo_size) // 2
    logo_y = sy(60)
    draw.ellipse(
        (logo_x - sx(7), logo_y - sx(7), logo_x + logo_size + sx(7), logo_y + logo_size + sx(7)),
        fill=(20, 3, 3, 245),
        outline=(255, 215, 120, 220),
        width=max(2, sx(3)),
    )
    canvas.alpha_composite(circular_logo(logo_size), (logo_x, logo_y))

    ivory = (255, 245, 223, 255)
    gold = (255, 215, 120, 255)
    muted = (222, 205, 178, 255)
    max_text_width = sx(900)

    draw_centered(draw, "गणपती बाप्पा मोरया!", sy(242), MARATHI_BOLD, sx(38), gold, max_text_width)
    draw_centered(
        draw,
        EVENT["title"],
        sy(315),
        MARATHI_BOLD,
        sx(76),
        ivory,
        max_text_width,
        stroke_width=max(1, sx(1.4)),
        stroke_fill=(77, 12, 7, 255),
    )
    draw_centered(draw, EVENT["mandalName"], sy(410), MARATHI_BOLD, sx(42), gold, max_text_width)
    draw_centered(draw, POSTER_LOCALITY, sy(466), MARATHI_REGULAR, sx(32), muted, max_text_width)

    line_y = sy(520)
    line_half_width = sx(365)
    draw.line(
        (width // 2 - line_half_width, line_y, width // 2 + line_half_width, line_y),
        fill=(231, 183, 86, 115),
        width=max(1, sx(2)),
    )
    draw.ellipse((width // 2 - sx(6), line_y - sx(6), width // 2 + sx(6), line_y + sx(6)), fill=(255, 178, 26, 220))

    qr_size = sx(441)
    qr_x = (width - qr_size) // 2
    qr_y = sy(560)
    padding = sx(25)
    draw.rounded_rectangle(
        (qr_x - padding, qr_y - padding, qr_x + qr_size + padding, qr_y + qr_size + padding),
        radius=sx(24),
        fill=(255, 250, 240, 255),
        outline=(255, 215, 120, 245),
        width=max(2, sx(5)),
    )
    qr_image = make_qr().resize((qr_size, qr_size), Image.Resampling.NEAREST).convert("RGBA")
    canvas.alpha_composite(qr_image, (qr_x, qr_y))

    draw_centered(
        draw,
        "डिजिटल आमंत्रण पाहण्यासाठी",
        sy(1055),
        MARATHI_BOLD,
        sx(44),
        gold,
        max_text_width,
    )
    draw_centered(
        draw,
        "क्यूआर कोड स्कॅन करा",
        sy(1110),
        MARATHI_BOLD,
        sx(44),
        gold,
        max_text_width,
    )

    card_left = width // 2 - sx(450)
    card_right = width // 2 + sx(450)
    card_top = sy(1165)
    card_bottom = sy(1500)
    draw.rounded_rectangle(
        (card_left, card_top, card_right, card_bottom),
        radius=sx(24),
        fill=(13, 2, 2, 185),
        outline=(231, 183, 86, 125),
        width=max(1, sx(2)),
    )

    draw_centered(
        draw,
        f"दिनांक: {EVENT['dateDisplay']}",
        sy(1215),
        MARATHI_BOLD,
        sx(38),
        ivory,
        sx(820),
    )
    draw_centered(
        draw,
        f"वेळ: {EVENT['timeDisplay']}",
        sy(1275),
        MARATHI_BOLD,
        sx(38),
        ivory,
        sx(820),
    )
    draw_centered(
        draw,
        f"स्थळ: {EVENT['venueName']}",
        sy(1335),
        MARATHI_BOLD,
        sx(38),
        gold,
        sx(820),
    )

    draw_centered(
        draw,
        POSTER_ADDRESS_LINE_1,
        sy(1400),
        MARATHI_REGULAR,
        sx(36),
        muted,
        sx(820),
    )
    draw_centered(draw, POSTER_ADDRESS_LINE_2, sy(1455), MARATHI_REGULAR, sx(36), muted, sx(820))

    draw_centered(draw, "अध्यक्ष", sy(1555), MARATHI_BOLD, sx(30), gold, max_text_width)
    draw_centered(draw, EVENT["president"], sy(1610), MARATHI_BOLD, sx(38), ivory, max_text_width)
    draw_centered(draw, EVENT["presidentMandalName"], sy(1665), MARATHI_REGULAR, sx(30), muted, max_text_width)
    draw_centered(draw, EVENT["phoneDisplay"], sy(1715), MARATHI_BOLD, sx(34), gold, max_text_width)

    draw_centered(
        draw,
        "navyuvak-ganesh-utsav-2026.vercel.app",
        sy(1780),
        LATIN_REGULAR,
        sx(19),
        (202, 184, 159, 255),
        max_text_width,
    )
    draw_centered(
        draw,
        "Developed by Sumit Pawar",
        sy(1830),
        LATIN_BOLD,
        sx(17),
        (231, 183, 86, 210),
        max_text_width,
    )

    canvas.convert("RGB").save(output_path, quality=96, dpi=(dpi, dpi), optimize=True)


def main() -> None:
    qr_image = make_qr()
    qr_image.save(RAW_QR_PATH, dpi=(300, 300), optimize=True)
    render_poster(1080, 1920, SOCIAL_POSTER_PATH, 144)
    render_poster(2480, 3508, PRINT_POSTER_PATH, 300)
    print(RAW_QR_PATH)
    print(SOCIAL_POSTER_PATH)
    print(PRINT_POSTER_PATH)


if __name__ == "__main__":
    main()
