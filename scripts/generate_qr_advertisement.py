from __future__ import annotations

from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
from qrcode.constants import ERROR_CORRECT_H


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
LOGO_PATH = PUBLIC / "assets" / "navyuvak-mandal-2026.jpeg"
INVITATION_URL = "https://navyuvak-ganesh-utsav-2026.vercel.app"

MARATHI_REGULAR = Path(r"C:\Windows\Fonts\mangal.ttf")
MARATHI_BOLD = Path(r"C:\Windows\Fonts\mangalb.ttf")
LATIN_REGULAR = Path(r"C:\Windows\Fonts\segoeui.ttf")
LATIN_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")

RAW_QR_PATH = PUBLIC / "navyuvak-ganesh-utsav-qr.png"
SOCIAL_POSTER_PATH = PUBLIC / "navyuvak-ganesh-utsav-qr-advertisement.png"
PRINT_POSTER_PATH = PUBLIC / "navyuvak-ganesh-utsav-qr-print-a4.png"


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


def font(path: Path, size: float) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), max(10, round(size)))


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
    font_path: Path,
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
    scale = width / 1080
    design_height = 1350 * scale
    offset_y = round((height - design_height) / 2)

    def sx(value: float) -> int:
        return round(value * scale)

    def sy(value: float) -> int:
        return round(value * scale + offset_y)

    canvas = Image.new("RGBA", (width, height), (17, 3, 3, 255))
    add_background(canvas, scale)
    draw = ImageDraw.Draw(canvas, "RGBA")

    logo_size = sx(150)
    logo_x = (width - logo_size) // 2
    logo_y = sy(58)
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
    max_text_width = width - sx(130)

    draw_centered(draw, "गणपती बाप्पा मोरया!", sy(245), MARATHI_BOLD, sx(37), gold, max_text_width)
    draw_centered(
        draw,
        "गणेशोत्सव २०२६",
        sy(315),
        MARATHI_BOLD,
        sx(72),
        ivory,
        max_text_width,
        stroke_width=max(1, sx(1.4)),
        stroke_fill=(77, 12, 7, 255),
    )
    draw_centered(draw, "नवयुवक म्हाडा गणेश उत्सव मंडळ", sy(395), MARATHI_BOLD, sx(36), gold, max_text_width)

    line_y = sy(435)
    draw.line((sx(175), line_y, width - sx(175), line_y), fill=(231, 183, 86, 115), width=max(1, sx(2)))
    draw.ellipse((width // 2 - sx(6), line_y - sx(6), width // 2 + sx(6), line_y + sx(6)), fill=(255, 178, 26, 220))

    qr_size = sx(500)
    qr_x = (width - qr_size) // 2
    qr_y = sy(478)
    padding = sx(24)
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
        "डिजिटल आमंत्रण पाहण्यासाठी स्कॅन करा",
        sy(1058),
        MARATHI_BOLD,
        sx(38),
        gold,
        max_text_width,
    )
    draw_centered(
        draw,
        "१४ सप्टेंबर २०२६  •  सायंकाळी ६:०० वाजता",
        sy(1125),
        MARATHI_BOLD,
        sx(29),
        ivory,
        max_text_width,
    )
    draw_centered(
        draw,
        "सार्वजनिक मैदान, म्हाडा कॉलनी, नागपूर",
        sy(1177),
        MARATHI_REGULAR,
        sx(27),
        muted,
        max_text_width,
    )
    draw_centered(
        draw,
        "navyuvak-ganesh-utsav-2026.vercel.app",
        sy(1240),
        LATIN_REGULAR,
        sx(20),
        (202, 184, 159, 255),
        max_text_width,
    )
    draw_centered(
        draw,
        "Developed by Sumit Pawar",
        sy(1292),
        LATIN_BOLD,
        sx(17),
        (231, 183, 86, 210),
        max_text_width,
    )

    canvas.convert("RGB").save(output_path, quality=96, dpi=(dpi, dpi), optimize=True)


def main() -> None:
    qr_image = make_qr()
    qr_image.save(RAW_QR_PATH, dpi=(300, 300), optimize=True)
    render_poster(1080, 1350, SOCIAL_POSTER_PATH, 144)
    render_poster(2480, 3508, PRINT_POSTER_PATH, 300)
    print(RAW_QR_PATH)
    print(SOCIAL_POSTER_PATH)
    print(PRINT_POSTER_PATH)


if __name__ == "__main__":
    main()
