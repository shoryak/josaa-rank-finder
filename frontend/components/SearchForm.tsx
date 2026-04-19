"use client";

import { useState, FormEvent } from "react";

export interface FormValues {
  rank: number;
  category: string;
  gender: string;
  state: string;
}

interface SearchFormProps {
  onSearch: (values: FormValues) => void;
  loading: boolean;
}

const CATEGORIES = [
  { value: "OPEN", label: "OPEN (General)", rankHint: "Enter your CRL rank (e.g. 19000)" },
  { value: "OBC-NCL", label: "OBC-NCL", rankHint: "Enter your OBC-NCL category rank (typically under 18,000 for NITs)" },
  { value: "SC", label: "SC", rankHint: "Enter your SC category rank (typically under 9,000 for NITs)" },
  { value: "ST", label: "ST", rankHint: "Enter your ST category rank (typically under 3,500 for NITs)" },
  { value: "EWS", label: "EWS", rankHint: "Enter your EWS category rank (typically under 8,500 for NITs)" },
];

const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "UP",
  "Uttarakhand",
  "West Bengal",
  "Other / Outside India",
];

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("OPEN");
  const [gender, setGender] = useState("Gender-Neutral");
  const [state, setState] = useState("UP");
  const [rankError, setRankError] = useState("");

  const rankHint = CATEGORIES.find((c) => c.value === category)?.rankHint ?? "";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const rankNum = parseInt(rank, 10);
    if (!rank || isNaN(rankNum) || rankNum <= 0) {
      setRankError("Please enter a valid positive rank.");
      return;
    }
    setRankError("");
    onSearch({ rank: rankNum, category, gender, state });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white shadow-lg shadow-blue-100 border border-blue-100 p-6 sm:p-8"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-semibold text-slate-700 mb-1.5"
          >
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Home State */}
        <div>
          <label
            htmlFor="state"
            className="block text-sm font-semibold text-slate-700 mb-1.5"
          >
            Home State{" "}
            <span className="font-normal text-slate-500">(for HS quota)</span>
          </label>
          <select
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Rank */}
        <div className="sm:col-span-2">
          <label
            htmlFor="rank"
            className="block text-sm font-semibold text-slate-700 mb-1.5"
          >
            {category === "OPEN" ? "Your CRL Rank" : `Your ${category} Category Rank`}
          </label>
          <input
            id="rank"
            type="number"
            min={1}
            value={rank}
            onChange={(e) => {
              setRank(e.target.value);
              setRankError("");
            }}
            placeholder={category === "OPEN" ? "e.g. 19000" : category === "ST" ? "e.g. 2000" : category === "SC" ? "e.g. 5000" : "e.g. 10000"}
            className={`w-full rounded-lg border px-4 py-3 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              rankError
                ? "border-red-400 bg-red-50"
                : "border-slate-300 bg-slate-50"
            }`}
          />
          {rankError ? (
            <p className="mt-1 text-xs text-red-600">{rankError}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">{rankHint}</p>
          )}
        </div>

        {/* Gender toggle */}
        <div className="sm:col-span-2">
          <p className="block text-sm font-semibold text-slate-700 mb-2">
            Gender
          </p>
          <div className="flex gap-3">
            {["Gender-Neutral", "Female-only"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 sm:flex-none rounded-lg border px-5 py-2.5 text-sm font-medium transition ${
                  gender === g
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {g === "Gender-Neutral" ? "Gender-Neutral" : "Female-only"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {loading ? "Searching…" : "Find My Options"}
      </button>
    </form>
  );
}
