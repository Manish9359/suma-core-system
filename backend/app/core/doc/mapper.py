
from typing import Dict, Any

class DocumentMapper:
    """
    Handles mapping fields from one DocType to another.
    Example: Opportunity -> Quotation
    """
    
    _maps = {
        "Opportunity": {
            "Quotation": {
                "customer": "customer",
                "opportunity_id": "name",
                "custom_data": "custom_data"
            }
        },
        "Quotation": {
            "Sales Order": {
                "customer": "customer",
                "quotation_id": "name",
                "items": "items",
                "total": "total"
            }
        },
        "Sales Order": {
            "Sales Invoice": {
                "customer": "customer",
                "order_id": "name",
                "items": "items",
                "amount": "total"
            }
        }
    }

    @classmethod
    def map(cls, source_doctype: str, target_doctype: str, source_data: Dict[str, Any]) -> Dict[str, Any]:
        """Maps fields and returns data for the new document."""
        if source_doctype not in cls._maps or target_doctype not in cls._maps[source_doctype]:
            # Default: try to match names (naive mapping)
            return source_data.copy()
            
        mapping_rules = cls._maps[source_doctype][target_doctype]
        target_data = {}
        
        for target_field, source_field in mapping_rules.items():
            if source_field in source_data:
                target_data[target_field] = source_data[source_field]
            elif source_field == "name":
                target_data[target_field] = source_data.get("id") or source_data.get("name")
        
        return target_data
