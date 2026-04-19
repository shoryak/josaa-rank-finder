"use client";

import { useState } from "react";
import posthog from "posthog-js";
import SearchForm, { FormValues } from "@/components/SearchForm";
import ResultsTable, { Result } from "@/components/ResultsTable";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

type FetchState = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedRank, setSubmittedRank] = useState<number | null>(null);

  async function handleSearch(values: FormValues) {
    setFetchState("loading");
    setErrorMsg("");
    setSubmittedRank(values.rank);

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
        <p className="mt-4 max-w-xl mx-auto text-lg text-slate-600">
          Enter your JEE rank, category, gender, and home state to see every
          NIT, IIIT, and GFTI you can get into — sorted from toughest to
          easiest.
        </p>
      </section>

      {/* Thesis */}
      <section className="px-4 pb-10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">The only decision that matters</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 rounded-2xl bg-blue-600 text-white p-6 shadow-lg shadow-blue-200">
              <p className="text-2xl font-black mb-1">Best Branch</p>
              <p className="text-blue-200 text-sm">CSE · EE · ECE · MnC</p>
              <p className="text-blue-100 text-xs mt-3 leading-relaxed">at any NIT you can get into</p>
            </div>
            <div className="shrink-0 text-2xl font-black text-slate-300">or</div>
            <div className="flex-1 rounded-2xl bg-slate-800 text-white p-6 shadow-lg shadow-slate-200">
              <p className="text-2xl font-black mb-1">Best NIT</p>
              <p className="text-slate-400 text-sm">Any branch</p>
              <p className="text-slate-300 text-xs mt-3 leading-relaxed">college brand opens doors branch cannot</p>
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
