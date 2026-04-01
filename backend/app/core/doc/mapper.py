from typing import Dict, Any

class DocumentMapper:
    """Handles mapping fields from one DocType to another."""
    
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
                "total": "grand_total"
            }
        },
        "Sales Order": {
            "Sales Invoice": {
                "customer": "customer",
                "sales_order": "name",
                "items": "items",
                "amount": "total"
            },
            "Delivery Note": {
                "customer": "customer",
                "sales_order": "name",
                "items": "items"
            }
        },
        "Delivery Note": {
            "Sales Invoice": {
                "customer": "customer",
                "delivery_note": "name",
                "items": "items"
            }
        },
        "Sales Invoice": {
            "Payment Entry": {
                "party_type": lambda d: "Customer",
                "party": "customer",
                "amount": "grand_total",
                "invoice_ref": "name",
                "payment_type": lambda d: "Receive"
            }
        },
        "Purchase Order": {
            "Purchase Receipt": {
                "supplier": "vendor",
                "purchase_order": "name",
                "items": "items"
            },
            "Purchase Invoice": {
                "supplier": "vendor",
                "purchase_order": "name",
                "items": "items",
                "amount": "total"
            }
        },
        "Purchase Receipt": {
            "Purchase Invoice": {
                "supplier": "supplier",
                "purchase_receipt": "name",
                "items": "items"
            }
        }
    }

    @classmethod
    def map(cls, source_doctype: str, target_doctype: str, source_data: Dict[str, Any]) -> Dict[str, Any]:
        if source_doctype not in cls._maps or target_doctype not in cls._maps[source_doctype]:
            return source_data.copy()
            
        mapping_rules = cls._maps[source_doctype][target_doctype]
        target_data = {}
        
        for target_field, source_field in mapping_rules.items():
            if callable(source_field):
                target_data[target_field] = source_field(source_data)
            elif source_field in source_data:
                target_data[target_field] = source_data[source_field]
            elif source_field == "name":
                target_data[target_field] = source_data.get("id") or source_data.get("name")
        
        return target_data
