"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface Result {
  institute: string;
  branch: string;
  quota: string;
  opening_rank: number;
  closing_rank: number;
  prev_closing_rank: number | null;
}

interface ResultsTableProps {
  results: Result[];
  total: number;
  userRank: number;
  category?: string;
  gender?: string;
  state?: string;
}

const BORDERLINE_MARGIN = 2000;

const CSE_KEYWORDS = ["computer science", "data science", "artificial intelligence", "information technology", "computing"];
const EE_KEYWORDS = ["electrical", "electronics", "internet of things"];
const MNC_KEYWORDS = ["mathematics", "mathematical"];

// NIRF 2024 Engineering Rankings — only institutions appearing in JOSAA
// Keys must match backend short_inst() output exactly
const PRESTIGE_RANK: Record<string, number> = {
  // NITs
  "NIT Trichy": 9,
  "NIT, Rourkela": 13,
  "NIT Karnataka, Surathkal": 17,
  "NIT Calicut": 21,
  "NIT, Warangal": 28,
  "MNIT Jaipur": 42,
  "VNIT Nagpur": 44,
  "NIT Durgapur": 49,
  "NIT, Silchar": 50,
  "NIT Patna": 53,
  "IIEST Shibpur": 54,
  "NIT Jalandhar": 55,
  "MNNIT Allahabad": 62,
  "NIT Delhi": 65,
  "SVNIT Surat": 66,
  "MANIT Bhopal": 81,
  "NIT, Jamshedpur": 82,
  "NIT Meghalaya": 83,
  "NIT, Kurukshetra": 85,
  "NIT Raipur": 86,
  "NIT Hamirpur": 97,
  "NIT Puducherry": 99,
  // IIITs (NIRF 2024)
  "Atal Bihari Vajpayee Indian Institute of Information Technology & Management Gwalior": 96,
  // GFTIs (NIRF 2024)
  "Birla Institute of Technology, Mesra,  Ranchi": 51,
};

function matchesBranch(branch: string, keywords: string[]) {
  const b = branch.toLowerCase();
  return keywords.some((k) => b.includes(k));
}

function getHighlights(results: Result[]) {
  const cse = results.filter((r) => matchesBranch(r.branch, CSE_KEYWORDS)).slice(0, 10);
  const ee = results.filter((r) => matchesBranch(r.branch, EE_KEYWORDS)).slice(0, 10);
  const mnc = results.filter((r) => matchesBranch(r.branch, MNC_KEYWORDS)).slice(0, 10);

  // Best colleges by prestige rank (NITs + IIITs + top GFTIs) — one entry per institute
  const seen = new Set<string>();
  const bestColleges = results
    .filter((r) => PRESTIGE_RANK[r.institute] !== undefined)
    .sort((a, b) => (PRESTIGE_RANK[a.institute] ?? 999) - (PRESTIGE_RANK[b.institute] ?? 999))
    .filter((r) => {
      if (seen.has(r.institute)) return false;
      seen.add(r.institute);
      return true;
    })
    .slice(0, 10);

  return { cse, ee, mnc, bestColleges };
}

const CARD_STYLES: Record<string, { border: string; header: string; badge: string }> = {
  blue:   { border: "border-blue-200",   header: "bg-blue-50 text-blue-700",   badge: "bg-blue-100 text-blue-700" },
  green:  { border: "border-green-200",  header: "bg-green-50 text-green-700", badge: "bg-green-100 text-green-700" },
  purple: { border: "border-purple-200", header: "bg-purple-50 text-purple-700", badge: "bg-purple-100 text-purple-700" },
  orange: { border: "border-orange-200", header: "bg-orange-50 text-orange-700", badge: "bg-orange-100 text-orange-700" },
};

const DEFAULT_VISIBLE = 3;

function HighlightCard({ title, accent, items, userRank, showNirf, onCollegeClick }: {
  title: string;
  accent: keyof typeof CARD_STYLES;
  items: Result[];
  userRank: number;
  showNirf?: boolean;
  onCollegeClick: (college: string) => void;
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
      {/* Column headers */}
      <div className="flex items-center px-4 py-2 border-b border-slate-100 bg-slate-50">
        <div className="flex-1 min-w-0" />
        <div className="shrink-0 flex gap-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
          <span className="w-14 text-right">2025</span>
          <span className="w-14 text-right">2024</span>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {visible.map((r, i) => {
          const isBorderline = r.closing_rank - userRank <= BORDERLINE_MARGIN;
          return (
            <div key={i} className="flex items-start gap-2 px-4 py-3">
              <div className="min-w-0 flex-1 flex items-start gap-2">
                {showNirf && (
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${s.badge}`}>
                    NIRF #{PRESTIGE_RANK[r.institute]}
                  </span>
                )}
                <div className="min-w-0">
                  <button
                    onClick={() => onCollegeClick(r.institute)}
                    className="text-sm font-semibold text-slate-900 leading-snug hover:text-blue-600 hover:underline text-left transition-colors"
                  >
                    {r.institute}
                  </button>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{r.branch}</p>
                </div>
              </div>
              <div className="shrink-0 flex gap-3">
                <p className={`w-14 text-right tabular-nums font-bold ${isBorderline ? "text-amber-600" : "text-slate-800"}`}>
                  {r.closing_rank.toLocaleString()}
                </p>
                <p className="w-14 text-right tabular-nums text-slate-400">
                  {r.prev_closing_rank != null ? r.prev_closing_rank.toLocaleString() : "—"}
                </p>
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

function TrendBadge({ current, prev }: { current: number; prev: number | null }) {
  if (!prev) return null;
  const delta = current - prev; // positive = rank went up (harder), negative = easier
  if (Math.abs(delta) < 100) return null; // too small to show
  const harder = delta > 0;
  return (
    <span className={`text-xs tabular-nums font-medium ${harder ? "text-red-500" : "text-green-600"}`}>
      {harder ? "▲" : "▼"}{Math.abs(delta).toLocaleString()}
    </span>
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

function CollegeDrawer({ college, entries, userRank, category, gender, state, onClose }: {
  college: string;
  entries: Result[];
  userRank: number;
  category: string;
  gender: string;
  state: string;
  onClose: () => void;
}) {
  const [outOfReach, setOutOfReach] = useState<Result[]>([]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const params = new URLSearchParams({ institute: college, category, gender, state });
    fetch(`${API_URL}/api/college?${params}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.url}`)))
      .then((d: { results: Result[] }) => {
        const inRangeSet = new Set(entries.map((e) => e.branch + e.quota));
        const oor = (d.results ?? []).filter((r) => !inRangeSet.has(r.branch + r.quota));
        setOutOfReach(oor);
      })
      .catch((err) => console.error("college fetch failed:", err));
  }, [college, category, gender, state]);

  const sorted = [...entries].sort((a, b) => a.closing_rank - b.closing_rank);
  const nirfRank = PRESTIGE_RANK[college];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {nirfRank && (
              <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700 mb-1 inline-block">
                NIRF #{nirfRank}
              </span>
            )}
            <h2 className="text-base font-bold text-slate-900 leading-snug">{college}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{sorted.length} branch{sorted.length !== 1 ? "es" : ""} available for your rank</p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 hover:bg-slate-100 transition text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Column headers */}
        <div className="flex items-center px-5 py-2 bg-slate-50 border-b border-slate-100">
          <div className="flex-1 min-w-0 text-xs font-semibold text-slate-400 uppercase tracking-wide">Branch</div>
          <div className="shrink-0 flex gap-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <span className="w-10 text-right">Quota</span>
            <span className="w-14 text-right">2025</span>
            <span className="w-14 text-right">2024</span>
          </div>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1">
          {outOfReach.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-5 py-2 bg-slate-100 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Out of reach last year</span>
              </div>
              <div className="divide-y divide-slate-100">
                {outOfReach.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 opacity-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-600 leading-snug">{r.branch}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <div className="w-10 flex justify-end"><QuotaBadge quota={r.quota} /></div>
                      <p className="w-14 text-right tabular-nums font-semibold text-sm text-slate-500">
                        {r.closing_rank.toLocaleString()}
                      </p>
                      <p className="w-14 text-right tabular-nums text-sm text-slate-400">
                        {r.prev_closing_rank != null ? r.prev_closing_rank.toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 px-5 py-2 bg-slate-100 border-t border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">In range for your rank</span>
              </div>
            </>
          )}
          <div className="divide-y divide-slate-100">
            {sorted.map((r, i) => {
              const isBorderline = r.closing_rank - userRank <= BORDERLINE_MARGIN;
              return (
                <div key={i} className={`flex items-center gap-3 px-5 py-3 ${isBorderline ? "bg-amber-50" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 leading-snug">{r.branch}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <div className="w-10 flex justify-end"><QuotaBadge quota={r.quota} /></div>
                    <p className={`w-14 text-right tabular-nums font-bold text-sm ${isBorderline ? "text-amber-700" : "text-slate-800"}`}>
                      {r.closing_rank.toLocaleString()}
                    </p>
                    <p className="w-14 text-right tabular-nums text-sm text-slate-400">
                      {r.prev_closing_rank != null ? r.prev_closing_rank.toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

type InstFilter = "all" | "nit" | "iiit" | "gfti";

function classifyInstitute(institute: string): "nit" | "iiit" | "gfti" {
  const l = institute.toLowerCase();
  // Match shortened NIT names produced by backend short_inst()
  if (
    l.startsWith("nit ") || l.startsWith("nit,") ||
    l.includes("mnnit") || l.includes("svnit") ||
    l.includes("vnit") || l.includes("manit") ||
    l.includes("mnit") || l.includes("iiest")
  ) return "nit";
  // IIITs — must say "indian/international institute of information technology"
  // or contain the IIIT abbreviation. Avoids matching NIELITs.
  if (
    l.includes("indian institute of information technology") ||
    l.includes("international institute of information technology") ||
    l.includes("iiit") ||
    l.startsWith("atal bihari") ||
    l.startsWith("pt. dwarka")
  ) return "iiit";
  return "gfti";
}

export default function ResultsTable({
  results,
  total,
  userRank,
  category = "",
  gender = "",
  state = "",
}: ResultsTableProps) {
  const [search, setSearch] = useState("");
  const [tableOpen, setTableOpen] = useState(true);
  const [instFilter, setInstFilter] = useState<InstFilter>("all");
  const [selectedCollege, setSelectedCollege] = useState<string | null>(null);
  const collegeEntries = selectedCollege ? results.filter((r) => r.institute === selectedCollege) : [];

  const filtered = results.filter((r) => {
    const matchesSearch =
      r.institute.toLowerCase().includes(search.toLowerCase()) ||
      r.branch.toLowerCase().includes(search.toLowerCase());
    const matchesType = instFilter === "all" || classifyInstitute(r.institute) === instFilter;
    return matchesSearch && matchesType;
  });

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

  const { cse, ee, mnc, bestColleges } = getHighlights(results);

  return (
    <div className="space-y-5">
      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <HighlightCard title="Top CSE Options" accent="blue" items={cse} userRank={userRank} onCollegeClick={setSelectedCollege} />
        <HighlightCard title="Top EE Options" accent="green" items={ee} userRank={userRank} onCollegeClick={setSelectedCollege} />
        <HighlightCard title="Top MnC Options" accent="purple" items={mnc} userRank={userRank} onCollegeClick={setSelectedCollege} />
        <HighlightCard title="Best Colleges" accent="orange" items={bestColleges} userRank={userRank} showNirf onCollegeClick={setSelectedCollege} />
      </div>

      {/* All options card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
          <button
            onClick={() => setTableOpen((o) => !o)}
            className="w-full flex items-center justify-between mb-3 hover:opacity-75 transition text-left"
          >
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-slate-800">
                All Options
                <span className="ml-2 text-slate-400 font-normal">{filtered.length} results</span>
              </p>
              {borderlineCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  {borderlineCount} borderline
                </span>
              )}
            </div>
            <svg className={`h-5 w-5 text-slate-400 transition-transform ${tableOpen ? "rotate-180" : ""}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </button>
          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "nit", "iiit", "gfti"] as InstFilter[]).map((f) => {
              const counts: Record<InstFilter, number> = {
                all: results.length,
                nit: results.filter((r) => classifyInstitute(r.institute) === "nit").length,
                iiit: results.filter((r) => classifyInstitute(r.institute) === "iiit").length,
                gfti: results.filter((r) => classifyInstitute(r.institute) === "gfti").length,
              };
              const labels: Record<InstFilter, string> = { all: "All", nit: "NITs", iiit: "IIITs", gfti: "GFTIs" };
              const active = instFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setInstFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
                  }`}
                >
                  {labels[f]} <span className={active ? "text-blue-200" : "text-slate-400"}>{counts[f]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {tableOpen && (
          <>
            {/* Search */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="relative">
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
                <th className="py-3.5 px-3 text-right">2025 CR</th>
                <th className="py-3.5 px-3 text-right">2024 CR</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row, idx) => {
                const isBorderline =
                  row.closing_rank - userRank <= BORDERLINE_MARGIN &&
                  row.closing_rank >= userRank;
                const delta = row.prev_closing_rank != null ? row.closing_rank - row.prev_closing_rank : null;
                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isBorderline
                        ? "bg-amber-50 hover:bg-amber-100"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-3 pl-5 pr-3 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">
                      <button onClick={() => setSelectedCollege(row.institute)} className="hover:text-blue-600 hover:underline text-left transition-colors">
                        {row.institute}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{row.branch}</td>
                    <td className="py-3 px-3"><QuotaBadge quota={row.quota} /></td>
                    <td className={`py-3 px-3 text-right tabular-nums font-semibold ${isBorderline ? "text-amber-700" : "text-slate-800"}`}>
                      {row.closing_rank.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-500">
                      {row.prev_closing_rank != null ? row.prev_closing_rank.toLocaleString() : "—"}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right tabular-nums text-xs font-semibold">
                      {delta != null && Math.abs(delta) >= 100 ? (
                        <span className={delta > 0 ? "text-red-500" : "text-green-600"}>
                          {delta > 0 ? "▲" : "▼"}{Math.abs(delta).toLocaleString()}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                    No results match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          {/* Column headers */}
          <div className="flex items-center px-4 py-2 bg-slate-50 border-b border-slate-100">
            <div className="flex-1 min-w-0" />
            <div className="shrink-0 flex gap-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              <span className="w-14 text-right">2025</span>
              <span className="w-14 text-right">2024</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
          {filtered.map((row, idx) => {
            const isBorderline =
              row.closing_rank - userRank <= BORDERLINE_MARGIN &&
              row.closing_rank >= userRank;
            return (
              <div
                key={idx}
                className={`flex items-start gap-2 px-4 py-3 ${isBorderline ? "bg-amber-50" : "bg-white"}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <button onClick={() => setSelectedCollege(row.institute)} className="font-semibold text-slate-900 text-sm leading-snug hover:text-blue-600 hover:underline text-left transition-colors">
                        {row.institute}
                      </button>
                      <p className="text-slate-500 text-xs mt-0.5 leading-snug">{row.branch}</p>
                    </div>
                    <QuotaBadge quota={row.quota} />
                  </div>
                </div>
                <div className="shrink-0 flex gap-3">
                  <p className={`w-14 text-right tabular-nums font-bold ${isBorderline ? "text-amber-700" : "text-slate-800"}`}>
                    {row.closing_rank.toLocaleString()}
                  </p>
                  <p className="w-14 text-right tabular-nums text-slate-400">
                    {row.prev_closing_rank != null ? row.prev_closing_rank.toLocaleString() : "—"}
                  </p>
                </div>
              </div>
            );
          })}
          </div>
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

      {selectedCollege && (
        <CollegeDrawer
          college={selectedCollege}
          entries={collegeEntries}
          userRank={userRank}
          category={category}
          gender={gender}
          state={state}
          onClose={() => setSelectedCollege(null)}
        />
      )}
    </div>
  );
}
