"""
JOSAA Rank Finder — FastAPI backend
"""

import os
import json
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel, EmailStr
import httpx
from openai import AsyncOpenAI
import pandas as pd
import psycopg2
import psycopg2.pool
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
# Database
# ---------------------------------------------------------------------------

_db_pool: Optional[psycopg2.pool.SimpleConnectionPool] = None


def get_db_pool() -> Optional[psycopg2.pool.SimpleConnectionPool]:
    global _db_pool
    if _db_pool is None:
        url = os.environ.get("DATABASE_URL")
        if not url:
            return None
        # Supabase/Railway use postgres:// — psycopg2 needs postgresql://
        url = url.replace("postgres://", "postgresql://", 1)
        _db_pool = psycopg2.pool.SimpleConnectionPool(1, 5, url)
    return _db_pool


def init_db():
    pool = get_db_pool()
    if not pool:
        print("DATABASE_URL not set — waitlist DB disabled")
        return
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS waitlist (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
        conn.commit()
        print("Waitlist table ready")
    finally:
        pool.putconn(conn)


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
    init_db()


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


@app.get("/api/college")
def get_college(
    institute: str = Query(..., description="Short institute name (as returned by /api/options)"),
    category: str = Query(...),
    gender: str = Query(...),
    state: str = Query(""),
):
    df = load_data()

    if gender == "Gender-Neutral":
        gender_filter = "Gender-Neutral"
    elif gender == "Female-only":
        gender_filter = "Female-only"
    else:
        raise HTTPException(status_code=400, detail="Invalid gender")

    latest_year = int(df["Year"].max())
    prev_year = latest_year - 1

    mask_base = (
        (df["Year"] == latest_year) &
        (df["SeatType"].str.upper() == category.upper()) &
        df["Gender"].str.startswith(gender_filter)
    )

    hs_keywords = HOME_STATE_MAP.get(state, [])

    def is_home_state(inst_name: str) -> bool:
        return any(kw in inst_name.lower() for kw in hs_keywords)

    eligible = df[mask_base].copy()
    eligible["_short"] = eligible["Institute"].apply(short_inst)
    eligible = eligible[eligible["_short"] == institute]

    if eligible.empty:
        return {"results": []}

    eligible["_is_hs"] = eligible["Institute"].apply(is_home_state)
    quota_upper = eligible["Quota"].str.upper()
    eligible = eligible[
        (quota_upper == "AI") |
        (eligible["_is_hs"] & (quota_upper == "HS")) |
        (~eligible["_is_hs"] & (quota_upper == "OS"))
    ]
    eligible = eligible[~eligible["Branch"].str.lower().str.contains("architecture", na=False)]

    # Previous year lookup
    prev_df = df[
        (df["Year"] == prev_year) &
        (df["SeatType"].str.upper() == category.upper()) &
        df["Gender"].str.startswith(gender_filter)
    ][["Institute", "Branch", "Quota", "ClosingRank"]].copy()
    prev_df["Institute"] = prev_df["Institute"].apply(short_inst)
    prev_df["Branch"] = prev_df["Branch"].apply(short_branch)
    prev_df = prev_df.rename(columns={"ClosingRank": "PrevClosingRank"})
    prev_lookup = prev_df.set_index(["Institute", "Branch", "Quota"])["PrevClosingRank"].to_dict()

    eligible["Branch"] = eligible["Branch"].apply(short_branch)
    eligible["Institute"] = eligible["Institute"].apply(short_inst)
    eligible = eligible.sort_values("ClosingRank")

    results = []
    for _, row in eligible.iterrows():
        prev_cr = prev_lookup.get((row["Institute"], row["Branch"], row["Quota"]))
        results.append({
            "institute": row["Institute"],
            "branch": row["Branch"],
            "quota": row["Quota"],
            "opening_rank": int(row["OpeningRank"]),
            "closing_rank": int(row["ClosingRank"]),
            "prev_closing_rank": int(prev_cr) if pd.notna(prev_cr) else None,
        })

    return {"results": results}


@app.get("/health")
def health():
    return {"status": "ok", "rows_loaded": len(load_data())}


class WaitlistRequest(BaseModel):
    email: str


@app.post("/api/waitlist")
def join_waitlist(body: WaitlistRequest):
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    pool = get_db_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Database not configured")
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO waitlist (email) VALUES (%s) ON CONFLICT (email) DO NOTHING",
                (email,)
            )
        conn.commit()
        return {"ok": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        pool.putconn(conn)


def _build_josaa_system(ctx: dict) -> str:
    rank = ctx.get("rank", "unknown")
    category = ctx.get("category", "OPEN")
    gender = ctx.get("gender", "Gender-Neutral")
    state = ctx.get("state") or "not specified"
    total = ctx.get("totalOptions", 0)
    borderline = ctx.get("borderlineCount", 0)
    best_cse = ctx.get("bestCse") or "none in range"
    best_ee = ctx.get("bestEe") or "none in range"
    best_mnc = ctx.get("bestMnc") or "none in range"
    best_college = ctx.get("bestCollege") or "none in range"

    return f"""You are a JOSAA counseling expert helping JEE students and their parents choose between colleges and branches.

STUDENT'S SITUATION:
- Rank {rank} | {category} category | {gender} | Home state: {state}
- {total} eligible options found
- Borderline options (closing rank within 2000 of their rank): {borderline}
- Best CSE/IT option: {best_cse}
- Best EE/ECE option: {best_ee}
- Best MnC (Maths & Computing) option: {best_mnc}
- Best college by NIRF ranking: {best_college}

JOSAA PROCESS:
- 6 rounds. After each round you choose: Freeze (accept, done), Float (keep current seat but auto-upgrade if something better opens), Slide (keep current college, upgrade branch only). Round 6 is final — must freeze or lose seat.
- Withdraw = give up seat entirely. Only do this if you plan to take a drop year.

QUOTAS:
- HS (Home State): reserved seats at your home state's NIT, fewer seats but accessible to locals.
- OS (Other State): for students from other states at NITs, more seats, slightly higher cutoffs.
- AI (All India): IIITs and GFTIs, no state restriction, everyone competes together.

NIT TIERS (NIRF 2024):
- Tier 1: NIT Trichy, NIT Rourkela, NIT Karnataka Surathkal, NIT Warangal, NIT Calicut
- Tier 2: VNIT Nagpur, NIT Kurukshetra, MNNIT Allahabad, NIT Silchar, NIT Durgapur, MNIT Jaipur, SVNIT Surat, MANIT Bhopal
- Tier 3: NIT Hamirpur, IIEST Shibpur, NIT Patna, NIT Jalandhar, and rest

BRANCH REALITY FOR JOBS:
- CSE = best for software, highest demand, most placements
- MnC (Mathematics and Computing) = underrated, nearly equal to CSE outcomes, treat same as CSE
- ECE (Electronics & Communication) = excellent — most ECE grads get software jobs, also great for VLSI/semiconductor careers
- EE (Electrical) = strong at tier-1 NITs for core/PSU jobs, decent software placements at top NITs
- Mechanical, Civil = good at tier-1 NITs for core jobs; weak placement for software roles

DECISION FRAMEWORK:
- Same tier: CSE > MnC > ECE > EE > Mech/Civil
- 1 tier apart: CSE at lower NIT vs ECE at upper NIT → lean CSE for software careers
- 2+ tiers apart: take the better college in any branch — brand and campus culture matter more
- IIITs: IIIT Allahabad and Gwalior are top-tier for CS, better than most NITs. Other IIITs vary — roughly equal to tier-2/3 NITs.
- MnC at NIT Warangal/Trichy > CSE at a tier-3 NIT

RESPONSE RULES:
- Lead with a clear recommendation. Explain after, not before.
- Use plain language — explain acronyms the first time (e.g. "ECE — Electronics and Communication Engineering").
- Under 120 words unless the question genuinely needs more.
- Never invent specific salary figures or placement percentages.
- Never say "it depends" without immediately saying what it depends on and what you'd recommend."""


@app.post("/api/chat")
async def chat_endpoint(request: Request):
    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        return Response(
            content=json.dumps({"error": "AI advisor not configured"}),
            status_code=503,
            media_type="application/json",
        )

    body = await request.json()
    messages = body.get("messages", [])[-10:]
    context = body.get("context", {})

    client = AsyncOpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
    system_content = _build_josaa_system(context)

    async def generate():
        try:
            stream = await client.chat.completions.create(
                model="grok-3-mini",
                messages=[{"role": "system", "content": system_content}] + messages,
                max_tokens=350,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'content': 'Sorry, something went wrong. Please try again.'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


POSTHOG_HOST = "https://us.i.posthog.com"
POSTHOG_ASSET_HOST = "https://us-assets.i.posthog.com"


@app.api_route("/ingest/static/{path:path}", methods=["GET", "POST", "OPTIONS", "HEAD"])
async def proxy_posthog_assets(path: str, request: Request):
    url = f"{POSTHOG_ASSET_HOST}/static/{path}"
    async with httpx.AsyncClient(follow_redirects=True) as client:
        headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")}
        resp = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=await request.body(),
            params=dict(request.query_params),
        )
    return Response(content=resp.content, status_code=resp.status_code,
                    media_type=resp.headers.get("content-type"))


@app.api_route("/ingest/{path:path}", methods=["GET", "POST", "OPTIONS", "HEAD"])
async def proxy_posthog(path: str, request: Request):
    url = f"{POSTHOG_HOST}/{path}"
    async with httpx.AsyncClient(follow_redirects=True) as client:
        headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")}
        resp = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=await request.body(),
            params=dict(request.query_params),
        )
    return Response(content=resp.content, status_code=resp.status_code,
                    media_type=resp.headers.get("content-type"))


# Serve Next.js static export — must be last
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
