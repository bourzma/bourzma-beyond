import { Resvg } from "@resvg/resvg-js";

/** Output width in pixels: 2160 × 1400, sharp for email, retina and sharing. */
export const OUTPUT_WIDTH = 2160;

/** Rasterises the card SVG. All text is already paths, so no fonts are needed. */
export function renderPng(svg: string, width = OUTPUT_WIDTH): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: false },
    background: "#000000",
  });
  return resvg.render().asPng();
}
