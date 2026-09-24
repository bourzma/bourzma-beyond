import type { BeyondTypeId } from "./types";

export interface BeyondProject {
  id: string;
  name: string;
  category: string[];
  /** Types this project suits, most aligned first. Drives matching. */
  bestAlignedWith: BeyondTypeId[];
  shortLine: string;
  /** Plain text, usable in both the result page and the email template. */
  whatWeDid: string;
  /** Placeholders until filled: null means "not set yet". */
  symbol: string | null;
  image: string | null;
  videoUrl: string | null;
  ctaUrl: string | null;
  /** Placeholders until defined: not used by matching yet. */
  relevantWorkAreas: string[];
  relevantIndustries: string[];
  relevantLookingFor: string[];
}

export const PROJECTS: BeyondProject[] = [
  {
    id: "bourzma-boutique",
    name: "BOURZMA BOUTIQUE",
    category: ["Fashion", "Sustainability", "Creative Collaboration"],
    bestAlignedWith: ["visionary", "connector", "rulebreaker"],
    shortLine: "Rethinking how fashion is created, presented and experienced.",
    whatWeDid:
      "Bourzma Boutique is our flagship sustainable fashion experience bringing together emerging designers, artists and creative communities through runway shows, upcycling workshops, performances, markets and unexpected cultural experiences.",
    symbol: null,
    image: null,
    videoUrl: null,
    ctaUrl: null,
    relevantWorkAreas: [],
    relevantIndustries: [],
    relevantLookingFor: [],
  },
  {
    id: "worlds-largest-basketball-jersey",
    name: "THE WORLD'S LARGEST BASKETBALL JERSEY",
    category: ["Large-scale Activation", "Production", "Events"],
    bestAlignedWith: ["maker", "catalyst"],
    shortLine: "When a big idea becomes impossible to ignore.",
    whatWeDid:
      "We turned an oversized idea into a real large-scale physical installation, creating a giant basketball jersey designed to generate attention, interaction and a memorable brand moment.",
    symbol: null,
    image: null,
    videoUrl: null,
    ctaUrl: null,
    relevantWorkAreas: [],
    relevantIndustries: [],
    relevantLookingFor: [],
  },
  {
    id: "delivery-van-redesign",
    name: "DELIVERY VAN REDESIGN",
    category: ["Special Projects", "Brand Activation", "Design"],
    bestAlignedWith: ["catalyst", "visionary", "rulebreaker"],
    shortLine: "Turning an everyday delivery van into a moving brand experience.",
    whatWeDid:
      "We created a custom visual concept for a brand and transformed one of their delivery vans into a moving piece of brand communication, taking the design out of traditional media and onto the streets.",
    symbol: null,
    image: null,
    videoUrl: null,
    ctaUrl: null,
    relevantWorkAreas: [],
    relevantIndustries: [],
    relevantLookingFor: [],
  },
  {
    id: "gaisma-tunela-gala",
    name: "GAISMA TUNEĻA GALĀ",
    category: ["Events", "Culture", "Experiences"],
    bestAlignedWith: ["rulebreaker", "catalyst", "visionary"],
    shortLine: "A tunnel wasn't supposed to be a rave.",
    whatWeDid:
      "We transformed an underground pedestrian tunnel in central Riga into a one-night cultural experience combining electronic music, street culture and sustainable fashion, turning an overlooked city space into part of Riga's birthday celebration.",
    symbol: null,
    image: null,
    videoUrl: null,
    ctaUrl: null,
    relevantWorkAreas: [],
    relevantIndustries: [],
    relevantLookingFor: [],
  },
  {
    id: "bourzma-x-shopping-mall",
    name: "BOURZMA × SHOPPING MALL",
    category: ["Retail", "Experiential", "Content"],
    bestAlignedWith: ["connector", "catalyst", "visionary"],
    shortLine: "Turning a shopping mall into a stage for fashion and creativity.",
    whatWeDid:
      "We brought Bourzma into the shopping mall environment through a fashion show, creative workshops and content-driven activations, creating experiences that gave visitors a reason to stop, participate and engage with the space differently.",
    symbol: null,
    image: null,
    videoUrl: null,
    ctaUrl: null,
    relevantWorkAreas: [],
    relevantIndustries: [],
    relevantLookingFor: [],
  },
];

/**
 * Projects aligned with the given type, ordered by how high the type appears
 * in each project's bestAlignedWith list, then by catalogue order.
 * Deterministic: no AI, no randomness.
 */
export function matchProjects(
  type: BeyondTypeId,
  projects: BeyondProject[] = PROJECTS,
  limit = 3,
): BeyondProject[] {
  return projects
    .map((project, index) => ({ project, index, rank: project.bestAlignedWith.indexOf(type) }))
    .filter((entry) => entry.rank !== -1)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.project);
}
