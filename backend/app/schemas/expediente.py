from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from app.models.expediente import GeneroEnum

class ExpedienteUpdate(BaseModel):
    fecha_nacimiento: Optional[date] = None
    genero: Optional[GeneroEnum] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    emergencia_nombre: Optional[str] = None
    emergencia_telefono: Optional[str] = None
    emergencia_relacion: Optional[str] = None

class ExpedienteClinicaUpdate(BaseModel):
    motivo_consulta: Optional[str] = None
    diagnostico: Optional[str] = None
    medicamentos: Optional[str] = None
    antecedentes: Optional[str] = None

class ExpedienteOut(BaseModel):
    id: int
    paciente_id: int
    fecha_nacimiento: Optional[date] = None
    genero: Optional[GeneroEnum] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    emergencia_nombre: Optional[str] = None
    emergencia_telefono: Optional[str] = None
    emergencia_relacion: Optional[str] = None
    motivo_consulta: Optional[str] = None
    diagnostico: Optional[str] = None
    medicamentos: Optional[str] = None
    antecedentes: Optional[str] = None
    fecha_actualizacion: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotaSesionCreate(BaseModel):
    nota: str

class NotaSesionOut(BaseModel):
    id: int
    terapeuta_id: int
    paciente_id: int
    nota: str
    fecha: datetime

    class Config:
        from_attributes = True
