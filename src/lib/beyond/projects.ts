import type { BeyondTypeId } from "./types";

export interface BeyondProject {
  id: string;
  name: string;
  category: string[];
  /** Types this project suits, most aligned first. Main matching signal. */
  bestAlignedWith: BeyondTypeId[];
  shortLine: string;
  /** Plain text, usable in both the result page and the email template. */
  whatWeDid: string;
  /** Placeholders until filled: null means "not set yet". */
  symbol: string | null;
  image: string | null;
  videoUrl: string | null;
  ctaUrl: string | null;
  /**
   * Typeform option labels, copied exactly, that make this project a better
   * fit (see matching.ts). Empty list = this field never adds points.
   */
  relevantWorkplaceTypes: string[];
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
    // TODO: fill with exact Typeform option labels.
    relevantWorkplaceTypes: [],
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
    // TODO: fill with exact Typeform option labels.
    relevantWorkplaceTypes: [],
    relevantLookingFor: [],
  },
  {
    id: "delivery-van-redesign",
    name: "DELIVERY VAN REDESIGN",
    category: ["Special Projects", "Brand Activation", "Design"],
    // Maker: a designed concept turned into a real physical brand activation.
    bestAlignedWith: ["catalyst", "visionary", "rulebreaker", "maker"],
    shortLine: "Turning an everyday delivery van into a moving brand experience.",
    whatWeDid:
      "We created a custom visual concept for a brand and transformed one of their delivery vans into a moving piece of brand communication, taking the design out of traditional media and onto the streets.",
    symbol: null,
    image: null,
    videoUrl: null,
    ctaUrl: null,
    // TODO: fill with exact Typeform option labels.
    relevantWorkplaceTypes: [],
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
    // TODO: fill with exact Typeform option labels.
    relevantWorkplaceTypes: [],
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
    // TODO: fill with exact Typeform option labels.
    relevantWorkplaceTypes: [],
    relevantLookingFor: [],
  },
];
