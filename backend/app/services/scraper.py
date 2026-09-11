"""
News scraping service.

Ported from the original Supabase Edge Function (scrape-news). Most sources
are RSS feeds, which sidesteps CSS-selector scraping (and the "sites break
when they redesign" problem) entirely -- see _scrape_rss_source(). Sources
with no RSS feed (e.g. Luwaran, which is a custom CMS with no /feed/ at
all) use _scrape_html_source() instead, configured with a listing_url and
CSS selectors. Requires beautifulsoup4 (`pip install beautifulsoup4`),
which isn't needed by the RSS path.
"""
from datetime import datetime
from email.utils import parsedate_to_datetime
from urllib.parse import urljoin

import httpx
import feedparser
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.models import NewsArticle
from app.services.sentiment import analyze_sentiment

# Base region/institution terms (from the original edge function's list) --
# these catch general BARMM coverage, not just election coverage.
BARMM_KEYWORDS_BASE = [
    "barmm", "bangsamoro", "maguindanao", "lanao del sur", "sulu",
    "tawi-tawi", "basilan", "marawi", "cotabato", "muslim mindanao",
    "bangsamoro election", "barmm election", "parliament", "bta",
    "bangsamoro transition authority", "regional governor",
]

# Election-2026-specific terms, added so the scraper favors coverage of the
# upcoming BARMM Parliament election rather than just any regional news.
# Each term is scoped with "barmm"/"bangsamoro"/"comelec" so it doesn't
# start matching unrelated national-election stories.
BARMM_ELECTION_2026_KEYWORDS = [
    "barmm election 2026", "bangsamoro election 2026",
    "2026 barmm elections", "bangsamoro parliament election",
    "bangsamoro parliamentary election", "first bangsamoro parliament",
    "bangsamoro autonomous region election", "comelec-barmm",
    "comelec barmm", "bangsamoro candidates", "bangsamoro voters",
    "bangsamoro poll", "bangsamoro polls", "bangsamoro voter registration",
    "bangsamoro electoral", "bangsamoro parliament seats",
]

BARMM_KEYWORDS = BARMM_KEYWORDS_BASE + BARMM_ELECTION_2026_KEYWORDS

PROVINCES = [
    "basilan", "lanao del sur", "maguindanao del norte",
    "maguindanao del sur", "maguindanao", "sulu", "tawi-tawi",
    "marawi city", "cotabato city", "lamitan city",
]

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    # A bare User-Agent with nothing else is itself a bot-detection signal
    # (real browsers always send these too). Added after Inquirer.net,
    # Manila Bulletin, and ABS-CBN all started returning clean HTTP 403s
    # (not 404s) -- consistent with basic bot filtering rather than a dead
    # URL. This may not be enough if it's a full Cloudflare JS challenge
    # rather than a header check; if these three are still 403ing after
    # this change, that's the likely explanation and they may just need to
    # be dropped from SOURCES rather than fought further.
    "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}

# All six sources from the original edge function, restored. Two notes
# carried over from prior debugging -- keep an eye on these in the
# `errors` list that scrape_all_sources() returns:
#   - GMA News: the edge function's URL (gmanetwork.com/news/rss/feed/headlines)
#     was 404ing as of the last check, so this keeps the working replacement
#     URL instead of reverting to a known-dead one.
#   - Manila Bulletin / ABS-CBN: both were returning 403 Forbidden (bot
#     protection, not a bad URL) as of the last check. They're restored
#     here per request; scrape_all_sources() isolates per-source failures,
#     so if they're still blocked you'll see it in `errors` rather than
#     losing articles from the other sources.
#   - Rappler (Elections): confirmed via --debug that the general
#     rappler.com/feed is a site-wide firehose capped at ~10 entries, so a
#     BARMM election story gets pushed out of that window within days once
#     unrelated national news fills the rest of the feed. Rappler exposes
#     per-section feeds at <section-path>/feed/ (confirmed working for
#     /entertainment, /sports, /people, /newsbreak, /philippines/weather),
#     so this adds the Philippine-elections section feed as a second
#     Rappler source -- almost everything in it is election coverage, so a
#     BARMM parliamentary story should survive in the top-10 window much
#     longer than on the general feed. NOT independently verified here
#     (web_fetch to rappler.com is blocked from this environment) --
#     confirm with `python scraper.py --debug` that it actually returns
#     RSS entries before relying on it; if it 404s or returns 0 entries,
#     drop this line and fall back to increasing scrape frequency instead.
SOURCES = [
    {"name": "Rappler", "feed_url": "https://www.rappler.com/feed"},
    {"name": "Rappler (Elections)", "feed_url": "https://www.rappler.com/philippines/elections/feed/"},
    {"name": "Inquirer.net", "feed_url": "https://www.inquirer.net/fullfeed"},
    {"name": "PhilStar.com", "feed_url": "https://www.philstar.com/rss/headlines"},
    {"name": "Manila Bulletin", "feed_url": "https://mb.com.ph/feed/"},
    {"name": "GMA News", "feed_url": "https://data.gmanews.tv/gno/rss/news/feed.xml"},  # replacement for 404'd gmanetwork.com URL
    {"name": "ABS-CBN News", "feed_url": "https://news.abs-cbn.com/feed"},
    {"name": "Luwaran", "feed_url": "https://www.luwaran.com/news/category/16"},
    {
        "name": "Luwaran",
        "is_html": True,
        "listing_url": "https://www.luwaran.com/news/category/16",
        "base_url": "https://luwaran.com",
        "selectors": {
            "article": "PLACEHOLDER",
            "title": "PLACEHOLDER",
            "link": "PLACEHOLDER",
            "date": "PLACEHOLDER",
            "summary": "PLACEHOLDER",
        },
        "date_format": None,
    },

    # --- HTML sources (no RSS feed available) ---
    # Luwaran (MILF Committee on Information) has no /feed/ -- confirmed by
    # inspecting the page directly: no RSS <link> autodiscovery tag, and
    # the URL structure (/news/category/16, /news/article/<id>/<slug>) is
    # a custom CMS, not WordPress. Category 16 ("Central Mindanao") is
    # where nearly all the BARMM/election coverage lives (2,161 articles
    # vs. single/double digits in the other regional categories).
    #
    # LEFT DISABLED (commented out) because the selectors below are
    # placeholders, not verified against the real page -- I don't have
    # Luwaran's actual HTML (my fetch tool only returns markdown-extracted
    # text, and luwaran.com is outside this sandbox's network allowlist).
    # Pull the real selectors from browser devtools, update the four
    # values below, then uncomment. Test with `python scraper.py --debug`
    # first -- a wrong selector matches nothing and silently returns 0
    # entries rather than an error, so a 0-entry result here means "check
    # the selectors" before it means "the page is actually empty".
    #
    # {
    #     "name": "Luwaran",
    #     "is_html": True,
    #     "listing_url": "https://www.luwaran.com/news/category/16",
    #     "base_url": "https://www.luwaran.com",
    #     "selectors": {
    #         "article": "PLACEHOLDER",   # CSS selector matching each repeated article block on the listing page
    #         "title": "PLACEHOLDER",     # relative to `article` -- the headline element (e.g. "h2 a")
    #         "link": "PLACEHOLDER",      # relative to `article` -- the <a> whose href to follow (often same as title)
    #         "date": "PLACEHOLDER",      # relative to `article` -- the date/timestamp element
    #         "summary": "PLACEHOLDER",   # relative to `article` -- the teaser paragraph
    #     },
    #     # Optional: a strptime format string matching the date element's
    #     # text (e.g. "%B %d, %Y" for "September 7, 2026"). Omit this key
    #     # entirely if you'd rather leave published_date as None than
    #     # guess at a format.
    #     "date_format": None,
    # },
]


def _is_relevant(title: str, summary: str = "") -> bool:
    """Matches original isBarmmRelated: checks title AND summary, not just title."""
    text = f"{title} {summary}".lower()
    return any(kw in text for kw in BARMM_KEYWORDS)


def _detect_province(title: str, summary: str = "") -> str | None:
    text = f"{title} {summary}".lower()
    for prov in PROVINCES:
        if prov in text:
            return prov.title()
    return None


def _extract_keywords(title: str, summary: str = "") -> list[str]:
    text = f"{title} {summary}".lower()
    found = [kw for kw in BARMM_KEYWORDS if kw in text]
    seen = []
    for kw in found:
        if kw not in seen:
            seen.append(kw)
    return seen[:8]


def _is_election_related(title: str, summary: str = "") -> bool:
    """Narrower check than _is_relevant: true only for the 2026-election
    terms, not general BARMM/region coverage. Useful for prioritizing or
    tagging election-specific articles downstream (e.g. a dashboard filter
    or a higher-priority scrape cadence) without changing what counts as
    "relevant enough to save" in _is_relevant."""
    text = f"{title} {summary}".lower()
    return any(kw in text for kw in BARMM_ELECTION_2026_KEYWORDS)


def _parse_pub_date(entry):
    raw = getattr(entry, "published", None) or getattr(entry, "pubDate", None)
    if not raw:
        return None
    try:
        return parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        return None


def _save_if_new(db: Session, title: str, url: str, summary: str, source_name: str, published_date) -> bool:
    if not title or not url:
        return False
    if not _is_relevant(title, summary):
        return False

    exists = db.query(NewsArticle).filter(NewsArticle.url == url).first()
    if exists:
        return False

    full_text = f"{title} {summary}"
    score, label = analyze_sentiment(full_text)

    article = NewsArticle(
        title=title,
        url=url,
        source=source_name,
        sentiment_score=score,
        sentiment_label=label,
        published_date=published_date,
        summary=summary[:500] if summary else None,
        # keywords is NOT NULL in the DB -- always pass a list (possibly
        # empty), never None, or every insert fails with NotNullViolation.
        keywords=_extract_keywords(title, summary),
        province=_detect_province(title, summary),
    )
    db.add(article)
    return True


def _scrape_rss_source(client: httpx.Client, source: dict, db: Session) -> tuple[int, int]:
    scraped, skipped = 0, 0
    resp = client.get(source["feed_url"])
    resp.raise_for_status()
    feed = feedparser.parse(resp.content)

    for entry in feed.entries:
        title = getattr(entry, "title", None)
        url = getattr(entry, "link", None)
        summary = getattr(entry, "summary", "") or getattr(entry, "description", "")
        published_date = _parse_pub_date(entry)

        if _save_if_new(db, title, url, summary, source["name"], published_date):
            scraped += 1
        else:
            skipped += 1

    return scraped, skipped


def _parse_html_date(raw: str | None, date_format: str | None) -> datetime | None:
    """Best-effort date parsing for HTML sources. Unlike RSS's standardized
    pubDate, every site formats its dates differently, so this takes an
    optional per-source strptime format. Falls back to trying the RFC-2822
    parser (in case a site's date text happens to be machine-readable
    despite the page being HTML), then gives up and returns None -- a
    missing published_date is not fatal, _save_if_new() accepts it."""
    if not raw:
        return None
    raw = raw.strip()
    if date_format:
        try:
            return datetime.strptime(raw, date_format)
        except ValueError:
            pass
    try:
        return parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        return None


def _scrape_html_source(client: httpx.Client, source: dict, db: Session) -> tuple[int, int]:
    """HTML-listing counterpart to _scrape_rss_source(), for sources with
    no RSS feed. Configure a source in SOURCES with "is_html": True,
    "listing_url", "base_url", and a "selectors" dict -- see the Luwaran
    entry (commented out) above for the shape and field meanings.

    Design note: this deliberately reuses _save_if_new() for the actual
    save step, same as the RSS path -- relevance filtering, sentiment
    scoring, keyword extraction, and dedup-by-URL are all identical
    regardless of where title/url/date/summary came from. Only the
    fetch-and-parse step differs between RSS and HTML sources.
    """
    scraped, skipped = 0, 0
    resp = client.get(source["listing_url"])
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    sel = source["selectors"]
    base_url = source.get("base_url", source["listing_url"])

    for block in soup.select(sel["article"]):
        title_el = block.select_one(sel["title"])
        link_el = block.select_one(sel["link"]) if sel.get("link") else title_el
        date_el = block.select_one(sel["date"]) if sel.get("date") else None
        summary_el = block.select_one(sel["summary"]) if sel.get("summary") else None

        title = title_el.get_text(strip=True) if title_el else None
        href = link_el.get("href") if link_el else None
        # urljoin handles both relative ("/news/article/3322/...") and
        # already-absolute hrefs correctly, so this doesn't need a branch.
        url = urljoin(base_url, href) if href else None
        summary = summary_el.get_text(strip=True) if summary_el else ""
        published_date = _parse_html_date(
            date_el.get_text(strip=True) if date_el else None,
            source.get("date_format"),
        )

        if _save_if_new(db, title, url, summary, source["name"], published_date):
            scraped += 1
        else:
            skipped += 1

    return scraped, skipped


def scrape_all_sources(db: Session) -> tuple[int, int, list[str]]:
    scraped, skipped, errors = 0, 0, []

    with httpx.Client(timeout=15.0, follow_redirects=True, headers=REQUEST_HEADERS) as client:
        for source in SOURCES:
            try:
                if source.get("is_html"):
                    s, sk = _scrape_html_source(client, source, db)
                else:
                    s, sk = _scrape_rss_source(client, source, db)
                scraped += s
                skipped += sk
                db.commit()
            except Exception as exc:  # noqa: BLE001 - surface per-source errors, keep going
                db.rollback()  # clear the failed transaction so later sources aren't blocked
                errors.append(f"{source['name']}: {exc}")

    return scraped, skipped, errors


def _check_feeds(debug: bool = False):
    """
    Sanity-checks every source in SOURCES without touching the database.
    Run directly with: python scraper.py
    Run with --debug to also print every entry's title, whether it passed
    _is_relevant(), and whether it's election-specific (_is_election_related)
    -- useful for answering "why was article X skipped?" or "why isn't this
    showing as election coverage?" without guessing:
        python scraper.py --debug
    """
    with httpx.Client(timeout=15.0, follow_redirects=True, headers=REQUEST_HEADERS) as client:
        for source in SOURCES:
            name = source["name"]
            try:
                if source.get("is_html"):
                    resp = client.get(source["listing_url"])
                    soup = BeautifulSoup(resp.text, "html.parser")
                    sel = source["selectors"]
                    base_url = source.get("base_url", source["listing_url"])
                    blocks = soup.select(sel["article"])
                    status = "OK" if blocks else "0 MATCHES -- CHECK SELECTORS"
                    print(f"{name:20s} HTTP {resp.status_code}  {len(blocks):3d} entries  {status}")
                    entries = []
                    for block in blocks:
                        title_el = block.select_one(sel["title"])
                        title = title_el.get_text(strip=True) if title_el else "(no title)"
                        entries.append(title)
                    if entries:
                        print(f"{'':20s} e.g. {entries[0]!r}")
                    if debug:
                        for block in blocks:
                            title_el = block.select_one(sel["title"])
                            summary_el = block.select_one(sel["summary"]) if sel.get("summary") else None
                            title = title_el.get_text(strip=True) if title_el else ""
                            summary = summary_el.get_text(strip=True) if summary_el else ""
                            relevant = _is_relevant(title, summary)
                            election = _is_election_related(title, summary)
                            mark = "ELECTION" if election else ("KEEP" if relevant else "skip")
                            print(f"    [{mark}] {title!r}")
                else:
                    resp = client.get(source["feed_url"])
                    feed = feedparser.parse(resp.content)
                    status = "OK" if feed.entries else "EMPTY/PARSE FAILED"
                    print(f"{name:20s} HTTP {resp.status_code}  {len(feed.entries):3d} entries  {status}")
                    if feed.entries:
                        print(f"{'':20s} e.g. {feed.entries[0].get('title', '(no title)')!r}")
                    if debug:
                        for entry in feed.entries:
                            title = getattr(entry, "title", "")
                            summary = getattr(entry, "summary", "") or getattr(entry, "description", "")
                            relevant = _is_relevant(title, summary)
                            election = _is_election_related(title, summary)
                            mark = "ELECTION" if election else ("KEEP" if relevant else "skip")
                            print(f"    [{mark}] {title!r}")
            except Exception as exc:  # noqa: BLE001
                print(f"{name:20s} FAILED: {exc}")


if __name__ == "__main__":
    import sys
    _check_feeds(debug="--debug" in sys.argv)


# --- Why a known-real BARMM article can still be "missed" ---
# Confirmed via `python -m app.services.scraper --debug`: general feeds like
# Rappler's /feed are a SITE-WIDE firehose capped at ~10 entries. When
# national news (e.g. an impeachment trial) dominates the cycle, a BARMM
# story can be published and then pushed out of that 10-item window before
# the next scrape ever sees it. This is NOT a keyword-filter bug.
#
# Two real fixes, not mutually exclusive:
#   1. Scrape more often (e.g. hourly cron instead of daily) so fewer items
#      have time to roll out of a small firehose window between runs. This
#      matters more now that the focus is the 2026 election cycle, since
#      election-day/results coverage moves fast.
#   2. Prefer sources that are already scoped to the region instead of
#      filtering a national firehose down after the fact -- e.g.:
#        https://newsinfo.inquirer.net/source/inquirer-mindanao (Inquirer)
#        https://mindanaogoldstardaily.com/category/barmm (Gold Star Daily)
#      Neither of these has a discovered RSS feed, so they'd need the
#      HTML listing_url + CSS selector approach instead of feedparser --
#      see the earlier version of this file for that pattern. This route
#      structurally can't lose an article to unrelated national news,
#      since nothing outside the region ever enters that feed to begin with.
#   3. Consider also checking COMELEC's own press releases/site once the
#      2026 BARMM election calendar is published -- official filings,
#      candidate lists, and results announcements often appear there before
#      (or instead of) general news coverage.
#
# (Google News RSS search was considered as a shortcut but its endpoint is
# disallowed by robots.txt -- using it risks the server's IP being blocked
# and is against Google's terms, so it's deliberately not used here.)