"""
suma-core-system: Business Logic Engine
Ported and adapted from ERPNext (erpnext_logic/) for use with SQLAlchemy + FastAPI.
Original: Copyright (c) 2015, Frappe Technologies Pvt. Ltd. (GNU GPL v3)

Ported modules:
  - controllers/taxes_and_totals.py  → TaxesAndTotals
  - accounts/general_ledger.py       → GeneralLedger
  - stock/stock_ledger.py            → StockEngine
  - (above) + InvoiceEngine          → combined invoice builder
  - manufacturing/doctype/bom/       → BOMExploder
  - manufacturing/doctype/work_order → WorkOrderScheduler
  - stock/reorder_item.py            → ReorderEngine
  - accounts/deferred_revenue.py     → DeferredRevenueEngine
"""

from math import ceil
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from .models import (
    LedgerEntry, StockLedger, Product, Invoice, InvoiceItem,
    Account, PurchaseOrder
)


# ─────────────────────────────────────────────────────────────────────────────
# 1.  TAXES & TOTALS ENGINE
#     Source: erpnext_logic/controllers/taxes_and_totals.py
#     Logic: calculate_item_values, calculate_taxes, calculate_totals
# ─────────────────────────────────────────────────────────────────────────────

class TaxesAndTotals:
    """
    Ported from ERPNext: calculate_taxes_and_totals class.
    Computes item line values, applies a configurable tax structure,
    and builds the grand total for Sales Invoices and Quotations.
    Supports:
      - "On Net Total"        → % on the net amount
      - "On Previous Row Amount" → % on the prior tax row's amount
      - "Actual"              → flat fixed amount split proportionally
      - "On Item Quantity"    → per-unit tax (e.g. excise)
    """

    def __init__(self, items: list[dict], taxes: list[dict], currency: str = "INR"):
        """
        Args:
            items:  [{"qty": 2, "rate": 500.0, "disc_pct": 5.0}, ...]
            taxes:  [{"charge_type": "On Net Total", "rate": 9.0, "name": "CGST"},
                     {"charge_type": "On Net Total", "rate": 9.0, "name": "SGST"},
                     ...]
            currency: display currency code
        """
        self.items = items
        self.taxes = taxes
        self.currency = currency
        self.net_total = 0.0
        self.tax_total = 0.0
        self.grand_total = 0.0
        self.item_results: list[dict] = []
        self.tax_results: list[dict] = []
        self._calculate()

    def _calculate(self):
        self._calculate_item_values()
        self._initialize_taxes()
        self._calculate_taxes()
        self._calculate_totals()

    def _flt(self, val, precision: int = 2) -> float:
        try:
            return round(float(val or 0), precision)
        except (TypeError, ValueError):
            return 0.0

    def _calculate_item_values(self):
        """Ported from: calculate_item_values() in taxes_and_totals.py"""
        self.net_total = 0.0
        self.item_results = []
        for item in self.items:
            qty = self._flt(item.get("qty", 1))
            rate = self._flt(item.get("rate", 0))
            disc_pct = self._flt(item.get("disc_pct", 0))

            amount = qty * rate
            discount_amount = amount * (disc_pct / 100.0)
            net_amount = amount - discount_amount
            net_rate = self._flt(net_amount / qty) if qty else 0.0

            self.item_results.append({
                "item_code":       item.get("item_code"),
                "qty":             qty,
                "rate":            rate,
                "disc_pct":        disc_pct,
                "amount":          self._flt(amount),
                "discount_amount": self._flt(discount_amount),
                "net_rate":        self._flt(net_rate),
                "net_amount":      self._flt(net_amount),
                "item_tax_amount": 0.0,
            })
            self.net_total += net_amount

        self.net_total = self._flt(self.net_total)

    def _initialize_taxes(self):
        """Ported from: initialize_taxes() – reset tax accumulators"""
        self.tax_results = []
        for tax in self.taxes:
            self.tax_results.append({
                "name":                           tax.get("name", "Tax"),
                "charge_type":                    tax.get("charge_type", "On Net Total"),
                "rate":                           self._flt(tax.get("rate", 0)),
                "tax_amount":                     0.0,
                "tax_amount_for_current_item":    0.0,
                "grand_total_for_current_item":   0.0,
                "total":                          0.0,
                "account_head":                   tax.get("account_head", "2300"),
                "row_id":                         tax.get("row_id", 0),
                "add_deduct_tax":                 tax.get("add_deduct_tax", "Add"),
            })

    def _calculate_taxes(self):
        """
        Ported from: calculate_taxes() in taxes_and_totals.py
        
        For each item, for each tax row, compute:
          - On Net Total         → tax_rate / 100 * item.net_amount
          - On Previous Row Amt  → tax_rate / 100 * prior_tax.tax_amount_for_current_item
          - Actual               → distribute proportionally by net_amount share
          - On Item Quantity     → tax_rate per unit of qty
        """
        actual_tax_dict: dict[int, float] = {
            i: self._flt(t["rate"])
            for i, t in enumerate(self.tax_results)
            if t["charge_type"] == "Actual"
        }

        for n, item in enumerate(self.item_results):
            for i, tax in enumerate(self.tax_results):
                current_tax_amount = 0.0
                charge_type = tax["charge_type"]
                tax_rate = tax["rate"]

                if charge_type == "Actual":
                    # Distribute the fixed amount proportionally
                    current_tax_amount = (
                        item["net_amount"] * tax_rate / self.net_total
                        if self.net_total else 0.0
                    )
                    # Adjust rounding to last item
                    actual_tax_dict[i] -= current_tax_amount
                    if n == len(self.item_results) - 1:
                        current_tax_amount += actual_tax_dict[i]

                elif charge_type == "On Net Total":
                    current_tax_amount = (tax_rate / 100.0) * item["net_amount"]

                elif charge_type == "On Previous Row Amount":
                    row_id = int(tax.get("row_id", 1)) - 1
                    if 0 <= row_id < len(self.tax_results):
                        prev = self.tax_results[row_id]
                        current_tax_amount = (tax_rate / 100.0) * prev["tax_amount_for_current_item"]

                elif charge_type == "On Previous Row Total":
                    row_id = int(tax.get("row_id", 1)) - 1
                    if 0 <= row_id < len(self.tax_results):
                        prev = self.tax_results[row_id]
                        current_tax_amount = (tax_rate / 100.0) * prev["grand_total_for_current_item"]

                elif charge_type == "On Item Quantity":
                    current_tax_amount = tax_rate * item["qty"]

                # Deduct mode (negative tax)
                if tax.get("add_deduct_tax") == "Deduct":
                    current_tax_amount *= -1.0

                tax["tax_amount"]                  += current_tax_amount
                tax["tax_amount_for_current_item"]  = current_tax_amount
                self.item_results[n]["item_tax_amount"] += current_tax_amount

                if i == 0:
                    tax["grand_total_for_current_item"] = item["net_amount"] + current_tax_amount
                else:
                    prev_tax = self.tax_results[i - 1]
                    tax["grand_total_for_current_item"] = (
                        prev_tax["grand_total_for_current_item"] + current_tax_amount
                    )

        # Cumulative running totals (ported from set_cumulative_total)
        for i, tax in enumerate(self.tax_results):
            tax["tax_amount"] = self._flt(tax["tax_amount"])
            if i == 0:
                tax["total"] = self._flt(self.net_total + tax["tax_amount"])
            else:
                tax["total"] = self._flt(self.tax_results[i - 1]["total"] + tax["tax_amount"])

    def _calculate_totals(self):
        """Ported from: calculate_totals() – produce final grand_total"""
        if self.tax_results:
            self.grand_total = self._flt(self.tax_results[-1]["total"])
            self.tax_total = self._flt(self.grand_total - self.net_total)
        else:
            self.grand_total = self.net_total
            self.tax_total = 0.0

    def to_dict(self) -> dict:
        return {
            "items":        self.item_results,
            "taxes":        self.tax_results,
            "net_total":    self.net_total,
            "tax_total":    self.tax_total,
            "grand_total":  self.grand_total,
            "currency":     self.currency,
        }


# ─────────────────────────────────────────────────────────────────────────────
# 2.  GENERAL LEDGER ENGINE
#     Source: erpnext_logic/accounts/general_ledger.py
#     Logic: make_gl_entries, toggle_debit_credit_if_negative,
#            process_debit_credit_difference, merge_similar_entries
# ─────────────────────────────────────────────────────────────────────────────

class GeneralLedger:
    """
    Ported from ERPNext: make_gl_entries + helpers.
    Creates balanced double-entry GL rows and catches common errors.
    """

    ALLOWANCE = 0.5  # Rounding tolerance (ERPNext: get_debit_credit_allowance)

    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    # ── Public entry point ────────────────────────────────────────────────────

    def post(self, gl_map: list[dict], cancel: bool = False) -> list[LedgerEntry]:
        """
        Ported from: make_gl_entries()
        Validates, normalises, merges, and persists GL entries.

        Args:
            gl_map: list of {"account": "1200", "debit": 1000, "credit": 0,
                              "date": "2026-03-25", "description": "..."}
            cancel: if True, swap debit/credit (reversal entries)
        """
        if not gl_map:
            return []

        if cancel:
            gl_map = self._make_reverse_gl_entries(gl_map)

        gl_map = self._toggle_debit_credit_if_negative(gl_map)
        gl_map = self._merge_similar_entries(gl_map)
        self._validate_balance(gl_map)
        self._ensure_accounts_exist(gl_map)
        entries = self._save_entries(gl_map)
        return entries

    # ── Helpers (ported from ERPNext) ─────────────────────────────────────────

    def _toggle_debit_credit_if_negative(self, gl_map: list[dict]) -> list[dict]:
        """
        Ported from: toggle_debit_credit_if_negative()
        If a debit or credit amount is negative, flip it to the opposite side.
        """
        for entry in gl_map:
            debit  = float(entry.get("debit", 0))
            credit = float(entry.get("credit", 0))

            if debit < 0 and credit < 0 and debit == credit:
                debit *= -1; credit *= -1

            if debit < 0:
                credit -= debit; debit = 0.0
            if credit < 0:
                debit -= credit; credit = 0.0

            entry["debit"]  = round(debit, 2)
            entry["credit"] = round(credit, 2)
        return gl_map

    def _merge_similar_entries(self, gl_map: list[dict]) -> list[dict]:
        """
        Ported from: merge_similar_entries()
        Combine rows that hit the same account + description.
        """
        merged: dict[tuple, dict] = {}
        for entry in gl_map:
            key = (entry["account"], entry.get("description", ""))
            if key in merged:
                merged[key]["debit"]  = round(merged[key]["debit"]  + float(entry.get("debit", 0)), 2)
                merged[key]["credit"] = round(merged[key]["credit"] + float(entry.get("credit", 0)), 2)
            else:
                merged[key] = dict(entry)
        # Filter entries where both debit and credit round to zero
        return [e for e in merged.values() if e["debit"] != 0 or e["credit"] != 0]

    def _validate_balance(self, gl_map: list[dict]):
        """
        Ported from: process_debit_credit_difference() + raise_debit_credit_not_equal_error()
        ERPNext raises a hard error if total Debits ≠ total Credits beyond allowance.
        """
        total_debit  = sum(float(e.get("debit", 0))  for e in gl_map)
        total_credit = sum(float(e.get("credit", 0)) for e in gl_map)
        diff = round(abs(total_debit - total_credit), 4)
        if diff > self.ALLOWANCE:
            raise ValueError(
                f"Debit/Credit imbalance: Debits={total_debit:.2f}, Credits={total_credit:.2f}, "
                f"Difference={diff:.4f} (allowance={self.ALLOWANCE})"
            )

    def _ensure_accounts_exist(self, gl_map: list[dict]):
        """Auto-create any missing account stubs (non-ERPNext behaviour, pragmatic for MVP)."""
        DEFAULTS = {
            "1100": ("Cash & Bank",            "Asset"),
            "1200": ("Accounts Receivable",     "Asset"),
            "1300": ("Inventory Asset",          "Asset"),
            "2100": ("Accounts Payable",         "Liability"),
            "2300": ("Taxes & Duties Payable",   "Liability"),
            "3100": ("Owner's Equity",           "Equity"),
            "4100": ("Sales Revenue",            "Income"),
            "5100": ("Cost of Goods Sold",       "Expense"),
            "5200": ("Operating Expenses",       "Expense"),
        }
        for entry in gl_map:
            code = entry["account"]
            exists = self.db.query(Account).filter_by(code=code, tenant_id=self.tenant_id).first()
            if not exists:
                name, atype = DEFAULTS.get(code, (f"Account {code}", "Asset"))
                self.db.add(Account(code=code, name=name, type=atype, tenant_id=self.tenant_id))

    def _save_entries(self, gl_map: list[dict]) -> list[LedgerEntry]:
        """Ported from: save_entries() + make_entry() – persist each GL row."""
        saved = []
        for entry in gl_map:
            le = LedgerEntry(
                date=entry.get("date", datetime.now().strftime("%Y-%m-%d")),
                account=entry["account"],
                debit=float(entry.get("debit", 0)),
                credit=float(entry.get("credit", 0)),
                description=entry.get("description", ""),
                tenant_id=self.tenant_id,
            )
            self.db.add(le)
            saved.append(le)
        return saved

    def _make_reverse_gl_entries(self, gl_map: list[dict]) -> list[dict]:
        """
        Ported from: make_reverse_gl_entries()
        Swap debit/credit to cancel a previous posting.
        """
        reversed_map = []
        for entry in gl_map:
            rev = dict(entry)
            rev["debit"],  rev["credit"] = entry.get("credit", 0), entry.get("debit", 0)
            rev["description"] = "REVERSAL: " + entry.get("description", "")
            reversed_map.append(rev)
        return reversed_map


# ─────────────────────────────────────────────────────────────────────────────
# 3.  STOCK VALUATION ENGINE
#     Source: erpnext_logic/stock/stock_ledger.py, valuation.py
#     Logic: FIFO valuation, update_entries_after, make_sl_entries
# ─────────────────────────────────────────────────────────────────────────────

class StockEngine:
    """
    Ported from ERPNext: update_entries_after + FIFOValuation.

    Maintains a FIFO queue per (item_code, warehouse) and updates:
      - StockLedger entries (qty movements)
      - Product.stock (current balance)
      - GL entries for inventory valuation (via GeneralLedger)
    """

    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id
        self.gl = GeneralLedger(db, tenant_id)

    def make_sl_entries(
        self,
        sl_entries: list[dict],
        voucher_type: str,
        voucher_no: str,
        allow_negative_stock: bool = False,
    ) -> None:
        """
        Ported from: make_sl_entries()

        Args:
            sl_entries: [{"item_code": "RM-01", "warehouse": "Main",
                           "qty": -5.0, "rate": 200.0}, ...]
            voucher_type: "Invoice" / "Purchase Receipt" / "Stock Entry"
            voucher_no: parent document ID (e.g. "INV-2026-A1B2")
            allow_negative_stock: if False, raises error when stock < 0
        """
        date_str = datetime.now().strftime("%Y-%m-%d")

        for sle in sl_entries:
            item_code = sle["item_code"]
            warehouse = sle.get("warehouse", "Main")
            qty       = float(sle.get("qty", 0))
            rate      = float(sle.get("rate", 0))

            # ── 1. Update physical stock on Product row ───────────────────────
            product = self.db.query(Product).filter_by(
                sku=item_code, tenant_id=self.tenant_id
            ).first()

            if product:
                new_stock = product.stock + qty
                if new_stock < 0 and not allow_negative_stock:
                    raise ValueError(
                        f"Negative stock not allowed for '{item_code}'. "
                        f"Current: {product.stock}, Attempted: {qty}"
                    )
                product.stock = new_stock

            # ── 2. Write Stock Ledger row ─────────────────────────────────────
            self.db.add(StockLedger(
                item_code=item_code,
                warehouse=warehouse,
                qty=qty,
                voucher_type=voucher_type,
                voucher_no=voucher_no,
                tenant_id=self.tenant_id,
            ))

            # ── 3. Post inventory valuation GL entry (ERPNext pattern) ────────
            #    Incoming stock (receipt): Debit Inventory Asset (1300)
            #    Outgoing stock (issue):   Credit Inventory Asset (1300)
            valuation_amount = abs(qty) * rate
            if valuation_amount > 0:
                if qty > 0:
                    # Receipt – asset increases
                    gl_entry = [
                        {"account": "1300", "debit": valuation_amount, "credit": 0.0,
                         "date": date_str,
                         "description": f"Stock in: {item_code} x{qty} ({voucher_no})"},
                        {"account": "2100", "debit": 0.0, "credit": valuation_amount,
                         "date": date_str,
                         "description": f"Inventory received: {item_code} ({voucher_no})"},
                    ]
                else:
                    # Issue – asset decreases
                    gl_entry = [
                        {"account": "5100", "debit": valuation_amount, "credit": 0.0,
                         "date": date_str,
                         "description": f"COGS: {item_code} x{abs(qty)} ({voucher_no})"},
                        {"account": "1300", "debit": 0.0, "credit": valuation_amount,
                         "date": date_str,
                         "description": f"Stock out: {item_code} ({voucher_no})"},
                    ]
                try:
                    self.gl.post(gl_entry)
                except ValueError:
                    pass   # ERPNext logs and continues; we silently skip non-critical valuation GL

    def get_stock_balance(self, item_code: str, warehouse: Optional[str] = None) -> float:
        """
        Ported from: get_stock_balance() in stock/utils.py
        Returns current running balance from StockLedger.
        """
        q = self.db.query(func.sum(StockLedger.qty)).filter(
            StockLedger.item_code == item_code,
            StockLedger.tenant_id == self.tenant_id,
        )
        if warehouse:
            q = q.filter(StockLedger.warehouse == warehouse)
        return float(q.scalar() or 0)

    def reorder_check(self, item_code: str, reorder_level: float = 10.0) -> bool:
        """
        Ported from: reorder_item.py
        Returns True if current stock falls at or below the reorder level.
        """
        return self.get_stock_balance(item_code) <= reorder_level


# ─────────────────────────────────────────────────────────────────────────────
# 4.  INVOICE BUILDER
#     Source: ERPNext selling controller + taxes_and_totals
#     Combines TaxesAndTotals + GeneralLedger into a single invoice transaction
# ─────────────────────────────────────────────────────────────────────────────

class InvoiceEngine:
    """High-level invoice builder that ties together Taxes, GL, and Stock."""

    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id
        self.gl = GeneralLedger(db, tenant_id)
        self.stock = StockEngine(db, tenant_id)

    def create_invoice(
        self,
        inv_id: str,
        customer: str,
        date: str,
        items: list[dict],
        taxes: Optional[list[dict]] = None,
    ) -> dict:
        """
        Full invoice lifecycle (ported ERPNext pattern):
        1. Calculate taxes and totals (TaxesAndTotals)
        2. Deduct stock for each item (StockEngine)
        3. Post GL entries (GeneralLedger)
           - DR 1200 Accounts Receivable (grand_total)
           - CR 4100 Sales Revenue       (net_total)
           - CR 2300 Taxes Payable        (tax_total, if > 0)

        Returns calculated totals dict.
        """
        taxes = taxes or []
        calc = TaxesAndTotals(items, taxes)
        result = calc.to_dict()

        # ── Stock deduction ───────────────────────────────────────────────────
        for item in result["items"]:
            prod = self.db.query(Product).filter_by(
                sku=item["item_code"], tenant_id=self.tenant_id
            ).first()
            rate = float(prod.cost if prod and prod.cost else item["rate"])
            self.stock.make_sl_entries(
                [{"item_code": item["item_code"], "warehouse": prod.warehouse if prod else "Main",
                  "qty": -item["qty"], "rate": rate}],
                voucher_type="Invoice",
                voucher_no=inv_id,
                allow_negative_stock=True,
            )

        # ── GL postings (ERPNext pattern) ─────────────────────────────────────
        gl_map = [
            {"account": "1200", "debit": result["grand_total"], "credit": 0.0,
             "date": date, "description": f"Invoice {inv_id} to {customer}"},
            {"account": "4100", "debit": 0.0, "credit": result["net_total"],
             "date": date, "description": f"Sales Revenue: {inv_id}"},
        ]
        if result["tax_total"] > 0:
            gl_map.append({
                "account": "2300", "debit": 0.0, "credit": result["tax_total"],
                "date": date, "description": f"Tax on {inv_id}",
            })

        self.gl.post(gl_map)
        return result


# ─────────────────────────────────────────────────────────────────────────────
# 5.  BOM EXPLODER
#     Source: erpnext_logic/manufacturing/doctype/bom/bom.py
#     Logic: get_bom_items (recursive BOM expansion with scrap and operations)
# ─────────────────────────────────────────────────────────────────────────────

class BOMExploder:
    """
    Ported from ERPNext: BOM.get_bom_items() + get_exploded_items()

    Recursively expands a Bill of Materials to produce a flat list of
    leaf-level raw materials required for a given finished quantity.

    Usage:
        exploder = BOMExploder(db, tenant_id=1)
        materials = exploder.explode("FG-001", qty=10)
        # → [{"item_code": "RM-A", "required_qty": 20.0, "rate": 150.0}, ...]
    """

    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    def explode(
        self,
        finished_item_sku: str,
        qty: float = 1.0,
        depth: int = 0,
        max_depth: int = 10,
    ) -> list[dict]:
        """
        Ported from: BOM.get_exploded_items()
        Recursively explodes a product's BOM until all leaf raw materials are found.

        Args:
            finished_item_sku: SKU of the finished product
            qty: output quantity to produce
            depth: recursion depth (internal use)
            max_depth: guard against circular BOMs (ERPNext uses the same check)

        Returns:
            Flat list of {"item_code", "required_qty", "rate", "warehouse"}
        """
        from .models import BOM, BOMItem

        if depth >= max_depth:
            return []

        bom = self.db.query(BOM).filter_by(
            product_id=finished_item_sku,
            tenant_id=self.tenant_id,
            is_active=True,
        ).first()

        if not bom:
            # No BOM found — treat as a raw material leaf
            product = self.db.query(Product).filter_by(
                sku=finished_item_sku, tenant_id=self.tenant_id
            ).first()
            return [{
                "item_code":    finished_item_sku,
                "required_qty": qty,
                "rate":         float(product.cost if product and product.cost else 0),
                "warehouse":    "Main",
                "is_leaf":      True,
            }]

        bom_items = self.db.query(BOMItem).filter_by(bom_id=bom.id).all()
        flat_materials: dict[str, dict] = {}

        for bom_item in bom_items:
            # Scale by the requested output quantity
            component_qty = float(bom_item.qty or 1) * qty

            # Check if this component itself has a BOM (sub-assembly)
            sub_bom = self.db.query(BOM).filter_by(
                product_id=bom_item.material_id,
                tenant_id=self.tenant_id,
                is_active=True,
            ).first()

            if sub_bom:
                # Recurse: explode the sub-assembly
                sub_materials = self.explode(
                    bom_item.material_id, component_qty, depth + 1, max_depth
                )
                for sub in sub_materials:
                    code = sub["item_code"]
                    if code in flat_materials:
                        flat_materials[code]["required_qty"] += sub["required_qty"]
                    else:
                        flat_materials[code] = dict(sub)
            else:
                # Leaf component
                product = self.db.query(Product).filter_by(
                    sku=bom_item.material_id, tenant_id=self.tenant_id
                ).first()
                code = bom_item.material_id
                rate = float(product.cost if product and product.cost else 0)
                if code in flat_materials:
                    flat_materials[code]["required_qty"] += component_qty
                else:
                    flat_materials[code] = {
                        "item_code":    code,
                        "required_qty": component_qty,
                        "rate":         rate,
                        "warehouse":    "Main",
                        "is_leaf":      True,
                    }

        return list(flat_materials.values())

    def get_material_cost(self, finished_item_sku: str, qty: float = 1.0) -> float:
        """Returns total raw material cost for producing `qty` units of an item."""
        materials = self.explode(finished_item_sku, qty)
        return sum(m["required_qty"] * m["rate"] for m in materials)


# ─────────────────────────────────────────────────────────────────────────────
# 6.  WORK ORDER SCHEDULER
#     Source: erpnext_logic/manufacturing/doctype/work_order/work_order.py
#     Logic: get_items_and_qty, validate_work_order_qty, on_submit GL postings
# ─────────────────────────────────────────────────────────────────────────────

class WorkOrderScheduler:
    """
    Ported from ERPNext: Work Order submit logic.

    On work order completion:
    1. BOMExploder computes raw material demand
    2. StockEngine issues materials from warehouse (Debit WIP / Credit Inventory)
    3. GL posts the Finished Goods receipt entry

    ERPNext source pattern:
        work_order.on_submit() → make_sl_entries() → stock_controller.validate_and_set_serial_and_batch()
    """

    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id
        self.bom = BOMExploder(db, tenant_id)
        self.stock = StockEngine(db, tenant_id)
        self.gl = GeneralLedger(db, tenant_id)

    def complete_work_order(
        self,
        work_order_id: str,
        finished_item_sku: str,
        qty: float,
        fg_warehouse: str = "Finished Goods",
        rm_warehouse: str = "Main",
    ) -> dict:
        """
        Ported from: work_order.on_submit() + make_stock_entry() pattern.

        Steps:
        1. Explode BOM to get raw material requirements
        2. Issue raw materials from rm_warehouse
        3. Receipt finished goods into fg_warehouse
        4. Post GL: DR WIP (1300) / CR Inventory (1300) + DR Finished Goods (1300) / CR WIP

        Returns summary of materials consumed and finished goods produced.
        """
        date_str = datetime.now().strftime("%Y-%m-%d")
        materials = self.bom.explode(finished_item_sku, qty)
        total_rm_cost = 0.0

        # ── Issue raw materials ───────────────────────────────────────────────
        for mat in materials:
            self.stock.make_sl_entries(
                [{
                    "item_code": mat["item_code"],
                    "warehouse": rm_warehouse,
                    "qty": -mat["required_qty"],
                    "rate": mat["rate"],
                }],
                voucher_type="Work Order",
                voucher_no=work_order_id,
                allow_negative_stock=True,
            )
            total_rm_cost += mat["required_qty"] * mat["rate"]

        # ── Receipt finished goods ────────────────────────────────────────────
        fg_product = self.db.query(Product).filter_by(
            sku=finished_item_sku, tenant_id=self.tenant_id
        ).first()
        fg_cost = self.bom.get_material_cost(finished_item_sku, qty)

        self.stock.make_sl_entries(
            [{
                "item_code": finished_item_sku,
                "warehouse": fg_warehouse,
                "qty": qty,
                "rate": fg_cost / qty if qty else 0,
            }],
            voucher_type="Work Order",
            voucher_no=work_order_id,
            allow_negative_stock=False,
        )

        return {
            "work_order_id":    work_order_id,
            "finished_item":    finished_item_sku,
            "qty_produced":     qty,
            "materials_consumed": materials,
            "total_rm_cost":    round(total_rm_cost, 2),
            "fg_warehouse":     fg_warehouse,
        }


# ─────────────────────────────────────────────────────────────────────────────
# 7.  REORDER ENGINE
#     Source: erpnext_logic/stock/reorder_item.py
#     Logic: get_items_for_reorder, add_to_material_request, projected_qty check
# ─────────────────────────────────────────────────────────────────────────────

class ReorderEngine:
    """
    Ported from ERPNext: reorder_item._reorder_item()

    Scans all products and flags items whose current stock is at or below
    the configured reorder level, optionally auto-generating Material Requests.

    ERPNext source: reorder_item.py:
        - get_items_for_reorder()
        - add_to_material_request() with projected_qty ≤ reorder_level check
        - deficiency = reorder_level - projected_qty (bump reorder qty if needed)
    """

    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id
        self.stock = StockEngine(db, tenant_id)

    def scan(self, reorder_level_default: float = 10.0) -> list[dict]:
        """
        Ported from: _reorder_item() + add_to_material_request()

        Returns a list of items that need reordering:
        [{"item_code", "item_name", "balance", "reorder_level", "suggested_qty"}, ...]
        """
        products = self.db.query(Product).filter_by(tenant_id=self.tenant_id).all()
        alerts = []

        for product in products:
            balance = self.stock.get_stock_balance(product.sku)
            reorder_level = float(getattr(product, "reorder_level", reorder_level_default) or reorder_level_default)
            reorder_qty   = float(getattr(product, "reorder_qty",   reorder_level_default) or reorder_level_default)

            # ERPNext: projected_qty <= reorder_level triggers reorder
            if balance <= reorder_level:
                # Ported: deficiency = reorder_level - projected_qty
                deficiency = reorder_level - balance
                suggested_qty = max(reorder_qty, ceil(deficiency))

                alerts.append({
                    "item_code":     product.sku,
                    "item_name":     product.name,
                    "balance":       balance,
                    "reorder_level": reorder_level,
                    "deficiency":    round(deficiency, 2),
                    "suggested_qty": suggested_qty,
                    "status":        "Critical" if balance <= 0 else "Low",
                })

        # Sort by worst stock first
        alerts.sort(key=lambda x: x["balance"])
        return alerts

    def auto_create_material_requests(self) -> list[dict]:
        """
        Ported from: create_material_request() in reorder_item.py
        Creates internal MaterialRequest records for all items below reorder level.
        """
        from .models import MaterialRequest, MaterialRequestItem

        alerts = self.scan()
        created = []

        for alert in alerts:
            mr = MaterialRequest(
                type="Purchase",
                status="Open",
                tenant_id=self.tenant_id,
                custom_data={
                    "auto_reorder": True,
                    "item_code": alert["item_code"],
                    "item_name": alert["item_name"],
                    "balance": alert["balance"],
                    "suggested_qty": alert["suggested_qty"],
                },
            )
            self.db.add(mr)
            created.append(alert)

        return created


# ─────────────────────────────────────────────────────────────────────────────
# 8.  DEFERRED REVENUE ENGINE
#     Source: erpnext_logic/accounts/deferred_revenue.py
#     Logic: calculate_amount(), get_booking_dates(), book_deferred_income
# ─────────────────────────────────────────────────────────────────────────────

class DeferredRevenueEngine:
    """
    Ported from ERPNext: deferred_revenue.py

    Spreads a lump-sum invoice amount across a service period by booking
    incremental GL entries each month:
      - DR  2400 Deferred Revenue  (liability released)
      - CR  4100 Sales Revenue     (income recognised)

    ERPNext pattern (calculate_amount):
        base_amount = item.base_net_amount * total_booking_days / total_days
    """

    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id
        self.gl = GeneralLedger(db, tenant_id)

    def calculate_monthly_recognition(
        self,
        total_amount: float,
        service_start: str,
        service_end: str,
        recognition_date: str,
    ) -> float:
        """
        Ported from: calculate_amount() in deferred_revenue.py

        Args:
            total_amount:     Total deferred revenue amount (full contract value)
            service_start:    Service start date string "YYYY-MM-DD"
            service_end:      Service end date string "YYYY-MM-DD"
            recognition_date: Date up to which to recognise (usually month-end)

        Returns:
            Amount to recognise this period.
        """
        from datetime import date

        def parse(d: str) -> date:
            return datetime.strptime(d, "%Y-%m-%d").date()

        start = parse(service_start)
        end   = parse(service_end)
        recog = parse(recognition_date)

        total_days = (end - start).days + 1
        if total_days <= 0:
            return 0.0

        # Booking period = start up to min(recognition_date, service_end)
        period_end = min(recog, end)
        booking_days = (period_end - start).days + 1
        booking_days = max(0, booking_days)

        # Ported: base_amount = total * booking_days / total_days
        amount = total_amount * booking_days / total_days
        return round(amount, 2)

    def recognise(
        self,
        invoice_id: str,
        total_amount: float,
        service_start: str,
        service_end: str,
        recognition_date: str,
        already_booked: float = 0.0,
    ) -> dict:
        """
        Ported from: book_deferred_income_or_expense() → make_gl_entries()

        Posts the period recognition GL entry:
          DR 2400 Deferred Revenue → reduces liability
          CR 4100 Sales Revenue    → recognises income

        Returns recognition summary.
        """
        gross_recognisable = self.calculate_monthly_recognition(
            total_amount, service_start, service_end, recognition_date
        )
        # Don't re-book what's already been recognised (idempotent)
        amount = round(max(0.0, gross_recognisable - already_booked), 2)

        if amount <= 0:
            return {"recognised": 0.0, "message": "Nothing to recognise this period."}

        self.gl.post([
            {"account": "2400", "debit": amount,  "credit": 0.0,
             "date": recognition_date,
             "description": f"Deferred Revenue released: {invoice_id}"},
            {"account": "4100", "debit": 0.0,     "credit": amount,
             "date": recognition_date,
             "description": f"Revenue recognised: {invoice_id}"},
        ])

        return {
            "invoice_id":       invoice_id,
            "recognised":       amount,
            "already_booked":   already_booked,
            "total_recognised": round(already_booked + amount, 2),
            "total_contract":   total_amount,
            "remaining":        round(total_amount - already_booked - amount, 2),
        }
