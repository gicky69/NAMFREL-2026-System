/*
# BARMM Election Sentiment Analysis - Database Schema

1. New Tables
- `news_articles` — stores scraped news articles about BARMM elections with sentiment analysis results
  - id (uuid, PK)
  - title (text, not null) — article headline
  - url (text, unique) — original article URL
  - source (text) — news outlet name (Rappler, Inquirer, etc.)
  - published_date (timestamptz) — when the article was published
  - summary (text) — extracted article summary/snippet
  - sentiment_score (real) — -1.0 (very negative) to 1.0 (very positive)
  - sentiment_label (text) — 'positive', 'negative', or 'neutral'
  - keywords (text[]) — extracted topic keywords
  - province (text) — BARMM province if identifiable (Basilan, Lanao del Sur, Maguindanao, Sulu, Tawi-Tawi, etc.)
  - scraped_at (timestamptz) — when the article was scraped

- `incidents` — user-reported election incidents with classification and sentiment
  - id (uuid, PK)
  - title (text, not null) — short incident title
  - description (text, not null) — detailed description of what happened
  - incident_type (text, not null) — classification: 'violence', 'vote_buying', 'intimidation', 'fraud', 'infrastructure', 'displacement', 'other'
  - severity (text, not null) — 'low', 'medium', 'high', 'critical'
  - province (text, not null) — BARMM province where incident occurred
  - municipality (text) — specific municipality
  - incident_date (date, not null) — when the incident happened
  - reported_by (text) — name of person reporting
  - contact_info (text) — optional contact information
  - status (text, not null default 'reported') — 'reported', 'verified', 'resolved'
  - sentiment_score (real) — sentiment of the description text
  - sentiment_label (text) — 'positive', 'negative', or 'neutral'
  - created_at (timestamptz) — when the report was submitted

2. Security
- RLS enabled on both tables.
- This is a no-auth public monitoring app — policies allow anon + authenticated CRUD.
- Data is intentionally public/shared (community election monitoring platform).

3. Indexes
- news_articles: published_date, source, sentiment_label
- incidents: incident_date, province, incident_type, severity, status
*/

CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text UNIQUE,
  source text,
  published_date timestamptz,
  summary text,
  sentiment_score real DEFAULT 0,
  sentiment_label text DEFAULT 'neutral',
  keywords text[] DEFAULT '{}',
  province text,
  scraped_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  incident_type text NOT NULL,
  severity text NOT NULL,
  province text NOT NULL,
  municipality text,
  incident_date date NOT NULL,
  reported_by text,
  contact_info text,
  status text NOT NULL DEFAULT 'reported',
  sentiment_score real DEFAULT 0,
  sentiment_label text DEFAULT 'neutral',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- news_articles policies (public read, anon write for scraping)
DROP POLICY IF EXISTS "anon_select_articles" ON news_articles;
CREATE POLICY "anon_select_articles" ON news_articles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_articles" ON news_articles;
CREATE POLICY "anon_insert_articles" ON news_articles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_articles" ON news_articles;
CREATE POLICY "anon_update_articles" ON news_articles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_articles" ON news_articles;
CREATE POLICY "anon_delete_articles" ON news_articles FOR DELETE
  TO anon, authenticated USING (true);

-- incidents policies (public read + write — community reporting platform)
DROP POLICY IF EXISTS "anon_select_incidents" ON incidents;
CREATE POLICY "anon_select_incidents" ON incidents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_incidents" ON incidents;
CREATE POLICY "anon_insert_incidents" ON incidents FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_incidents" ON incidents;
CREATE POLICY "anon_update_incidents" ON incidents FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_incidents" ON incidents;
CREATE POLICY "anon_delete_incidents" ON incidents FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_published_date ON news_articles(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON news_articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_sentiment ON news_articles(sentiment_label);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_province ON incidents(province);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
