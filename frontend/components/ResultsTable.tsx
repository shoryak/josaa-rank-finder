"use client";

import { useState } from "react";

export interface Result {
  institute: string;
  branch: string;
  quota: string;
  opening_rank: number;
  closing_rank: number;
}

interface ResultsTableProps {
  results: Result[];
  total: number;
  userRank: number;
}

const BORDERLINE_MARGIN = 2000;

const CSE_KEYWORDS = ["computer science", "data science", "artificial intelligence", "information technology", "computing"];
const EE_KEYWORDS = ["electrical"];
const MNC_KEYWORDS = ["mathematics", "mathematical"];

// NIRF 2024 NIT rankings — keys match backend short_inst output exactly
const NIRF_RANK: Record<string, number> = {
  "NIT Trichy": 1, "NIT, Rourkela": 2, "NIT Karnataka, Surathkal": 3,
  "NIT, Warangal": 4, "NIT Calicut": 5, "VNIT Nagpur": 6,
  "NIT, Kurukshetra": 7, "NIT, Silchar": 8, "MNNIT Allahabad": 9,
  "NIT Durgapur": 10, "MNIT Jaipur": 11, "NIT, Jamshedpur": 12,
  "NIT Patna": 13, "NIT Delhi": 14, "SVNIT Surat": 15,
  "MANIT Bhopal": 16, "NIT Hamirpur": 17, "IIEST Shibpur": 18,
  "NIT Goa": 19, "NIT Raipur": 20, "NIT Agartala": 21,
  "NIT Meghalaya": 22, "NIT Sikkim": 23, "NIT, Manipur": 24,
  "NIT, Mizoram": 25, "NIT Nagaland": 26, "NIT, Uttarakhand": 27,
  "NIT, Andhra Pradesh": 28, "NIT, Srinagar": 29, "NIT Puducherry": 30,
  "NIT Jalandhar": 31, "NIT Arunachal Pradesh": 32,
};

function matchesBranch(branch: string, keywords: string[]) {
  const b = branch.toLowerCase();
  return keywords.some((k) => b.includes(k));
}

function getHighlights(results: Result[]) {
  const cse = results.filter((r) => matchesBranch(r.branch, CSE_KEYWORDS)).slice(0, 10);
  const ee = results.filter((r) => matchesBranch(r.branch, EE_KEYWORDS)).slice(0, 10);
  const mnc = results.filter((r) => matchesBranch(r.branch, MNC_KEYWORDS)).slice(0, 10);

  // Top 5 NITs by NIRF — one best branch per NIT
  const seen = new Set<string>();
  const topNITs = results
    .filter((r) => NIRF_RANK[r.institute] !== undefined)
    .sort((a, b) => (NIRF_RANK[a.institute] ?? 99) - (NIRF_RANK[b.institute] ?? 99))
    .filter((r) => {
      if (seen.has(r.institute)) return false;
      seen.add(r.institute);
      return true;
    })
    .slice(0, 10);

  return { cse, ee, mnc, topNITs };
}

const CARD_STYLES: Record<string, { border: string; header: string; badge: string }> = {
  blue:   { border: "border-blue-200",   header: "bg-blue-50 text-blue-700",   badge: "bg-blue-100 text-blue-700" },
  green:  { border: "border-green-200",  header: "bg-green-50 text-green-700", badge: "bg-green-100 text-green-700" },
  purple: { border: "border-purple-200", header: "bg-purple-50 text-purple-700", badge: "bg-purple-100 text-purple-700" },
  orange: { border: "border-orange-200", header: "bg-orange-50 text-orange-700", badge: "bg-orange-100 text-orange-700" },
};

const DEFAULT_VISIBLE = 3;

function HighlightCard({ title, accent, items, userRank, showNirf }: {
  title: string;
  accent: keyof typeof CARD_STYLES;
  items: Result[];
  userRank: number;
  showNirf?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const s = CARD_STYLES[accent];
  const visible = expanded ? items : items.slice(0, DEFAULT_VISIBLE);
  return (
    <div className={`rounded-2xl border ${s.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`px-5 py-3.5 ${s.header}`}>
        <p className="text-sm font-bold">{title}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {visible.map((r, i) => {
          const isBorderline = r.closing_rank - userRank <= BORDERLINE_MARGIN;
          return (
            <div key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0 flex items-center gap-3">
                {showNirf && (
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${s.badge}`}>
                    #{NIRF_RANK[r.institute]}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{r.institute}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{r.branch}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-base font-bold tabular-nums ${isBorderline ? "text-amber-600" : "text-slate-800"}`}>
                  {r.closing_rank.toLocaleString()}
                </p>
                {isBorderline && <p className="text-xs text-amber-500">borderline</p>}
              </div>
            </div>
          );
        })}
      </div>
      {items.length > DEFAULT_VISIBLE && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className={`w-full py-2.5 text-xs font-semibold border-t ${s.border} ${s.header} hover:opacity-80 transition`}
        >
          {expanded ? "Show less" : `Show ${items.length - DEFAULT_VISIBLE} more`}
        </button>
      )}
    </div>
  );
}

function QuotaBadge({ quota }: { quota: string }) {
  const isHS = quota.toUpperCase() === "HS";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        isHS
          ? "bg-violet-100 text-violet-700"
          : "bg-sky-100 text-sky-700"
      }`}
    >
      {quota.toUpperCase()}
    </span>
  );
}

export default function ResultsTable({
  results,
  total,
  userRank,
}: ResultsTableProps) {
  const [search, setSearch] = useState("");
  const [tableOpen, setTableOpen] = useState(false);

  const filtered = results.filter(
    (r) =>
      r.institute.toLowerCase().includes(search.toLowerCase()) ||
      r.branch.toLowerCase().includes(search.toLowerCase())
  );

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mb-4 text-5xl">🔍</div>
        <h3 className="text-lg font-semibold text-slate-800">
          No options found
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          No colleges or branches are available for your rank, category, and
          gender combination. Try adjusting your filters.
        </p>
      </div>
    );
  }

  const borderlineCount = results.filter(
    (r) => r.closing_rank - userRank <= BORDERLINE_MARGIN && r.closing_rank >= userRank
  ).length;

  const { cse, ee, mnc, topNITs } = getHighlights(results);

  return (
    <div className="space-y-5">
      {/* Highlights */}
      <div className="grid grid-cols-2 gap-4">
        <HighlightCard title="Top CSE Options" accent="blue" items={cse} userRank={userRank} />
        <HighlightCard title="Top EE Options" accent="green" items={ee} userRank={userRank} />
        <HighlightCard title="Top MnC Options" accent="purple" items={mnc} userRank={userRank} />
        <HighlightCard title="Top NITs by NIRF" accent="orange" items={topNITs} userRank={userRank} showNirf />
      </div>

      {/* Collapsible full list */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setTableOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-slate-800">View all {total} options</span>
            {borderlineCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {borderlineCount} borderline
              </span>
            )}
          </div>
          <svg
            className={`h-5 w-5 text-slate-400 transition-transform ${tableOpen ? "rotate-180" : ""}`}
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </button>

        {tableOpen && (
          <>
            {/* Search */}
            <div className="px-4 pb-3 border-t border-slate-100">
              <div className="relative mt-3">
                <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.65 10.65Z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by college or branch…"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

      {/* Table */}
      <div className="border-t border-slate-100 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-3.5 pl-5 pr-3 text-left">#</th>
                <th className="py-3.5 px-3 text-left">Institute</th>
                <th className="py-3.5 px-3 text-left">Branch</th>
                <th className="py-3.5 px-3 text-left">Quota</th>
                <th className="py-3.5 px-3 text-right">Opening Rank</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Closing Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row, idx) => {
                const isBorderline =
                  row.closing_rank - userRank <= BORDERLINE_MARGIN &&
                  row.closing_rank >= userRank;
                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isBorderline
                        ? "bg-amber-50 hover:bg-amber-100"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-3 pl-5 pr-3 text-slate-400 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900">
                      {row.institute}
                    </td>
                    <td className="py-3 px-3 text-slate-700">{row.branch}</td>
                    <td className="py-3 px-3">
                      <QuotaBadge quota={row.quota} />
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-600">
                      {row.opening_rank > 0
                        ? row.opening_rank.toLocaleString()
                        : "—"}
                    </td>
                    <td
                      className={`py-3 pl-3 pr-5 text-right tabular-nums font-semibold ${
                        isBorderline ? "text-amber-700" : "text-slate-800"
                      }`}
                    >
                      {row.closing_rank.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    No results match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.map((row, idx) => {
            const isBorderline =
              row.closing_rank - userRank <= BORDERLINE_MARGIN &&
              row.closing_rank >= userRank;
            return (
              <div
                key={idx}
                className={`p-4 ${
                  isBorderline ? "bg-amber-50" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">
                      {row.institute}
                    </p>
                    <p className="text-slate-600 text-xs mt-0.5 leading-snug">
                      {row.branch}
                    </p>
                  </div>
                  <QuotaBadge quota={row.quota} />
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                  <span>
                    Opening:{" "}
                    <span className="font-medium text-slate-700">
                      {row.opening_rank > 0
                        ? row.opening_rank.toLocaleString()
                        : "—"}
                    </span>
                  </span>
                  <span>
                    Closing:{" "}
                    <span
                      className={`font-bold ${
                        isBorderline ? "text-amber-700" : "text-slate-900"
                      }`}
                    >
                      {row.closing_rank.toLocaleString()}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">
              No results match your search.
            </div>
          )}
        </div>
      </div>

            {search && (
              <p className="px-5 pb-3 text-xs text-slate-500 text-right">
                Showing {filtered.length} of {total} results
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
