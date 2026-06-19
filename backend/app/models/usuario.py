from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class RolUsuario(str, enum.Enum):
    paciente = "paciente"
    terapeuta = "terapeuta"
    admin = "admin"

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum(RolUsuario), default=RolUsuario.paciente, nullable=False)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())
    activo = Column(Integer, default=1)

    entradas = relationship("Entrada", back_populates="paciente")
    pacientes = relationship("RelacionTerapeutaPaciente",
                             foreign_keys="RelacionTerapeutaPaciente.terapeuta_id",
                             back_populates="terapeuta")
    terapeuta_asignado = relationship("RelacionTerapeutaPaciente",
                                      foreign_keys="RelacionTerapeutaPaciente.paciente_id",
                                      back_populates="paciente")