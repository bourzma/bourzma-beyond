import { NO_STORE_HEADERS, checkPreviewKey } from "@/lib/card/preview-key";

/*
 * Shows which settings the RUNNING deployment can see, never their values:
 *   GET /api/config-check?key=<CARD_PREVIEW_KEY>
 * Lists names of related variables too, so typos (e.g. a trailing space or
 * different spelling) are visible. Disabled (404) unless CARD_PREVIEW_KEY is set.
 */

const EXPECTED = [
  "TYPEFORM_WEBHOOK_SECRET",
  "BLOB_STORE_ID",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "EMAIL_AUTO_SEND",
  "EMAIL_TEST_KEY",
  "CARD_PREVIEW_KEY",
] as const;

export async function GET(request: Request) {
  const access = checkPreviewKey(request);
  if (access === "disabled") return new Response("Not found", { status: 404, headers: NO_STORE_HEADERS });
  if (access === "unauthorized") return new Response("Unauthorized", { status: 401, headers: NO_STORE_HEADERS });

  const present = Object.fromEntries(
    EXPECTED.map((name) => [name, Boolean(process.env[name]?.trim())]),
  ) as Record<(typeof EXPECTED)[number], boolean>;

  return Response.json(
    {
      deployment: {
        environment: process.env.VERCEL_ENV ?? null,
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        url: process.env.VERCEL_URL ?? null,
      },
      present,
      // Not a secret: only whether auto-send is switched on.
      emailAutoSend: process.env.EMAIL_AUTO_SEND?.trim() === "true",
      gmailUserLooksLikeGmail: /@gmail\.com$/i.test(process.env.GMAIL_USER?.trim() ?? ""),
      gmailAppPasswordLength: (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "").length,
      // Names only (as JSON strings, so stray spaces show), never values.
      relatedVariableNames: Object.keys(process.env)
        .filter((name) => /gmail|email|mail|blob|typeform|card/i.test(name))
        .map((name) => JSON.stringify(name))
        .sort(),
    },
    { headers: NO_STORE_HEADERS },
  );
}
