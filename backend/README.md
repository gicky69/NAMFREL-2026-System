# BARMM Election Monitor — Python Backend

FastAPI backend that replaces direct Supabase-client calls from the frontend.
Reads/writes the **same** Postgres database Supabase already gave you — no
data migration needed, just a different way of talking to it.

## 1. Get your database connection string

Supabase dashboard → Project Settings → Database → Connection string (URI).
Copy the "Session pooler" or direct connection string.

## 2. Set up the environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and paste your real `DATABASE_URL`. Set `CORS_ORIGINS` to wherever
your frontend runs (default assumes Vite's `http://localhost:5173`).

## 3. Verify the models match your real schema

Open the Supabase Table Editor and compare columns against
`app/models.py`. The `incident_type`, `severity`, and `status` values in
particular were inferred from the frontend — check `@/types.ts` for the exact
allowed values (e.g. `INCIDENT_TYPES`, `SEVERITY_LEVELS`, `INCIDENT_STATUSES`)
and adjust if anything doesn't line up. SQLAlchemy will happily read/write
whatever's actually in the table regardless of these Python type hints, so a
mismatch won't crash things — but you want the model to be an honest
description of the data.

## 4. Run it

```bash
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` — auto-generated interactive API docs.
Try `GET /api/incidents` and `GET /api/news` first; if your existing Supabase
tables have data, you should see it come back immediately.

## 5. Point the frontend at it

In each component, replace the direct Supabase query with a fetch call. Example
for `IncidentsList.tsx`:

```ts
// Before
const { data, error: err } = await supabase
  .from("incidents")
  .select("*")
  .order("created_at", { ascending: false });

// After
const res = await fetch(`${import.meta.env.VITE_API_URL}/api/incidents`);
if (!res.ok) throw new Error("Failed to load incidents");
const data = await res.json();
```

Add `VITE_API_URL=http://localhost:8000` to the frontend's `.env`.

Do this one component at a time, in this order (lowest risk first):
1. `IncidentsList.tsx` and `NewsFeed.tsx` — GET requests only
2. `ReportIncident.tsx` — POST `/api/incidents`
3. `Dashboard.tsx` — switch to `GET /api/dashboard/summary` and delete the
   client-side aggregation logic (sentimentCounts, incidentTypeCounts, etc.)
   since the backend now computes it
4. Wire up "Scrape Latest News" to `POST /api/news/scrape` in both
   `Dashboard.tsx` and `NewsFeed.tsx`

## 6. Fill in the real scraper

`app/services/scraper.py` is a skeleton — the `SOURCES` list has one fake
example. Add the real Philippine news outlets you want to monitor, with the
correct CSS selectors for each site's article listing page. Some sites render
content client-side with JS, in which case `httpx` + BeautifulSoup won't see
the content — you'd need Playwright for those instead.

## 6b. Sentiment Analysis Architecture (External API / Lexicon Fallback)

Sentiment analysis for news articles and incident reports is designed to be decoupled:
- **Lightweight Backend**: The main API server does not run heavy LLM / PyTorch models locally, keeping startup instant and memory usage minimal (<100MB).
- **External LLM Service**: You can deploy the sentiment model (such as TagaSenti or another LLM) separately as an independent microservice / API endpoint and point to it via `SENTIMENT_API_URL`.
- **Lexicon Fallback**: If no external API is configured or if the external service times out or is unreachable, the system automatically uses the built-in election-domain lexicon scorer.

### Configuration (`.env`):
```env
# Optional external sentiment endpoint
SENTIMENT_API_URL=http://localhost:8001/analyze
# SENTIMENT_API_KEY=your-api-key
```

### Endpoints:
- `POST /api/sentiment/analyze` with `{ "text": "..." }` returns `{ "score": float, "label": "positive" | "negative" | "neutral" }`.
- `GET /api/sentiment/status` returns whether the external endpoint is configured and active.

## 7. Not included yet, worth deciding on next

- **Auth**: right now anyone can POST an incident or trigger a scrape. If you
  want to keep Supabase Auth for user accounts, FastAPI can verify the
  Supabase JWT on protected routes. Otherwise consider at least an API key or
  rate limit on `/api/news/scrape` and `POST /api/incidents` before deploying.
- **Alembic**: for schema migrations going forward, run `alembic init alembic`
  and point it at the same `DATABASE_URL`, since you're now the one owning the
  schema instead of managing it through Supabase's UI.
- **Scheduling**: if you want news scraped automatically instead of only on
  button click, add APScheduler (already in requirements.txt) to `main.py`
  to run `scrape_all_sources` on a timer.
