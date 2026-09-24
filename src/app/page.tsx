import Link from "next/link";
import { BEYOND_TYPE_IDS, getBeyondType } from "@/lib/beyond/types";

export default function Home() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">Bourzma Beyond the Ordinary</h1>
      <p>Preview a result page:</p>
      <ul className="list-disc pl-6">
        {BEYOND_TYPE_IDS.map((id) => (
          <li key={id}>
            <Link className="underline" href={`/result?type=${id}`}>
              {getBeyondType(id).name}
            </Link>
          </li>
        ))}
        <li>
          <Link
            className="underline"
            href="/result?Social=4&Curiosity=5&Execution=2&Connection=3&Beyond_default=5"
          >
            Sample answers (scored)
          </Link>
        </li>
      </ul>
    </main>
  );
}
