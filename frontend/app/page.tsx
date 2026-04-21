"use client";

import { useState } from "react";
import posthog from "posthog-js";
import SearchForm, { FormValues } from "@/components/SearchForm";
import ResultsTable, { Result } from "@/components/ResultsTable";
import ChatPanel from "@/components/ChatPanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition"
      >
        <span className="text-sm font-semibold text-slate-800 pr-4">{q}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

type FetchState = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedRank, setSubmittedRank] = useState<number | null>(null);
  const [submittedValues, setSubmittedValues] = useState<FormValues | null>(null);

  async function handleSearch(values: FormValues) {
    setFetchState("loading");
    setErrorMsg("");
    setSubmittedRank(values.rank);
    setSubmittedValues(values);

    try {
      const params = new URLSearchParams({
        rank: String(values.rank),
        category: values.category,
        gender: values.gender,
        state: values.state,
      });

      const res = await fetch(`${API_URL}/api/options?${params}`);
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      const resultCount = data.total ?? 0;
      setResults(data.results ?? []);
      setTotal(resultCount);
      setFetchState("success");
      posthog.capture("search", {
        rank: values.rank,
        category: values.category,
        gender: values.gender,
        state: values.state,
        results_count: resultCount,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(message);
      setFetchState("error");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero */}
      <section className="px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700 mb-6">
          JOSAA 2025 Data
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Find Your Best{" "}
          <span className="text-blue-600">College Option</span>
        </h1>
      </section>

      {/* Thesis */}
      <section className="px-4 pb-10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">The only decision that matters</p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:flex-1 rounded-2xl bg-blue-600 text-white p-5 shadow-lg shadow-blue-200">
              <p className="text-xl font-black mb-1">Best Branch</p>
              <p className="text-blue-200 text-sm">CSE · EE · ECE · MnC</p>
              <p className="text-blue-100 text-xs mt-2 leading-relaxed">at any college you can get into</p>
            </div>
            <div className="shrink-0 text-xl font-black text-slate-300">or</div>
            <div className="w-full sm:flex-1 rounded-2xl bg-slate-800 text-white p-5 shadow-lg shadow-slate-200">
              <p className="text-xl font-black mb-1">Best College</p>
              <p className="text-slate-400 text-sm">Any branch</p>
              <p className="text-slate-300 text-xs mt-2 leading-relaxed">college brand opens doors branch cannot</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-slate-500">Your results are organized around exactly this choice.</p>
        </div>
      </section>

      {/* Form */}
      <section className="px-4 pb-10">
        <div className="max-w-2xl mx-auto">
          <SearchForm onSearch={handleSearch} loading={fetchState === "loading"} />
        </div>
      </section>

      {/* Advisor — inline between form and results */}
      {fetchState === "success" && submittedValues && (
        <section className="px-4 pb-6">
          <div className="max-w-2xl mx-auto">
            <ChatPanel
              key={`${submittedValues.rank}-${submittedValues.category}-${submittedValues.gender}`}
              results={results}
              total={total}
              userRank={submittedValues.rank}
              category={submittedValues.category}
              gender={submittedValues.gender}
              state={submittedValues.state}
            />
          </div>
        </section>
      )}

      {/* Results */}
      <section className="px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          {fetchState === "loading" && (
            <div className="flex flex-col items-center gap-4 py-20 text-slate-500">
              <svg
                className="animate-spin h-8 w-8 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm">Searching through counselling data…</p>
            </div>
          )}

          {fetchState === "error" && (
            <div className="max-w-lg mx-auto rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
              <p className="font-semibold">Something went wrong</p>
              <p className="text-sm mt-1 text-red-600">{errorMsg}</p>
              <p className="text-xs mt-2 text-red-500">
                Make sure the backend is running at {API_URL}
              </p>
            </div>
          )}

          {fetchState === "success" && (
            <div className="animate-fade-in">
              <ResultsTable
                results={results}
                total={total}
                userRank={submittedRank ?? 0}
              />
            </div>
          )}
        </div>
      </section>

      {/* Floating chat */}

      {/* FAQs */}
      <section className="px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {[
              {
                q: "What is the difference between HS and OS quota?",
                a: "HS (Home State) quota is reserved for students from that state at their home state's NIT — for example, a UP student gets HS quota at MNNIT Allahabad. OS (Other State) is for everyone else. HS seats are fewer but cutoffs are often lower for local students. IIITs and GFTIs use AI (All India) quota with no state restriction.",
              },
              {
                q: "What does Freeze, Float, and Slide mean in JOSAA rounds?",
                a: "After each round: Freeze means you accept your current seat and exit the process. Float means you keep your current seat but want a better option — the system will automatically upgrade you if something better opens in the next round. Slide means you want to stay at your current college but upgrade to a better branch there. Round 6 is the final round — you must Freeze or you lose your seat.",
              },
              {
                q: "Is CSE at a lower NIT better than ECE at a top NIT?",
                a: "CSE (Computer Science) is the most sought-after branch for software careers and has the highest cutoffs. ECE (Electronics and Communication Engineering) graduates from top NITs also go into software roles in large numbers, alongside core electronics and VLSI careers. The closing ranks for CSE at lower NITs and ECE at top NITs often overlap, making this one of the most common dilemmas in JOSAA counselling.",
              },
              {
                q: "What is MnC (Mathematics and Computing)?",
                a: "Mathematics and Computing (MnC) is a branch offered at select NITs that combines mathematics, statistics, and computer science. The curriculum covers algorithms, data structures, machine learning, and mathematical modelling. It has high cutoffs — often close to CSE — and attracts strong campus placements in software and analytics roles.",
              },
              {
                q: "Why are IITs not showing in my results?",
                a: "This tool covers NITs, IIITs, and GFTIs only — the colleges that fall under JOSAA's NIT+ counselling. IIT admissions use a separate JEE Advanced rank and are handled through JoSAA's IIT-specific process. If you qualified JEE Advanced, check the official JoSAA portal for IIT cutoffs.",
              },
              {
                q: "What does 'borderline' mean?",
                a: "An option is flagged as borderline when its closing rank is within 2,000 of your rank. This means the seat was just barely available at your rank last year — cutoffs can shift by a few hundred to a few thousand ranks between years, so borderline options may or may not be available in the current round.",
              },
              {
                q: "Can cutoffs change significantly between rounds?",
                a: "Yes. Closing ranks can shift by hundreds to a few thousand ranks between Round 1 and Round 6 as seats vacate and students upgrade. Options that appear unavailable in early rounds sometimes open up later. The 'borderline' flag on this tool highlights entries where your rank is within 2,000 of last year's closing rank — these are worth monitoring across rounds.",
              },
            ].map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 text-center text-sm text-slate-500">
        <p>
          Data sourced from JOSAA 2025 official counselling records.
          Results are indicative — always verify on the{" "}
          <a
            href="https://josaa.admissions.nic.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            official JOSAA portal
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
