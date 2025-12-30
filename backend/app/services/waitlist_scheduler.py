from apscheduler.schedulers.background import BackgroundScheduler

from app.config.database import SessionLocal
from app.services.waitlist_service import expire_offers_and_reallocate


def process_waitlist_offers() -> None:
    db = SessionLocal()
    try:
        expire_offers_and_reallocate(db=db)
    finally:
        db.close()


def start_waitlist_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(process_waitlist_offers, "interval", minutes=1, id="waitlist_offers")
    scheduler.start()
    return scheduler
