# JOSAA Rank Finder

A full-stack web app that helps JEE students find every college and branch they can get into through JOSAA counselling, based on their rank, category, gender, and home state.

## Project Structure

```
josaa-rank-finder/
├── backend/          # FastAPI Python backend
│   ├── main.py
│   ├── requirements.txt
│   ├── Procfile      # Railway deploy config
│   └── josaa_data.txt
└── frontend/         # Next.js 14 + Tailwind frontend
    ├── app/
    ├── components/
    ├── .env.local
    └── package.json
```

---

## Local Development

### Backend

```bash
cd backend

# Create and activate virtual environment (recommended)
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server (default port 8000)
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

**Endpoints:**
- `GET /api/options?rank=19000&category=OPEN&gender=Gender-Neutral&state=UP`
- `GET /health`
- `GET /docs` — interactive Swagger docs

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

App will be at `http://localhost:3000`.

**Environment variables** — edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Deployment

### Backend → Railway

1. Push the `backend/` folder to a GitHub repo (or a sub-path using Railway's root directory setting).
2. Create a new Railway project and connect the repo.
3. Set **Root Directory** to `backend`.
4. Railway auto-detects the `Procfile`:
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Add the `josaa_data.txt` file — either commit it to the repo or use a Railway volume.
6. Copy the deployed URL (e.g. `https://josaa-backend.up.railway.app`).

### Frontend → Vercel

1. Push the `frontend/` folder to a GitHub repo.
2. Import the project into Vercel.
3. Set **Root Directory** to `frontend`.
4. Add the environment variable in Vercel's dashboard:
   ```
   NEXT_PUBLIC_API_URL = https://josaa-backend.up.railway.app
   ```
5. Deploy — Vercel handles the Next.js build automatically.

---

## Filter Logic

| Input | Filter applied |
|---|---|
| Rank | Keep rows where `Closing Rank >= user rank` |
| Category | Match `Seat Type` exactly (OPEN, OBC-NCL, SC, ST, EWS) |
| Gender | Match `Gender-Neutral` or `Female-only (including Supernumerary)` |
| Home State | Keep `Quota = HS` for recognised home-state institutes; `Quota = OS` for all others |

Results are sorted by Closing Rank ascending. Rows highlighted in amber are **borderline** — closing rank is within 2,000 of your rank.

---

## Data

`josaa_data.txt` is tab-separated with columns:
```
Institute | Academic Program Name | Quota | Seat Type | Gender | Opening Rank | Closing Rank
```

Source: JOSAA 2024 official counselling data.
