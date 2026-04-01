from pydantic import BaseModel
from typing import Optional, Any, Dict

class LoginReq(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str

class TokenRes(BaseModel):
    access_token: str
    token_type: str
