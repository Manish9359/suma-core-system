from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any, Dict

class LoginReq(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str

class TokenRes(BaseModel):
    access_token: str
    token_type: str
    user: dict

# Generic format for dynamic forms
class DynamicData(BaseModel):
    custom_data: Optional[Dict[str, Any]] = None

class CustomerCreate(DynamicData):
    company: str
    contact: str
    address: Optional[str] = None
    gst: Optional[str] = None
    notes: Optional[str] = None

class ProductCreate(DynamicData):
    sku: str
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    cost: float
    sell: float
    stock: Optional[int] = 0
    warehouse: Optional[str] = "Stores"

class InvoiceItemCreate(BaseModel):
    item_code: str
    qty: int
    rate: float

class InvoiceCreate(DynamicData):
    customer: str
    date: str
    items: List[InvoiceItemCreate]

class EmployeeCreate(BaseModel):
    name: str
    role: str
    dept: str
    salary: float
    joining: str

class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    terms: Optional[str] = None
