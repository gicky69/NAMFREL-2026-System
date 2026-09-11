"""
News scraping service.

This replaces the Supabase Edge Function ("scrape-news") that the frontend
currently calls. Fill in SOURCES with the actual Philippine news outlets you
want to monitor, and adjust the CSS selectors to match each site's markup.

This is intentionally a starting skeleton, not a finished scraper -- every
news site has different HTML, and some may need a headless browser (e.g.
playwright) instead of plain requests if they render content with JS.
"""
import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.models import NewsArticle
from app.services.sentiment import analyze_sentiment

BARMM_KEYWORDS = ["BARMM", "Bangsamoro", "Maguindanao", "Lanao del Sur", "Basilan", "Sulu", "Tawi-Tawi"]

# Example source config -- replace with real ones.
SOURCES = [
    {
        "name": "Example News",
        "listing_url": "https://example-news.ph/section/mindanao",
        "article_selector": "a.headline-link",
    },
]


def _is_relevant(title: str) -> bool:
    return any(kw.lower() in title.lower() for kw in BARMM_KEYWORDS)


def scrape_all_sources(db: Session) -> tuple[int, int, list[str]]:
    scraped, skipped, errors = 0, 0, []

    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        for source in SOURCES:
            try:
                resp = client.get(source["listing_url"])
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")
                links = soup.select(source["article_selector"])

                for link in links:
                    title = link.get_text(strip=True)
                    url = link.get("href")
                    if not title or not url:
                        continue

                    if not _is_relevant(title):
                        skipped += 1
                        continue

                    exists = db.query(NewsArticle).filter(NewsArticle.url == url).first()
                    if exists:
                        skipped += 1
                        continue

                    score, label = analyze_sentiment(title)
                    article = NewsArticle(
                        title=title,
                        url=url,
                        source=source["name"],
                        sentiment_score=score,
                        sentiment_label=label,
                    )
                    db.add(article)
                    scraped += 1

                db.commit()
            except Exception as exc:  # noqa: BLE001 - surface per-source errors, keep going
                errors.append(f"{source['name']}: {exc}")

    return scraped, skipped, errors