
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product, Invoice # Using Invoice as Sales Order for simplicity in demo

router = APIRouter()

@router.get("/page/{route:path}")
def get_public_page(route: str, db: Session = Depends(get_db)):
    """Point 12: Dynamically render web pages created in the CMS."""
    from app.models import WebPage
    # Standardize route search
    search_route = f"/{route.strip('/')}"
    page = db.query(WebPage).filter(WebPage.route == search_route, WebPage.is_published == "Published").first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return {
        "title": page.title,
        "content": page.content
    }

@router.get("/catalog")
def get_public_catalog(db: Session = Depends(get_db)):
    """Point 11: Public product catalog for Ecommerce."""
    products = db.query(Product).filter(Product.stock > 0).all()
    return [{
        "sku": p.sku,
        "name": p.name,
        "price": p.price,
        "category": p.category,
        "stock": p.stock
    } for p in products]

@router.post("/checkout")
def public_checkout(order_data: dict, db: Session = Depends(get_db)):
    """Point 11: Simple public checkout to create a Sales Order."""
    # This is a simplified demo checkout
    print(f"🛒 Public Order Received: {order_data}")
    return {"status": "success", "message": "Order placed! A sales representative will contact you."}
