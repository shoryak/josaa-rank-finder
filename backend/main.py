"""
JOSAA Rank Finder — FastAPI backend
"""

import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pandas as pd
from typing import Optional

app = FastAPI(title="JOSAA Rank Finder API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "out")

# ---------------------------------------------------------------------------
# State → home-state institute keywords mapping
# ---------------------------------------------------------------------------
HOME_STATE_MAP: dict[str, list[str]] = {
    "UP": [
        "motilal nehru national institute of technology allahabad",
        "indian institute of information technology allahabad",
        "indian institute of information technology lucknow",
        "harcourt butler technical university",
        "madan mohan malaviya university",
    ],
    "Rajasthan": [
        "malaviya national institute of technology",
        "mnit jaipur",
    ],
    "Maharashtra": [
        "visvesvaraya national institute of technology",
        "vnit nagpur",
    ],
    "Karnataka": [
        "nit karnataka",
        "nit surathkal",
        "national institute of technology karnataka",
    ],
    "West Bengal": [
        "iiest shibpur",
        "indian institute of engineering science and technology",
        "national institute of technology durgapur",
    ],
    "Andhra Pradesh": [
        "national institute of technology andhra pradesh",
        "national institute of technology warangal",
    ],
    "Telangana": [
        "national institute of technology warangal",
    ],
    "Tamil Nadu": [
        "national institute of technology tiruchirappalli",
        "nit tiruchirappalli",
    ],
    "Bihar": [
        "national institute of technology patna",
    ],
    "Odisha": [
        "national institute of technology rourkela",
    ],
    "Madhya Pradesh": [
        "maulana azad national institute of technology",
        "national institute of technology bhopal",
    ],
    "Gujarat": [
        "sardar vallabhbhai national institute of technology",
        "svnit surat",
    ],
    "Punjab": [
        "dr. b r ambedkar national institute of technology",
        "nit jalandhar",
    ],
    "Himachal Pradesh": [
        "national institute of technology hamirpur",
    ],
    "Uttarakhand": [
        "national institute of technology uttarakhand",
    ],
    "Jharkhand": [
        "national institute of technology jamshedpur",
    ],
    "Assam": [
        "national institute of technology silchar",
    ],
    "Manipur": [
        "national institute of technology manipur",
    ],
    "Meghalaya": [
        "national institute of technology meghalaya",
    ],
    "Mizoram": [
        "national institute of technology mizoram",
    ],
    "Nagaland": [
        "national institute of technology nagaland",
    ],
    "Sikkim": [
        "national institute of technology sikkim",
    ],
    "Tripura": [
        "national institute of technology agartala",
    ],
    "Arunachal Pradesh": [
        "national institute of technology arunachal pradesh",
    ],
    "Goa": [
        "national institute of technology goa",
    ],
    "Delhi": [
        "netaji subhas university of technology",
    ],
    "Chhattisgarh": [
        "national institute of technology raipur",
    ],
    "Kerala": [
        "national institute of technology calicut",
    ],
    "Haryana": [
        "national institute of technology kurukshetra",
    ],
}

# ---------------------------------------------------------------------------
# Name shortening helpers
# ---------------------------------------------------------------------------

def short_branch(b: str) -> str:
    replacements = [
        (" (4 Years, Bachelor of Technology)", ""),
        (" (5 Years, Bachelor of Architecture)", " (B.Arch)"),
        (" (5 Years, Bachelor and Master of Technology (Dual Degree))", " (Dual)"),
        (" (5 Years, Integrated Master of Science)", " (Int. MSc)"),
        (" (4 Years, Bachelor of Planning)", " (B.Plan)"),
        (" (5 Years, Integrated B. Tech. and M. Tech.)", " (Dual)"),
    ]
    for old, new in replacements:
        b = b.replace(old, new)
    return b.strip()


def short_inst(i: str) -> str:
    import re
    result = (
        i.replace("National Institute of Technology", "NIT")
         .replace("Indian Institute of Engineering Science and Technology, Shibpur", "IIEST Shibpur")
         .replace("Motilal Nehru NIT Allahabad", "MNNIT Allahabad")
         .replace("Sardar Vallabhbhai NIT, Surat", "SVNIT Surat")
         .replace("Visvesvaraya NIT, Nagpur", "VNIT Nagpur")
         .replace("Maulana Azad NIT Bhopal", "MANIT Bhopal")
         .replace("Malaviya NIT Jaipur", "MNIT Jaipur")
         .replace("Dr. B R Ambedkar NIT, Jalandhar", "NIT Jalandhar")
    )
    return re.sub(r' +', ' ', result).strip()


# ---------------------------------------------------------------------------
# Load data at startup
# ---------------------------------------------------------------------------

DATA_PATH = os.path.join(os.path.dirname(__file__), "josaa_data.txt")
_df: Optional[pd.DataFrame] = None


def load_data() -> pd.DataFrame:
    global _df
    if _df is not None:
        return _df

    df = pd.read_csv(DATA_PATH, sep="\t", dtype=str)
    df.columns = [c.strip() for c in df.columns]

    if "Year" not in df.columns:
        df["Year"] = "2025"

    df["Year"] = pd.to_numeric(df["Year"], errors="coerce").fillna(2025).astype(int)

    df["ClosingRank"] = pd.to_numeric(
        df["ClosingRank"].str.replace("P", "", regex=False).str.strip(), errors="coerce"
    )
    df["OpeningRank"] = pd.to_numeric(
        df["OpeningRank"].str.replace("P", "", regex=False).str.strip(), errors="coerce"
    )
    df = df.dropna(subset=["ClosingRank"])
    df["ClosingRank"] = df["ClosingRank"].astype(int)
    df["OpeningRank"] = df["OpeningRank"].fillna(0).astype(int)

    _df = df
    return _df


@app.on_event("startup")
def startup_event():
    load_data()
    print(f"Loaded {len(_df)} rows from josaa_data.txt")


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

VALID_CATEGORIES = {"OPEN", "OBC-NCL", "SC", "ST", "EWS", "OPEN (PwD)", "OBC-NCL (PwD)", "SC (PwD)", "ST (PwD)", "EWS (PwD)"}
VALID_GENDERS = {"Gender-Neutral", "Female-only"}


@app.get("/api/options")
def get_options(
    rank: int = Query(..., gt=0, description="JEE rank"),
    category: str = Query(..., description="Seat type e.g. OPEN, OBC-NCL"),
    gender: str = Query(..., description="Gender-Neutral or Female-only"),
    state: str = Query("", description="Home state for HS quota (optional)"),
):
    df = load_data()

    # Normalise gender query for matching against file values
    # File has: "Gender-Neutral" and "Female-only (including Supernumerary)"
    if gender == "Gender-Neutral":
        gender_filter = "Gender-Neutral"
    elif gender == "Female-only":
        gender_filter = "Female-only"
    else:
        raise HTTPException(status_code=400, detail="gender must be 'Gender-Neutral' or 'Female-only'")

    # Seat type filter
    mask_seat = df["SeatType"].str.upper() == category.upper()
    # Gender filter — file value for female rows starts with "Female-only"
    mask_gender = df["Gender"].str.startswith(gender_filter)
    # Rank filter — student is eligible where ClosingRank >= their rank
    mask_rank = df["ClosingRank"] >= rank

    # Use only latest year's data for current results
    latest_year = int(df["Year"].max())
    prev_year = latest_year - 1
    mask_year = df["Year"] == latest_year

    eligible = df[mask_seat & mask_gender & mask_rank & mask_year].copy()

    # Build previous year lookup — shorten names to match what we show in results
    prev_df = df[
        (df["Year"] == prev_year) &
        (df["SeatType"].str.upper() == category.upper()) &
        df["Gender"].str.startswith(gender_filter) &
        df["Quota"].str.upper().isin(["AI", "HS", "OS"])
    ][["Institute", "Branch", "Quota", "ClosingRank"]].copy()
    prev_df["Institute"] = prev_df["Institute"].apply(short_inst)
    prev_df["Branch"] = prev_df["Branch"].apply(short_branch)
    prev_df = prev_df.rename(columns={"ClosingRank": "PrevClosingRank"})
    prev_lookup = prev_df.set_index(["Institute", "Branch", "Quota"])["PrevClosingRank"].to_dict()

    if eligible.empty:
        return {"results": [], "total": 0}

    # Determine which institutes are home-state
    hs_keywords = HOME_STATE_MAP.get(state, [])

    def is_home_state(inst_name: str) -> bool:
        lower = inst_name.lower()
        return any(kw in lower for kw in hs_keywords)

    eligible["_is_hs"] = eligible["Institute"].apply(is_home_state)

    # AI quota = IIITs/GFTIs (all-India, always include)
    # HS quota = home-state NIT rows only
    # OS quota = non-home-state NIT rows only
    quota_upper = eligible["Quota"].str.upper()
    eligible = eligible[
        (quota_upper == "AI") |
        (eligible["_is_hs"] & (quota_upper == "HS")) |
        (~eligible["_is_hs"] & (quota_upper == "OS"))
    ]

    # Remove B.Arch — uses AAT ranks, not JEE
    eligible = eligible[~eligible["Branch"].str.lower().str.contains("architecture", na=False)]

    eligible = eligible.sort_values("ClosingRank")

    # Shorten display names
    eligible = eligible.copy()
    eligible["Branch"] = eligible["Branch"].apply(short_branch)
    eligible["Institute"] = eligible["Institute"].apply(short_inst)

    results = []
    for _, row in eligible.iterrows():
        prev_cr = prev_lookup.get((row["Institute"], row["Branch"], row["Quota"]))
        results.append(
            {
                "institute": row["Institute"],
                "branch": row["Branch"],
                "quota": row["Quota"],
                "opening_rank": int(row["OpeningRank"]),
                "closing_rank": int(row["ClosingRank"]),
                "prev_closing_rank": int(prev_cr) if pd.notna(prev_cr) else None,
            }
        )

    return {"results": results, "total": len(results)}


@app.get("/health")
def health():
    return {"status": "ok", "rows_loaded": len(load_data())}


# Serve Next.js static export — must be last
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
