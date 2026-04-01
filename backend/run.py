"""
SumaERP - Run Script
Usage: cd backend && python run.py
"""
import uvicorn

if __name__ == "__main__":
    print("=" * 50)
    print("  SumaERP Backend Server")
    print("  http://localhost:8000")
    print("  API Docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
