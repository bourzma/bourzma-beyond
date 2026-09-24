import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { PROJECTS, type BeyondProject } from "@/lib/beyond/projects";
import { resolveResult } from "@/lib/beyond/result";
import { getBeyondType, type BeyondTypeId } from "@/lib/beyond/types";
import styles from "./result.module.css";

/*
 * Shown right after the Typeform. Receives only the five personality answers
 * and the two professional answers as URL parameters (see resolveResult).
 * Reveals the Beyond Type and the primary project's SYMBOL, never the
 * project's name: people find the project by finding the symbol in the room.
 */

export const metadata: Metadata = {
  title: "Your Beyond Type · Bourzma",
  robots: { index: false, follow: false },
};

/**
 * Width of each type word in em, measured in Archivo 900 at 62% width.
 * Used to size the word so it fills the column exactly. Re-measure if the
 * display font or the word changes.
 */
const TYPE_WORD_EM: Record<BeyondTypeId, number> = {
  visionary: 3.982,
  connector: 4.466,
  maker: 2.666,
  catalyst: 3.565,
  rulebreaker: 5.276,
};

function ProjectSymbol({ project }: { project: BeyondProject }) {
  if (project.symbol) {
    // Symbols are artwork files (ideally SVG) set in projects.ts.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={styles.symbolImage} src={project.symbol} alt="Your Bourzma symbol" />;
  }

  // Temporary stand-in: a number, so it reveals nothing about the project.
  const number = String(PROJECTS.indexOf(project) + 1).padStart(2, "0");
  return (
    <div className={styles.placeholder} role="img" aria-label={`Temporary symbol ${number}`}>
      <span className={styles.placeholderMark}>{number}</span>
      <span className={styles.placeholderNote}>Temporary symbol</span>
    </div>
  );
}

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
        <section className={styles.problem}>
          <p className={styles.kicker}>Something went missing</p>
          <h1 className={styles.problemTitle}>We couldn&rsquo;t read your answers</h1>
          <p className={styles.tagline}>Please ask someone from the Bourzma team to help you.</p>
        </section>
      </main>
    );
  }

  const type = getBeyondType(result.beyondType);
  const typeWord = type.label.toUpperCase();

  return (
    <main className={styles.page}>
      <Masthead />

      <section className={styles.reveal}>
        <p className={styles.kicker}>You&rsquo;re the</p>
        <h1
          className={styles.type}
          style={{ "--word-em": TYPE_WORD_EM[type.id] } as CSSProperties}
        >
          {typeWord}
        </h1>
        <p className={styles.tagline}>&ldquo;{type.tagline}&rdquo;</p>
      </section>

      <hr className={styles.rule} />

      <section className={styles.next}>
        <p className={styles.label}>Your next place to go beyond</p>
        <div className={styles.symbolFrame}>
          <ProjectSymbol project={result.primaryProject} />
        </div>
        <p className={styles.instruction}>Find this mark somewhere in the room.</p>
      </section>

      <footer className={styles.card}>
        <p className={styles.cardLine}>Your Beyond Card is being created.</p>
        <p className={styles.cardCall}>Check your inbox.</p>
      </footer>
    </main>
  );
}
