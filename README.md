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
| `src/lib/beyond/projects.ts` | Project catalogue and matching (**placeholder projects**) |
| `src/lib/beyond/typeform.ts` | Reads Typeform webhook payloads, verifies signatures |
| `src/app/api/typeform`       | `POST` webhook endpoint, returns the scored result as JSON |
| `src/app/result`             | Basic, unstyled result page                     |

## Result page

- `/result?type=maker` shows any type directly (`visionary`, `connector`,
  `maker`, `catalyst`, `rulebreaker`). Add `&sides=catalyst` (comma-separated)
  to preview strong sides.
- `/result?Social=4&Curiosity=5&Execution=2&Connection=3&Beyond_default=5`
  scores the answers first. Use this form as Typeform's
  "redirect on completion" URL, recalling each answer into its parameter.

## Webhook

Point a Typeform webhook at `POST /api/typeform`. If
`TYPEFORM_WEBHOOK_SECRET` is set, the `Typeform-Signature` header is checked.
See `.env.example`.

## Development

```bash
npm install
npm run dev
npm test
```
