from pydantic import BaseModel
from datetime import datetime
from typing import List

class EntradaCreate(BaseModel):
    texto: str
    estado_animo: int
    ansiedad: int
    emociones: List[str] = []
    contexto: str = ""

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