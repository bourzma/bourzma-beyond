import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { resolveResult } from "@/lib/beyond/result";
import { getBeyondType, type BeyondTypeId } from "@/lib/beyond/types";
import styles from "./result.module.css";

/*
 * Shown right after the Typeform. Receives only the five personality answers
 * and the two professional answers as URL parameters (see resolveResult).
 * Shows the Bourzma logo, the Beyond Type and its description, and that the
 * Beyond Card is on its way. Type follows the Beyond Card: Archivo Expanded
 * (stand-in for the brand font Sequel 100), Black for headlines.
 */

export const metadata: Metadata = {
  title: "Your Beyond Type · Bourzma",
  robots: { index: false, follow: false },
};

/**
 * Width of each type word in em, measured in Archivo Expanded Black
 * (125% width, weight 900). Used to size the word so it fills the column
 * exactly. Re-measure if the display font or the word changes.
 */
const TYPE_WORD_EM: Record<BeyondTypeId, number> = {
  visionary: 7.458,
  connector: 8.528,
  maker: 4.923,
  catalyst: 6.695,
  rulebreaker: 10.056,
};

function Masthead() {
  return (
    <header className={styles.masthead}>
      <h2 className={styles.wordmark}>
        {/* The official logo; the only green on the page. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/bourzma-logo.png" width={411} height={32} alt="Bourzma" />
      </h2>
      <p className={styles.edition}>Beyond the Ordinary</p>
    </header>
  );
}

export default async function ResultPage(props: PageProps<"/result">) {
  const result = resolveResult(await props.searchParams);

  if (result.status === "invalid") {
    return (
      <main className={styles.page}>
        <Masthead />
        <section className={styles.reveal}>
          <p className={styles.kicker}>Something went missing</p>
          <h1 className={styles.problemTitle}>We couldn&rsquo;t read your answers</h1>
          <p className={styles.description}>Please ask someone from the Bourzma team to help you</p>
        </section>
      </main>
    );
  }

  const type = getBeyondType(result.beyondType);
  // As on the Beyond Card: sentence case, no quotation marks, no full stop.
  const description = type.tagline.replace(/\.\s*$/, "");

  return (
    <main className={styles.page}>
      <Masthead />

      <section className={styles.reveal}>
        <p className={styles.kicker}>You&rsquo;re the</p>
        <h1 className={styles.type} style={{ "--word-em": TYPE_WORD_EM[type.id] } as CSSProperties}>
          {type.label.toUpperCase()}
        </h1>
        <p className={styles.description}>{description}</p>
      </section>

      <footer className={styles.card}>
        <p className={styles.cardLine}>Your Beyond Card is being created.</p>
        <p className={styles.cardCall}>Check your inbox.</p>
        <p className={styles.cardHint}>Not there in a few minutes? Check your spam folder too.</p>
      </footer>
    </main>
  );
}
