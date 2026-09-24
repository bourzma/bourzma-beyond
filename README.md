# Bourzma Beyond the Ordinary

Scores five Typeform personality answers and assigns one of five Beyond Types.
Scoring is fully deterministic: no AI is involved in choosing the type.

## Inputs

Five Typeform answers, each an integer from 1 to 5, identified by field ref:

`Social`, `Curiosity`, `Execution`, `Connection`, `Beyond_default`

## Scoring

| Type            | Score                                              |
| --------------- | -------------------------------------------------- |
| THE VISIONARY   | average(Curiosity, Beyond_default)                 |
| THE CONNECTOR   | average(Social, Connection)                        |
| THE MAKER       | Execution                                          |
| THE CATALYST    | average(Social, Execution)                         |
| THE RULEBREAKER | (2 × Beyond_default + Curiosity) / 3               |

Scores are compared as whole numbers (each multiplied by 6), so floating-point
rounding can never change the result.

### Picking the Beyond Type

1. **Highest score wins.**
2. **Ties** (about 1 in 4 answer sets) go to the first tied type in this fixed
   order: **Visionary → Rulebreaker → Catalyst → Connector → Maker**.
   The other tied types become **strong sides**, e.g. "THE VISIONARY, with a
   strong Rulebreaker side".

Why a fixed order: the common ties are built into the formulas (Visionary and
Rulebreaker always tie when Curiosity = Beyond_default; Maker and Catalyst
when Social = Execution; Connector and Catalyst when Connection = Execution),
so the answers themselves cannot separate them.

Why this order: types that rarely win outright go first, and Maker goes last
because its single-answer score already wins most often. Of all 120 possible
orders, it spreads the 3,125 possible answer sets most evenly:

| Type        | Share of answer sets |
| ----------- | -------------------- |
| Visionary   | 22% (688)            |
| Connector   | 21% (659)            |
| Maker       | 26% (801)            |
| Catalyst    | 16% (486)            |
| Rulebreaker | 16% (491)            |

This assumes every answer set is equally likely. Once real responses exist,
the split can be checked and the order tuned **once**; after launch it must
not change, or the same answers would give a different type. A test pins
these numbers so the order cannot change by accident.

## Code

| Module                       | Purpose                                         |
| ---------------------------- | ----------------------------------------------- |
| `src/lib/beyond/types.ts`    | The five types, names, taglines, tie-break order, strong-side wording |
| `src/lib/beyond/scoring.ts`  | Answer validation, formulas, type selection     |
| `src/lib/beyond/projects.ts` | The five Bourzma projects (all texts, media URLs, relevance labels) |
| `src/lib/beyond/matching.ts` | Picks the primary and "Also for you" project    |
| `src/lib/beyond/typeform.ts` | Reads Typeform webhook payloads, verifies signatures |
| `src/app/api/typeform`       | `POST` webhook endpoint, returns the scored result as JSON |
| `src/lib/beyond/result.ts`   | Turns /result URL parameters into type + primary project |
| `src/app/result`             | The result page shown after the Typeform        |

## Result page

Shown right after the Typeform. It reveals the Beyond Type, its description
and the **symbol** of the primary matched project, never the project's name:
people find the project by finding the symbol in the Bourzma space.

It reads only these URL parameters:

| Parameter                                                   | Required |
| ----------------------------------------------------------- | -------- |
| `Social`, `Curiosity`, `Execution`, `Connection`, `Beyond_default` (1–5) | yes |
| `Looking_for`, `Workplace_type` (exact option labels)       | no       |

Personal details (name, email, company, LinkedIn, role) must never be put in
the URL. Missing or invalid answers show a "we couldn't read your answers"
screen.

For previews and testing, `/result?type=maker` (any of `visionary`,
`connector`, `maker`, `catalyst`, `rulebreaker`) skips scoring.

### Symbols

Set `symbol` in `projects.ts` to an artwork file, ideally SVG, e.g. put
`public/symbols/boutique.svg` there and write `symbol: "/symbols/boutique.svg"`.
Until then the page shows a numbered temporary placeholder (01–05 in
catalogue order).

### Typeform redirect

In the Typeform, use **Redirect to URL** on completion with:

```
https://<your-domain>/result?Social={{field:Social}}&Curiosity={{field:Curiosity}}&Execution={{field:Execution}}&Connection={{field:Connection}}&Beyond_default={{field:Beyond_default}}&Looking_for={{field:Looking_for}}&Workplace_type={{field:Workplace_type}}
```

Insert each `{{field:…}}` with Typeform's recall (@) picker rather than typing
it, so it is linked to the right question.

## Projects

All project content lives in `src/lib/beyond/projects.ts`, one object per
project: `name`, `category`, `bestAlignedWith`, `shortLine`, `whatWeDid`,
`symbol`, `image`, `videoUrl`, `ctaUrl`, `relevantWorkplaceTypes`,
`relevantLookingFor`.

- `symbol`, `image`, `videoUrl` and `ctaUrl` are `null` until filled in.
  Images can be full URLs or files placed in `public/projects/` and written as
  `/projects/<file>.jpg`.
- `relevantLookingFor` and `relevantWorkplaceTypes` hold **exact Typeform
  option labels**. An empty list means that field never adds points. The
  official options are listed in `src/lib/beyond/typeform.ts`
  (`LOOKING_FOR_OPTIONS`, `WORKPLACE_TYPE_OPTIONS`); a test fails if a project
  uses any other label. **If an option is renamed in Typeform, rename it in
  both places.** Workplace_type "Other" is deliberately not mapped.
- The current mapping was approved on 2026-09-24. `matching.test.ts` pins the
  resulting project pair for every Beyond Type × Looking_for answer.

### Matching (`src/lib/beyond/matching.ts`)

Deterministic, no AI. Every respondent gets one **primary** project and, when
another exists, a different **"Also for you"** project.

Each project gets points:

| Signal                                            | Points                    |
| ------------------------------------------------- | ------------------------- |
| Beyond Type in `bestAlignedWith`                  | 1st 30 · 2nd 20 · 3rd+ 10 |
| `Looking_for` matches `relevantLookingFor`         | +12                       |
| `Workplace_type` matches `relevantWorkplaceTypes`  | +4                        |

Type places are 10 points apart. A `Looking_for` match (12) can lift a project
one place; a `Workplace_type` match (4) only decides between equally placed
projects; both together (16) never lift a project two places. Projects not
aligned with the Beyond Type always rank below aligned ones. Ties go to the
better type position, then catalogue order. Labels match case-insensitively
and ignore extra spaces; multi-select answers match if any selection matches.

`Role` is free text and is never used for matching.

## Webhook

Production URL: `https://bourzma-beyond.vercel.app/api/typeform`
(or the same path on a custom domain).

- **Signature:** every request must carry a valid `Typeform-Signature`
  (HMAC-SHA256 of the raw body with `TYPEFORM_WEBHOOK_SECRET`). In production
  the webhook refuses all requests (503) until that variable is set.
- **Parsed:** contact details (`First_name`, `Last_name`, `Company`, `Role`,
  `Email`, `Linkedin`, `Marketing_consent`), the five personality answers,
  `Looking_for`, `Workplace_type`, scores, Beyond Type, and the primary and
  secondary projects in full (including `whatWeDid`).
- **Response:** everything parsed, as JSON, visible in Typeform's webhook
  delivery log. **Logs** show only which fields arrived, never their values.
- `Role` and contact fields are never used for matching.
- Sample payload for tests: `src/lib/beyond/fixtures/typeform-submission.json`.
- No email is sent yet.

## Development

```bash
npm install
npm run dev
npm test
```
