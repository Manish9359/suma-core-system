import datetime
from sqlalchemy import Column, String, Integer
from app.core.database import Base

class Series(Base):
    """
    SQLAlchemy model to store the current count for a naming prefix.
    Equivalent to Frappe's `tabSeries` table.
    """
    __tablename__ = "series"
    name = Column(String(100), primary_key=True)
    current = Column(Integer, default=0)

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
        if not pattern:
            return None
            
        now = datetime.datetime.now()
        
        # Replace date patterns
        res = pattern.replace(".YYYY.", str(now.year))
        res = res.replace(".MM.", f"{now.month:02d}")
        res = res.replace(".DD.", f"{now.day:02d}")
        
        # Identify the prefix for the counter
        # We find the part before .###
        if ".#" in res:
            prefix, hash_part = res.split(".#", 1)
            hash_count = len(hash_part) + 1 # count the '.' we split on and the hashes
            
            # 1. Fetch/Increment from DB
            series = db.query(Series).filter(Series.name == prefix).first()
            if not series:
                series = Series(name=prefix, current=0)
                db.add(series)
            
            series.current += 1
            db.commit()
            
            # 2. Format with Padding
            formatted_count = str(series.current).zfill(hash_count)
            return f"{prefix}{formatted_count}"
        
        return res
