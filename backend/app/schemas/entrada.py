from pydantic import BaseModel, Field
from datetime import datetime
from typing import List

class EntradaCreate(BaseModel):
    texto: str = Field(..., min_length=1, max_length=5000)
    estado_animo: int = Field(..., ge=1, le=10, description="Escala 1-10")
    ansiedad: int = Field(..., ge=1, le=10, description="Escala 1-10")
    emociones: List[str] = []
    contexto: str = Field(default="", max_length=300)

class EntradaOut(BaseModel):
    id: int
    paciente_id: int
    texto: str
    estado_animo: int
    ansiedad: int
    emociones: str
    contexto: str
    timestamp: datetime

    class Config:
        from_attributes = True