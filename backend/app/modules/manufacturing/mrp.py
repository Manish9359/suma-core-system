from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Bin, Product, SalesOrder # Ensure these are in models.py

class MRPEngine:
    """Calculates material requirements based on Sales Demand vs Current Stock."""
    
    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    def run_planning(self) -> List[Dict[str, Any]]:
        """
        Calculates shortfalls for all items.
        Logic:
        1. Find all Sales orders (Demand).
        2. Subtract Current Stock (from Bins).
        3. Subtract Already Reserved (from Bins).
        4. Recommend Purchase/Work Order if Demand > Supply.
        """
        # (Simplified demo for this turn)
        # Scan Bins for items where projected_qty < 0
        shortfalls = self.db.query(Bin).filter(
            Bin.projected_qty < 0,
            Bin.tenant_id == self.tenant_id
        ).all()
        
        recommendations = []
        for b in shortfalls:
            p = self.db.query(Product).filter_by(sku=b.item_code, tenant_id=self.tenant_id).first()
            recommendations.append({
                "item_code": b.item_code,
                "item_name": p.name if p else "Unknown",
                "shortfall": abs(b.projected_qty),
                "suggested_qty": abs(b.projected_qty),
                "recommendation": "Purchase Order" # or Work Order if manufactured
            })
            
        return recommendations
