/*
 * Renders sample Beyond Cards to ./card-samples for design review.
 *   npm run cards:samples
 * All data below is made up. Nothing is uploaded.
 */
import fs from "node:fs";
import path from "node:path";
import type { BeyondTypeId } from "@/lib/beyond/types";
import { generateCard } from "@/lib/card/generate";

const samples: {
  file: string;
  token: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  type: BeyondTypeId;
}[] = [
  // Same data as the Canva design (token chosen to give BYD-ETXQ-97CX).
  { file: "canva-match", token: "sample-visionary", firstName: "Anna", lastName: "Bērziņa", company: "Bourzma", type: "visionary" },
  { file: "connector", token: "sample-connector", firstName: "Līga", lastName: "Kalniņa", company: "Riga Design Week", type: "connector" },
  { file: "maker", token: "sample-maker", firstName: "Tom", lastName: "Ek", company: "Workshop Nine", type: "maker" },
  { file: "catalyst", token: "sample-catalyst", firstName: "Andris", lastName: "Bērziņš", company: "Northern Lights", type: "catalyst" },
  { file: "rulebreaker", token: "sample-rulebreaker", firstName: "Sam", lastName: "Rivera", company: "Independent", type: "rulebreaker" },
  {
    file: "stress-long-name",
    token: "sample-long",
    firstName: "Maximilian-Alexander",
    lastName: "Vanderbergh-Montgomery",
    company: "The International Association of Sustainable Fashion Designers",
    type: "rulebreaker",
  },
  {
    file: "stress-one-long-word",
    token: "sample-word",
    firstName: "Wolfeschlegelsteinhausenbergerdorffvoralternwarengewissenhaft",
    lastName: null,
    company: "W".repeat(60),
    type: "connector",
  },
  { file: "stress-cyrillic", token: "sample-cyrillic", firstName: "Анастасия", lastName: "Кузнецова", company: "Студия Дизайна", type: "catalyst" },
  { file: "stress-missing", token: "sample-missing", firstName: null, lastName: null, company: null, type: "maker" },
];

const outDir = path.join(process.cwd(), "card-samples");
fs.mkdirSync(outDir, { recursive: true });

for (const s of samples) {
  const card = generateCard({
    responseToken: s.token,
    contact: { firstName: s.firstName, lastName: s.lastName, company: s.company },
    beyondType: s.type,
  });
  fs.writeFileSync(path.join(outDir, `${s.file}.png`), card.png);
  fs.writeFileSync(path.join(outDir, `${s.file}.svg`), card.svg);
  console.log(`${s.file}.png  ${card.width}×${card.height}  ${card.beyondId}  ${(card.png.length / 1024).toFixed(0)} KB`);
}
console.log(`\nWritten to ${outDir}`);
