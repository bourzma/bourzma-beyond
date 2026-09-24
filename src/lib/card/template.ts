import fs from "node:fs";
import path from "node:path";
import { getBeyondType, type BeyondTypeId } from "@/lib/beyond/types";
import { CAP_HEIGHT, fitHeadline, fitLine, textPath, wrap, type TextStyle } from "./text";

/*
 * The Beyond Card, recreated from the Canva design (the source of truth).
 *
 * - Background: the Canva export with its text removed
 *   (assets/beyond-card-background.svg, see scripts/extract-card-background.py).
 * - Text: drawn on top at the exact Canva positions and sizes below, in the
 *   Canva coordinate system (240.75 × 156 units). Only the text changes.
 *
 * Canva text (from the exported PDF):
 *   BEYOND ID: …   body     3.23  left  x 15.58  baseline  43.87
 *   NAME           headline 17.31 left  x 15.58  baseline  58.10
 *   COMPANY        headline 14.31 left  x 15.58  baseline  74.57
 *   THE TYPE       headline 12.32 centre x 152.84 baseline  99.33
 *   Description    body     7.12  centre x 153.83 baselines 106.61, 116.09
 */

export const CARD_WIDTH = 240.75;
export const CARD_HEIGHT = 156;

const WHITE = "#ffffff";
const LEFT = 15.58;
const RIGHT = CARD_WIDTH - LEFT; // same margin on the right
const TEXT_WIDTH = RIGHT - LEFT;

const ID = { size: 3.23, baseline: 43.87 };
const NAME = { size: 17.31, baseline: 58.1 };
const COMPANY = { size: 14.31, baseline: 74.57 };
const TYPE = { size: 12.32, baseline: 99.33, centre: 152.84 };
const DESCRIPTION = { size: 7.12, baseline: 106.61, leading: 9.48, centre: 153.83, boxWidth: 121 };

/** Widest text centred on x that still stays inside the right margin. */
const centredWidth = (centre: number) => 2 * (RIGHT - centre);

export interface CardData {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  beyondType: BeyondTypeId;
  beyondId: string;
}

const BACKGROUND = fs
  .readFileSync(path.join(process.cwd(), "src", "lib", "card", "assets", "beyond-card-background.svg"), "utf8")
  .replace(/^\s*<\?xml[^>]*>\s*/, "")
  // Nest it at full card size; the template sets the output size.
  .replace(/^<svg\b/, `<svg x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}"`);

/** Normalises user text: trims, collapses whitespace, strips control chars. */
export function cleanText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const white = (d: string) => (d ? `<path d="${d}" fill="${WHITE}"/>` : "");

export function buildCardSvg(data: CardData): string {
  const type = getBeyondType(data.beyondType);
  const text: string[] = [];

  // Name: one line if it fits at 13+ units, else up to two lines, growing
  // upwards from the Canva baseline so the company line never moves.
  const name = (cleanText(`${cleanText(data.firstName)} ${cleanText(data.lastName)}`) || "Beyond guest")
    .toUpperCase();
  const nameFit = fitHeadline(name, { font: "headline", size: NAME.size }, TEXT_WIDTH, {
    thresholds: [13, 10.5],
    minSize: 9,
  });
  const nameLeading = nameFit.size * 0.9;
  const firstBaseline = NAME.baseline - (nameFit.lines.length - 1) * nameLeading;
  nameFit.lines.forEach((line, i) => {
    text.push(white(textPath(line, { font: "headline", size: nameFit.size }, LEFT, firstBaseline + i * nameLeading)));
  });

  // Beyond ID: sits the Canva gap (1.87) above the name's cap height.
  const idBaseline =
    nameFit.lines.length === 1 && nameFit.size === NAME.size
      ? ID.baseline
      : firstBaseline - CAP_HEIGHT * nameFit.size - (NAME.baseline - CAP_HEIGHT * NAME.size - ID.baseline);
  text.push(white(textPath(`BEYOND ID: ${data.beyondId}`, { font: "body", size: ID.size }, LEFT, idBaseline)));

  // Company: one line, shrinking, then cut with "…".
  const company = cleanText(data.company).toUpperCase();
  if (company) {
    const fitted = fitLine(company, { font: "headline", size: COMPANY.size }, TEXT_WIDTH, 8);
    text.push(white(textPath(fitted.text, { font: "headline", size: fitted.size }, LEFT, COMPANY.baseline)));
  }

  // Beyond Type, centred.
  const typeFit = fitLine(type.name, { font: "headline", size: TYPE.size }, centredWidth(TYPE.centre), 8);
  text.push(
    white(textPath(typeFit.text, { font: "headline", size: typeFit.size }, TYPE.centre, TYPE.baseline, "middle")),
  );

  // Description: centred, wrapped in the Canva text box width, no final full stop.
  const description = type.tagline.replace(/\.\s*$/, "");
  let descStyle: TextStyle = { font: "body", size: DESCRIPTION.size };
  let lines = wrap(description, descStyle, DESCRIPTION.boxWidth, 99);
  if (lines.length > 3) {
    descStyle = { ...descStyle, size: DESCRIPTION.size * 0.85 };
    lines = wrap(description, descStyle, centredWidth(DESCRIPTION.centre), 3);
  }
  const leading = DESCRIPTION.leading * (descStyle.size / DESCRIPTION.size);
  lines.forEach((line, i) => {
    text.push(white(textPath(line, descStyle, DESCRIPTION.centre, DESCRIPTION.baseline + i * leading, "middle")));
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">`,
    BACKGROUND,
    ...text,
    `</svg>`,
  ].join("");
}
