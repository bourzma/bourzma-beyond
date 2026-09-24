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

The highest score is the Beyond Type. **Ties** go to the type listed first in
the table above (Visionary → Connector → Maker → Catalyst → Rulebreaker).
Scores are compared as whole numbers (each multiplied by 6), so floating-point
rounding can never change the result.

## Code

| Module                       | Purpose                                         |
| ---------------------------- | ----------------------------------------------- |
| `src/lib/beyond/types.ts`    | The five types, names, taglines, tie-break order |
| `src/lib/beyond/scoring.ts`  | Answer validation, formulas, type selection     |
| `src/lib/beyond/projects.ts` | Project catalogue and matching (**placeholder projects**) |
| `src/lib/beyond/typeform.ts` | Reads Typeform webhook payloads, verifies signatures |
| `src/app/api/typeform`       | `POST` webhook endpoint, returns the scored result as JSON |
| `src/app/result`             | Basic, unstyled result page                     |

## Result page

- `/result?type=maker` shows any type directly (`visionary`, `connector`,
  `maker`, `catalyst`, `rulebreaker`).
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
