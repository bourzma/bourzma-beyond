import fs from "node:fs";
import path from "node:path";
import * as fontkit from "fontkit";

/*
 * Text for the Beyond Card is measured and drawn with the real font files
 * and turned into SVG paths. That makes the card identical in every renderer
 * and means respondent-typed text never appears as SVG markup.
 *
 * Fonts: the Canva design uses Sequel 100 Black 65 (headlines) and 45 (body).
 * Until licensed Sequel files are added, Archivo Expanded stands in,
 * calibrated against the Canva export: scaleX/scaleY make its widths and cap
 * height (0.713 em) match Sequel's. Unbounded covers characters Archivo
 * lacks, e.g. Cyrillic. With real Sequel files, set both scales to 1.
 */

export type FontStyle = "headline" | "body";

interface FontConfig {
  files: [primary: string, fallback: string];
  scaleX: number;
  scaleY: number;
}

const FONTS: Record<FontStyle, FontConfig> = {
  // Sequel 100 Black 65 stand-in: widths already match within 0.2%.
  headline: { files: ["ArchivoExpanded-Black.ttf", "Unbounded-Black.ttf"], scaleX: 1, scaleY: 1.039 },
  // Sequel 100 Black 45 stand-in: Archivo Bold is ~2% narrower.
  body: { files: ["ArchivoExpanded-Bold.ttf", "Unbounded-Bold.ttf"], scaleX: 1.02, scaleY: 1.039 },
};

/** Cap height as a fraction of the font size, as in the Canva design. */
export const CAP_HEIGHT = 0.713;

export const FONT_DIR = path.join(process.cwd(), "src", "lib", "card", "fonts");

const cache = new Map<string, fontkit.Font>();
function loadFont(file: string): fontkit.Font {
  let font = cache.get(file);
  if (!font) {
    font = fontkit.create(fs.readFileSync(path.join(FONT_DIR, file))) as fontkit.Font;
    cache.set(file, font);
  }
  return font;
}

export interface TextStyle {
  font: FontStyle;
  /** Font size in card pixels. */
  size: number;
  /** Extra space after each character, in em (e.g. 0.12). */
  tracking?: number;
}

interface Run {
  font: fontkit.Font;
  text: string;
}

/** Splits text into runs, each set in the first font that has its glyphs. */
function toRuns(text: string, style: FontStyle): Run[] {
  const [primary, fallback] = FONTS[style].files.map(loadFont);
  const runs: Run[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    const font =
      char === " " || primary.hasGlyphForCodePoint(cp) || !fallback.hasGlyphForCodePoint(cp)
        ? primary
        : fallback;
    const last = runs[runs.length - 1];
    if (last && last.font === font) last.text += char;
    else runs.push({ font, text: char });
  }
  return runs;
}

/** Width of the text in card pixels. */
export function measure(text: string, style: TextStyle): number {
  const { scaleX } = FONTS[style.font];
  let width = 0;
  let glyphs = 0;
  for (const run of toRuns(text, style.font)) {
    const layout = run.font.layout(run.text);
    width += (layout.advanceWidth / run.font.unitsPerEm) * style.size * scaleX;
    glyphs += layout.glyphs.length;
  }
  return width + Math.max(0, glyphs - 1) * (style.tracking ?? 0) * style.size;
}

export type Anchor = "start" | "middle" | "end";

/** SVG path data for the text with its baseline at (x, y). */
export function textPath(
  text: string,
  style: TextStyle,
  x: number,
  y: number,
  anchor: Anchor = "start",
): string {
  const width = measure(text, style);
  let pen = anchor === "start" ? x : anchor === "middle" ? x - width / 2 : x - width;
  const tracking = (style.tracking ?? 0) * style.size;
  const { scaleX, scaleY } = FONTS[style.font];
  const parts: string[] = [];

  for (const run of toRuns(text, style.font)) {
    const kx = (style.size / run.font.unitsPerEm) * scaleX;
    const ky = (style.size / run.font.unitsPerEm) * scaleY;
    const layout = run.font.layout(run.text);
    layout.glyphs.forEach((glyph, i) => {
      const pos = layout.positions[i];
      const d = glyph.path
        .scale(kx, -ky)
        .translate(pen + pos.xOffset * kx, y - pos.yOffset * ky)
        .toSVG();
      if (d) parts.push(d);
      pen += pos.xAdvance * kx + tracking;
    });
  }
  return parts.join("");
}

/* ---------------------------------------------------------------------------
 * Fitting: every function below is deterministic and guarantees the result
 * fits the given width, shrinking first and cutting with "…" only as a last
 * resort.
 * ------------------------------------------------------------------------ */

const ELLIPSIS = "…";
// Tolerance for floating-point rounding when text is sized to fit exactly.
const EPSILON = 1e-6;
const fits = (text: string, style: TextStyle, maxWidth: number) =>
  measure(text, style) <= maxWidth + EPSILON;

/** Largest size ≤ maxSize at which the text fits on one line. */
export function sizeToFit(text: string, style: TextStyle, maxWidth: number): number {
  const width = measure(text, style);
  return width <= maxWidth ? style.size : (style.size * maxWidth) / width;
}

/** Cuts the text (adding "…") until it fits. */
export function truncate(text: string, style: TextStyle, maxWidth: number): string {
  if (fits(text, style, maxWidth)) return text;
  const chars = [...text];
  while (chars.length > 0) {
    chars.pop();
    const candidate = chars.join("").trimEnd() + ELLIPSIS;
    if (fits(candidate, style, maxWidth)) return candidate;
  }
  return ELLIPSIS;
}

/** One line, shrunk to fit between maxSize and minSize, then truncated. */
export function fitLine(
  text: string,
  style: TextStyle,
  maxWidth: number,
  minSize: number,
): { text: string; size: number } {
  const size = Math.max(minSize, Math.min(style.size, sizeToFit(text, style, maxWidth)));
  const fitted = { ...style, size };
  return { text: truncate(text, fitted, maxWidth), size };
}

/** Greedy word wrap; words longer than a line are broken by character. */
export function wrap(
  text: string,
  style: TextStyle,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let current = "";

  const pushWord = (word: string) => {
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate, style, maxWidth)) {
      current = candidate;
      return;
    }
    if (current) lines.push(current);
    current = "";
    // A single word wider than the line: break it by character.
    let piece = "";
    for (const char of word) {
      if (!fits(piece + char, style, maxWidth) && piece) {
        lines.push(piece);
        piece = "";
      }
      piece += char;
    }
    current = piece;
  };

  for (const word of text.split(/\s+/).filter(Boolean)) pushWord(word);
  if (current) lines.push(current);

  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = truncate(`${kept[maxLines - 1]} ${lines[maxLines]}`, style, maxWidth);
  return kept;
}

/**
 * Word wrap with lines as even as possible (no lone last word): the narrowest
 * width that still gives the same number of lines as a plain wrap.
 */
export function wrapBalanced(
  text: string,
  style: TextStyle,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines = wrap(text, style, maxWidth, maxLines);
  if (lines.length < 2) return lines;
  let lo = maxWidth / 2;
  let hi = maxWidth;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const candidate = wrap(text, style, mid, maxLines + 1);
    if (candidate.length === lines.length) hi = mid;
    else lo = mid;
  }
  return wrap(text, style, hi, maxLines);
}

/** Every way to split text into `count` lines at spaces or after hyphens. */
function splits(text: string, count: number): string[][] {
  const breaks: number[] = [];
  for (let i = 1; i < text.length; i++) {
    if (text[i] === " " || (text[i - 1] === "-" && text[i] !== " ")) breaks.push(i);
  }
  const result: string[][] = [];
  const choose = (start: number, from: number, lines: string[]) => {
    if (lines.length === count - 1) {
      result.push([...lines, text.slice(start).trim()]);
      return;
    }
    for (let b = from; b < breaks.length; b++) {
      const line = text.slice(start, breaks[b]).trim();
      if (line) choose(breaks[b], b + 1, [...lines, line]);
    }
  };
  choose(0, 0, []);
  return result.filter((lines) => lines.every(Boolean));
}

/**
 * A headline of up to three lines, as large as possible: the fewest lines
 * whose size reaches that line count's threshold (e.g. one line only if it
 * can be at least 80 px). Breaks at spaces and after hyphens; as a last
 * resort wraps at minSize, breaking long words and cutting with "…".
 */
export function fitHeadline(
  text: string,
  style: TextStyle,
  maxWidth: number,
  { thresholds, minSize }: { thresholds: number[]; minSize: number },
): { lines: string[]; size: number } {
  let fallback: { lines: string[]; size: number } | null = null;
  for (let count = 1; count <= thresholds.length; count++) {
    let best: { lines: string[]; size: number } | null = null;
    for (const lines of count === 1 ? [[text]] : splits(text, count)) {
      const size = Math.min(style.size, ...lines.map((l) => sizeToFit(l, style, maxWidth)));
      if (!best || size > best.size) best = { lines, size };
    }
    if (!best) continue;
    if (best.size >= thresholds[count - 1]) return best;
    if (!fallback || best.size > fallback.size) fallback = best;
  }
  if (fallback && fallback.size >= minSize) return fallback;

  const small = { ...style, size: minSize };
  return { lines: wrap(text, small, maxWidth, thresholds.length), size: minSize };
}
