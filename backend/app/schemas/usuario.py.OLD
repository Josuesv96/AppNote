from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.usuario import RolUsuario

class UsuarioCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    rol: RolUsuario = RolUsuario.paciente

class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol: RolUsuario
    fecha_registro: datetime
    activo: int

    class Config:
        from_attributes = True

class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str
class UsuarioUpdate(BaseModel):
    nombre: str | None = None
    email: EmailStr | None = None
    rol: RolUsuario | None = None
