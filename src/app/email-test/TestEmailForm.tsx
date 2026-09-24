"use client";

import { useState, type FormEvent } from "react";

type Result = { ok: boolean; [key: string]: unknown } | null;

const field =
  "mt-2 w-full border border-white bg-black px-3 py-3 text-base text-white outline-none focus:border-2";

export function TestEmailForm() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-email-test-key": String(form.get("key") ?? ""),
        },
        body: JSON.stringify({ beyondId: form.get("beyondId"), to: form.get("to") }),
      });
      setResult(await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` })));
    } catch {
      setResult({ ok: false, error: "Network error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-6">
      <label className="block text-xs font-semibold uppercase tracking-[0.2em]">
        Test key (EMAIL_TEST_KEY)
        <input name="key" type="password" required autoComplete="off" className={field} />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.2em]">
        Beyond ID
        <input name="beyondId" required placeholder="BYD-XXXX-XXXX" autoComplete="off" className={field} />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.2em]">
        Send to
        <input name="to" type="email" required autoComplete="email" className={field} />
      </label>
      <button
        type="submit"
        disabled={sending}
        className="w-full bg-white py-4 text-sm font-black uppercase tracking-[0.2em] text-black disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send test email"}
      </button>
      {result && (
        <pre
          role="status"
          className={`whitespace-pre-wrap border p-4 text-xs ${result.ok ? "border-white" : "border-neutral-500"}`}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </form>
  );
}
