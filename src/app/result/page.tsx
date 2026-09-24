import Link from "next/link";
import { matchProjects, type ProfessionalContext } from "@/lib/beyond/matching";
import type { BeyondProject } from "@/lib/beyond/projects";
import { PROFESSIONAL_FIELD_REFS } from "@/lib/beyond/typeform";
import {
  FIELD_REFS,
  InvalidAnswersError,
  scoreAnswers,
  type ScoreResult,
} from "@/lib/beyond/scoring";
import {
  BEYOND_TYPE_IDS,
  TIE_BREAK_ORDER,
  describeStrongSides,
  getBeyondType,
  isBeyondTypeId,
  type BeyondTypeId,
} from "@/lib/beyond/types";

/*
 * Two ways to open this page:
 *   /result?type=maker                         shows a type directly
 *   /result?type=maker&sides=catalyst          ...with strong sides (preview)
 *   /result?Social=4&Curiosity=5&Execution=2&Connection=3&Beyond_default=5
 *                                              scores the answers first
 * The last form suits a Typeform "redirect on completion" URL.
 * Any form can add the professional answers used for project matching:
 *   &Workplace_type=...&Work_area=...&Industry=...&Looking_for=...
 * (multi-select answers as comma-separated labels, as Typeform recalls them).
 * Unstyled on purpose: the final visual design comes later.
 */

function ProjectCard({ project, label }: { project: BeyondProject; label: string }) {
  return (
    <section data-project={project.id}>
      <h2 className="text-xl font-semibold">{label}</h2>
      <p>
        <strong>{project.name}</strong> ({project.category.join(" / ")})
      </p>
      <p>{project.shortLine}</p>
      <p>{project.whatWeDid}</p>
    </section>
  );
}
export default async function ResultPage(props: PageProps<"/result">) {
  const query = await props.searchParams;
  const first = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  let typeId: BeyondTypeId | null = null;
  let strongSides: BeyondTypeId[] = [];
  let score: ScoreResult | null = null;
  let problems: string[] = [];

  const requestedType = first("type")?.toLowerCase();
  if (isBeyondTypeId(requestedType)) {
    typeId = requestedType;
    const requestedSides = (first("sides") ?? "").toLowerCase().split(",");
    strongSides = TIE_BREAK_ORDER.filter(
      (id) => id !== requestedType && requestedSides.includes(id),
    );
  } else if (FIELD_REFS.some((ref) => first(ref) !== undefined)) {
    try {
      score = scoreAnswers(Object.fromEntries(FIELD_REFS.map((ref) => [ref, first(ref)])));
      typeId = score.beyondType;
      strongSides = score.strongSides;
    } catch (error) {
      if (!(error instanceof InvalidAnswersError)) throw error;
      problems = error.problems;
    }
  }

  if (!typeId) {
    return (
      <main className="p-8 space-y-4">
        <h1 className="text-2xl font-bold">No result to show</h1>
        {problems.length > 0 && (
          <ul className="list-disc pl-6">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <p>Pick a type:</p>
        <ul className="list-disc pl-6">
          {BEYOND_TYPE_IDS.map((id) => (
            <li key={id}>
              <Link className="underline" href={`/result?type=${id}`}>
                {getBeyondType(id).name}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const type = getBeyondType(typeId);
  const answersFor = (ref: string) => {
    const value = first(ref)?.trim();
    return value ? [value] : [];
  };
  const context: ProfessionalContext = {
    workplaceType: answersFor(PROFESSIONAL_FIELD_REFS.workplaceType),
    workArea: answersFor(PROFESSIONAL_FIELD_REFS.workArea),
    industry: answersFor(PROFESSIONAL_FIELD_REFS.industry),
    lookingFor: answersFor(PROFESSIONAL_FIELD_REFS.lookingFor),
  };
  const match = matchProjects(typeId, context);

  return (
    <main className="p-8 space-y-6">
      <section>
        <p>Your Beyond Type</p>
        <h1 className="text-3xl font-bold" data-type={type.id}>
          {type.name}
        </h1>
        <p className="text-lg">“{type.tagline}”</p>
        {strongSides.length > 0 && (
          <p data-strong-sides={strongSides.join(",")}>{describeStrongSides(strongSides)}</p>
        )}
      </section>

      {score && (
        <section>
          <h2 className="text-xl font-semibold">Scores</h2>
          <ul>
            {BEYOND_TYPE_IDS.map((id) => (
              <li key={id}>
                {getBeyondType(id).name}: {score.scores[id].toFixed(2)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProjectCard project={match.primary} label="Your project" />
      {match.secondary && <ProjectCard project={match.secondary} label="Also for you" />}
    </main>
  );
}
