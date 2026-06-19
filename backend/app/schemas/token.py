from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str
    rol: str
    nombre: str
    id: int

class TokenData(BaseModel):
    email: str | None = None
    rol: str | None = None