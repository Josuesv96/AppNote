from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from app.models.usuario import RolUsuario


class UsuarioRegistroPublico(BaseModel):
    """
    Registro público (endpoint /auth/registro).
    El rol NO es configurable: siempre se fuerza a 'paciente' en el router.
    'extra=forbid' hace que cualquier campo no esperado (p. ej. 'rol')
    provoque un error 422 en lugar de ser ignorado en silencio.
    """
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UsuarioCreate(BaseModel):
    """
    Creación de usuarios por un administrador (endpoint protegido /admin/usuarios).
    Aquí sí se permite definir el rol, porque solo un admin autenticado puede usarlo.
    """
    nombre: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
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