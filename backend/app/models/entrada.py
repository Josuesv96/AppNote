from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import ForeignKey
from app.database import Base

class Entrada(Base):
    __tablename__ = "entradas"

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    texto = Column(Text, nullable=False)
    estado_animo = Column(Integer, nullable=False)   # 1-10
    ansiedad = Column(Integer, nullable=False)        # 1-10
    emociones = Column(String(500), default="")      # guardadas como "Alegría,Calma,Miedo"
    contexto = Column(String(300), default="")
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    paciente = relationship("Usuario", back_populates="entradas")