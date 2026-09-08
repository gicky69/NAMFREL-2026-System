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

## 6b. Running the ML sentiment model

`app/services/sentiment.py` now uses a real transformer model
(`cardiffnlp/twitter-xlm-roberta-base-sentiment`) instead of a rule-based
scorer, picked because it's multilingual -- important since BARMM incident
reports and news mix English, Filipino, and regional languages.

This has real operational consequences you didn't have with VADER:

- **First run downloads the model** (~1.1GB) from Hugging Face. This needs
  outbound internet access on whatever server runs the backend. If you're
  deploying somewhere with restricted egress, download the model ahead of
  time and bake it into your deployment image instead of relying on a live
  download at container startup.
- **Startup takes a few seconds longer** while the model loads into memory
  (`main.py`'s `lifespan` hook does this once at boot, not per-request --
  don't undo that, or every single incident submission or news scrape would
  pay the multi-second load cost).
- **Memory footprint goes up** -- budget at least 1.5-2GB RAM for the
  backend process, not the ~100MB a plain FastAPI+SQLAlchemy app would need.
  Undersized hosting (e.g. a free-tier 512MB instance) will likely OOM.
- **Inference latency**: expect roughly 100-400ms per call on CPU, which is
  fine for incident submissions and scraped-article batches, but means don't
  call `analyze_sentiment()` in a tight per-character loop (e.g. re-scoring
  on every keystroke for the live-preview field) -- debounce it client-side
  first, as the original `handleDescriptionChange` implicitly relied on
  being cheap.
- **Test it against real BARMM text before trusting it.** Multilingual
  models are broad but not always accurate on code-switched or
  regional-language text. Run a handful of real incident descriptions and
  news headlines through it and sanity-check the labels before going live --
  if it consistently misreads a language/dialect that matters here, that's
  worth knowing before personnel start relying on the labels.

If self-hosting a model on your API server turns out to be more ops burden
than you want, the alternative is calling Hugging Face's hosted Inference
API instead of running the model locally -- you trade a per-request network
call (and their pricing) for zero local memory/startup overhead. Worth
considering if your hosting budget is tight.

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
