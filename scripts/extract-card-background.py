"""
Turns the Canva export of the Beyond Card into the static background layer
used by src/lib/card/template.ts: everything except the text.

    python scripts/extract-card-background.py "<Canva export>.svg"

Canva groups the design as: [black background, green art, green art, logo
image, then one group per text glyph]. Every white-filled glyph group is
removed; the artwork, clip paths and logo stay untouched. Re-run whenever the
Canva design changes (and re-check the text positions in template.ts).
"""

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SVG = "http://www.w3.org/2000/svg"
XLINK = "http://www.w3.org/1999/xlink"
ET.register_namespace("", SVG)
ET.register_namespace("xlink", XLINK)

OUT = Path(__file__).resolve().parent.parent / "src" / "lib" / "card" / "assets" / "beyond-card-background.svg"


def is_text_group(el: ET.Element) -> bool:
    """A group whose only visible content is white glyph paths."""
    fills = {e.get("fill") for e in el.iter() if e.get("fill")}
    has_image = any(e.tag == f"{{{SVG}}}image" for e in el.iter())
    return not has_image and fills == {"#ffffff"}


def main(src: str) -> None:
    tree = ET.parse(src)
    root = tree.getroot()

    removed = 0
    for parent in root.iter():
        for child in list(parent):
            if child.tag == f"{{{SVG}}}g" and is_text_group(child):
                parent.remove(child)
                removed += 1

    # Canva export glitch: a white base layer is 0.2 units wider than the
    # black background and shows as a thin white line on the right edge.
    # Make that base black; nothing else changes.
    for el in root.iter(f"{{{SVG}}}path"):
        if el.get("fill") == "#ffffff":
            el.set("fill", "#000000")

    # Size comes from the viewBox; the template sets the output size.
    for attr in ("width", "height"):
        root.attrib.pop(attr, None)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    tree.write(OUT, encoding="utf-8", xml_declaration=False)
    print(f"removed {removed} text groups -> {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main(sys.argv[1])
