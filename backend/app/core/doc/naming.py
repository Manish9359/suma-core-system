
import datetime
from sqlalchemy import Column, String, Integer, text
from sqlalchemy.exc import OperationalError
from app.database import Base, SessionLocal, engine

class Series(Base):
    """
    SQLAlchemy model to store the current count for a naming prefix.
    Equivalent to Frappe's `tabSeries` table.
    """
    __tablename__ = "series"
    name = Column(String(100), primary_key=True)
    current = Column(Integer, default=0)


def _ensure_series_table():
    """Create the series table if missing (handles existing DBs that predate this table)."""
    try:
        Series.__table__.create(engine, checkfirst=True)
    except Exception:
        pass


class NamingSeries:
    """
    Core engine for generating sequential, pattern-based IDs.
    Supported patterns:
    - .YYYY. : Current Year
    - .MM.   : Current Month
    - .DD.   : Current Day
    - .##### : Auto-increment counter (variable length)

    Example: SINV-.YYYY.-.##### -> SINV-2026-00001
    """

    @classmethod
    def generate(cls, db, pattern: str) -> str:
        """
        Generate the next name in the series.
        Uses a dedicated short-lived session so the counter commit
        does not interfere with the caller's open transaction.
        """
        if not pattern:
            return None

        now = datetime.datetime.now()

        # Replace date patterns
        res = pattern.replace(".YYYY.", str(now.year))
        res = res.replace(".MM.", f"{now.month:02d}")
        res = res.replace(".DD.", f"{now.day:02d}")

        if ".#" not in res:
            # No counter needed — return as-is (e.g., patterns without ####)
            return res

        prefix, hash_part = res.split(".#", 1)
        # +1 for the '.' we split on, rest are '#' chars
        hash_count = len(hash_part) + 1

        # Use a dedicated session so counter commit is isolated
        _ensure_series_table()
        counter_db = SessionLocal()
        try:
            series = counter_db.query(Series).filter(Series.name == prefix).first()
            if not series:
                series = Series(name=prefix, current=0)
                counter_db.add(series)
                counter_db.flush()

            series.current += 1
            counter_db.commit()
            formatted_count = str(series.current).zfill(hash_count)
            return f"{prefix}{formatted_count}"
        except Exception as e:
            counter_db.rollback()
            raise RuntimeError(f"NamingSeries.generate failed for pattern '{pattern}': {e}") from e
        finally:
            counter_db.close()
