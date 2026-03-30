from fastapi import APIRouter
from .v1 import auth, router as doc_router, reports

# Master Router for Version 1
api_router = APIRouter(prefix="/api/v1")

# Include the main versioned router which contains auth, reports, and doc logic
api_router.include_router(doc_router.router)

# Custom logic could go here
# api_router.include_router(custom_module.router)

print("API Routers initialized correctly.")
