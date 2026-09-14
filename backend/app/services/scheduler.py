from apscheduler.schedulers.background import BackgroundScheduler
from app.db import SessionLocal
from app.services.scraper import scrape_all_sources
from sqlalchemy import text

scheduler = BackgroundScheduler()

def scheduled_scrape():
    """Automatically scrape news on schedule."""
    db = SessionLocal()

    try:
        # Tell all frontend users that scraping has started
        db.execute(
            text("""
                UPDATE scrape_status
                SET is_scraping = TRUE
                WHERE id = 1
            """)
        )
        db.commit()

        print("🤖 Starting scheduled scrape...")

        scraped, skipped, errors = scrape_all_sources(db)

        db.commit()

        print(
            f"✅ Scheduled scrape completed: "
            f"{scraped} scraped, {skipped} skipped"
        )

        if errors:
            print(f"⚠️ Errors: {errors}")

    except Exception as e:
        db.rollback()
        print(f"❌ Scheduled scrape failed: {e}")

    finally:
        # Tell frontend scraping has finished
        try:
            db.execute(
                text("""
                    UPDATE scrape_status
                    SET is_scraping = FALSE
                    WHERE id = 1
                """)
            )
            db.commit()
        finally:
            db.close()

def start_scheduler():
    scheduler.add_job(
        scheduled_scrape,
        trigger="interval",
        hours=2,
        id="news_scraper",
        replace_existing=True,
    )

    scheduler.start()

    print("===== Starting scheduler for news scraping every 2 hours. =====")