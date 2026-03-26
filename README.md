# SUMA ERP: Comprehensive Tech & Architecture Documentation 🚀

**SUMA ERP** is a proprietary, monolithic-yet-modular Enterprise Resource Planning application. It has been entirely rebuilt natively. This project extracts the legendary operational flows of systems like ERPNext and SAP but strips away the bloat, relying purely on **FastAPI (Python)**, **SQLAlchemy (SQLite)**, and **React (TypeScript)**. 

---

## 🏗️ 1. Project Folder Architecture

```text
suma-core-system/
Γö£ΓöÇΓöÇ backend/                     # The API & Database Engine
Γöé   Γö£ΓöÇΓöÇ erp.db                   # Single-file SQLite Database
Γöé   Γö£ΓöÇΓöÇ main.py                  # FastAPI Application Entrypoint & API Routes
Γöé   Γö£ΓöÇΓöÇ app/
Γöé   Γöé   Γö£ΓöÇΓöÇ database.py          # SQLAlchemy Engine & Session Configuration
Γöé   Γöé   Γö£ΓöÇΓöÇ models.py            # 30+ Core Database Table Definitions
Γöé   Γöé   Γö£ΓöÇΓöÇ schemas.py           # Pydantic Types & Data Validation
Γöé   Γöé   Γö£ΓöÇΓöÇ security.py          # Auth, JWT, and Native RBAC Permissions
Γöé   Γöé   ΓööΓöÇΓöÇ engine.py            # Core Business Logic (Ledgers, Stock, Taxes)
Γöé   ΓööΓöÇΓöÇ venv/                    # Isolated Python Environment
Γöé
Γö£ΓöÇΓöÇ src/                         # React Frontend Interface
Γöé   Γö£ΓöÇΓöÇ components/              # Reusable UI Blocks (Shadcn UI)
Γöé   Γöé   Γö£ΓöÇΓöÇ ui/                  # Base buttons, inputs, tabs, dropdowns
Γöé   Γöé   ΓööΓöÇΓöÇ RecordModal.tsx      # Dynamic Form Builder & Live Validator
Γöé   Γö£ΓöÇΓöÇ hooks/                   # Custom React API Data fetchers
Γöé   Γö£ΓöÇΓöÇ lib/                     # Axios API Configurations
Γöé   Γö£ΓöÇΓöÇ pages/                   # ERP Modules (Sales, Purchasing, Manufacturing)
Γöé   ΓööΓöÇΓöÇ index.css                # Tailwind Base Styling
```

---

## ⚙️ 2. The Native Backend Engine (`app/engine.py`)
Because this system no longer relies on JSON mock documents or the Frappe framework, **all pure business logic** is consolidated into `app/engine.py`. 

### A. The Stock Engine
* **Strict Negativity Validation:** Implements `allow_negative_stock=False`. Any attempt to create an invoice or issue a material request that exceeds current stock mathematically throws a strict 400 Runtime Exception, reverting the database commit instantly.
* **Double-Entry Ledgering:** Every purchase or sale automatically writes chronological rows to the `StockLedger` table (`IN` and `OUT` values), completely managing the warehouse.

### B. The General Ledger (COA)
* **Automated Accounting:** When an Invoice is marked "Paid", the engine dynamically calculates the required Credits and Debits, dispatching them to the exact Chart of Account nodes (e.g., `4100 Sales`, `1200 Bank`). The books are balanced completely automatically.

### C. Taxes & Totals
* Handles fractional math, GST array calculation, and automatic subtotal rendering using safe `float()` mapping to avoid string type errors.

---

## 🛡️ 3. Security & RBAC Ecosystem (`app/security.py`)
Access management relies on a hardened, database-driven relationship rather than hardcoded logic.

1. **Tokens:** Uses stateless JSON Web Tokens (`python-jose`) with bcrypt password hashing.
2. **Models:** Admin panel allows full CRUD control over `User`, `Role`, and `Permission` SQL tables.
3. **Gateway Protection:** The `has_permission(module, action)` function intercepts every API call, cross-referencing the user's live role against their assigned Module Read/Write privileges down to the microsecond.

---

## 🎨 4. Frontend & User Interface 
Built on **React 18** and **Vite**, utilizing a custom adaptation of Tailwind.

* **Dynamic Validation:** Components like `SalesPage.tsx` interface live with backend stock. If a product's stock drops to zero, the UI actively appends `[Out of Stock]` and hard-disables the selection in real-time.
* **The `RecordModal` Form Builder:** Most ERP logic is built on rapid data entry. We use a universal `RecordModal` component which dynamically parses JSON configuration fields and rapidly generates perfectly styled Shadcn forms, tables, strings, and automated sub-calculations.

---

## 📈 5. Core ERP Modules Included

### 💼 CRM & Sales Pipeline
* **Leads & Customers:** Full contact directories.
* **Quotations:** Draft proposals mapping to items.
* **Sales Orders & Invoices:** Digital generation. Supports Digital Approval workflows via authorized roles.

### 🔌 Purchasing & Procurement
* **Material Requests:** Triggered manually or by Manufacturing planners.
* **Purchase Orders (POs):** External requests handling Cost configurations.
* **Purchase Receipts:** Once goods cross the threshold, the `StockLedger` is updated proactively.

### 🏭 Manufacturing (BOM)
* **Bill of Materials:** Complete mappings of 'Finished Goods' vs 'Raw Materials'. 
* When a 'Produce' WorkOrder is triggered, the system surgically consumes raw stock from the database and magically increments the Finished Good equivalent.

### 👥 Human Resources (HR)
* Tracks Employee details natively.
* Generates Salary Slips, Attendance integration, and tracks out-of-office days.

---

## 💻 6. Deployment & System Startup

The system is separated into two micro-environments running locally.

**1. Boot the Backend (FastAPI)**
```powershell
cd backend
venv\Scripts\activate
pip install -r requirements.txt
python main.py
# Server binds to localhost:8000
```

**2. Boot the Frontend (Vite/React)**
```powershell
# In a new terminal window
cd suma-core-system
npm install
npm run dev
# Interface binds to http://localhost:5173 
```

---

_This architectural design guarantees maximum vertical scalability. By using SQLite with native strict JSON relationships, SUMA ERP can be instantly migrated or backed up by moving a single `erp.db` file._
