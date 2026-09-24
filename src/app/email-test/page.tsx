import type { Metadata } from "next";
import { TestEmailForm } from "./TestEmailForm";

export const metadata: Metadata = {
  title: "Beyond Card email test · Bourzma",
  robots: { index: false, follow: false },
};

/**
 * Internal test page: sends one Beyond Card email for a stored card.
 * Useless without EMAIL_TEST_KEY, which the tester types in; nothing secret
 * is in this page.
 */
export default function EmailTestPage() {
  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.24em]">Bourzma · internal</p>
      <h1 className="mt-3 text-3xl font-black uppercase">Beyond Card email test</h1>
      <p className="mt-3 text-sm text-neutral-400">
        Sends one test email with an already generated card. Automatic emails are off.
      </p>
      <TestEmailForm />
    </main>
  );
}
