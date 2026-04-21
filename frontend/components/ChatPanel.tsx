"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { Result } from "./ResultsTable";

const CSE_KW = ["computer science", "data science", "artificial intelligence", "information technology", "computing"];
const EE_KW = ["electrical", "electronics", "internet of things"];
const MNC_KW = ["mathematics", "mathematical"];

const PRESTIGE_RANK: Record<string, number> = {
  "NIT Trichy": 9, "NIT, Rourkela": 13, "NIT Karnataka, Surathkal": 17,
  "NIT Calicut": 21, "NIT, Warangal": 28, "MNIT Jaipur": 42,
  "VNIT Nagpur": 44, "NIT Durgapur": 49, "NIT, Silchar": 50,
  "NIT Patna": 53, "IIEST Shibpur": 54, "NIT Jalandhar": 55,
  "MNNIT Allahabad": 62, "NIT Delhi": 65, "SVNIT Surat": 66,
  "MANIT Bhopal": 81, "NIT, Jamshedpur": 82, "NIT Meghalaya": 83,
  "NIT, Kurukshetra": 85, "NIT Raipur": 86, "NIT Hamirpur": 97,
  "NIT Puducherry": 99,
  "Atal Bihari Vajpayee Indian Institute of Information Technology & Management Gwalior": 96,
  "Birla Institute of Technology, Mesra,  Ranchi": 51,
};

export interface ChatPanelProps {
  results: Result[];
  total: number;
  userRank: number;
  category: string;
  gender: string;
  state: string;
}

const PICKS = [
  { label: "Top CSE", kw: CSE_KW, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100" },
  { label: "Top EE / ECE", kw: EE_KW, color: "text-green-700", bg: "bg-green-50", border: "border-green-100" },
  { label: "Top MnC", kw: MNC_KW, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-100" },
];

export default function ChatPanel({ results: _results }: ChatPanelProps) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const [emailInput, setEmailInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes("@")) {
      setEmailError("Please enter a valid email.");
      return;
    }
    const trimmed = emailInput.trim().toLowerCase();
    localStorage.setItem("josaa_advisor_email", trimmed);
    if (posthog.__loaded) {
      posthog.identify(trimmed, { email: trimmed });
      posthog.capture("counsellor_waitlist_signup");
    }
    setSubmitted(true);
  }

  return (
    <div>
      {/* Counsellor waitlist */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
        {submitted ? (
          <div className="text-center py-1">
            <p className="text-sm font-semibold text-blue-800">You're on the list!</p>
            <p className="text-xs text-blue-600 mt-0.5">We'll reach out when JOSAA Counsellor launches.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-3">
              <div className="shrink-0 mt-0.5 h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">JOSAA Counsellor — Coming Soon</p>
                <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">Get personalised advice on which college and branch to choose, round strategy, and more. Free.</p>
              </div>
            </div>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setEmailError(""); }}
                placeholder="your@email.com"
                className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button type="submit"
                className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
                Notify me
              </button>
            </form>
            {emailError && <p className="mt-1.5 text-xs text-red-500">{emailError}</p>}
          </>
        )}
      </div>
    </div>
  );
}

