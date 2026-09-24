import Link from "next/link";
import { matchProjects } from "@/lib/beyond/projects";
import {
  FIELD_REFS,
  InvalidAnswersError,
  scoreAnswers,
  type ScoreResult,
} from "@/lib/beyond/scoring";
import {
  BEYOND_TYPE_IDS,
  getBeyondType,
  isBeyondTypeId,
  type BeyondTypeId,
} from "@/lib/beyond/types";

/*
 * Two ways to open this page:
 *   /result?type=maker                         shows a type directly
 *   /result?Social=4&Curiosity=5&Execution=2&Connection=3&Beyond_default=5
 *                                              scores the answers first
 * The second form suits a Typeform "redirect on completion" URL.
 * Unstyled on purpose: the final visual design comes later.
 */
export default async function ResultPage(props: PageProps<"/result">) {
  const query = await props.searchParams;
  const first = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  let typeId: BeyondTypeId | null = null;
  let score: ScoreResult | null = null;
  let problems: string[] = [];

  const requestedType = first("type")?.toLowerCase();
  if (isBeyondTypeId(requestedType)) {
    typeId = requestedType;
  } else if (FIELD_REFS.some((ref) => first(ref) !== undefined)) {
    try {
      score = scoreAnswers(Object.fromEntries(FIELD_REFS.map((ref) => [ref, first(ref)])));
      typeId = score.beyondType;
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
  const projects = matchProjects(typeId);

  return (
    <main className="p-8 space-y-6">
      <section>
        <p>Your Beyond Type</p>
        <h1 className="text-3xl font-bold" data-type={type.id}>
          {type.name}
        </h1>
        <p className="text-lg">“{type.tagline}”</p>
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

      <section>
        <h2 className="text-xl font-semibold">Projects for you</h2>
        <ul className="list-disc pl-6">
          {projects.map((project) => (
            <li key={project.id}>
              <strong>{project.title}</strong>: {project.description}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
