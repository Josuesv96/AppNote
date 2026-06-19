from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class GeneroEnum(str, enum.Enum):
    masculino = "masculino"
    femenino = "femenino"
    otro = "otro"
    prefiero_no_decir = "prefiero_no_decir"

class Expediente(Base):
    __tablename__ = "expedientes"

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("usuarios.id"), unique=True, nullable=False)

    # Datos personales
    fecha_nacimiento = Column(Date, nullable=True)
    genero = Column(Enum(GeneroEnum), nullable=True)
    telefono = Column(String(20), nullable=True)
    direccion = Column(String(300), nullable=True)

    # Contacto de emergencia
    emergencia_nombre = Column(String(100), nullable=True)
    emergencia_telefono = Column(String(20), nullable=True)
    emergencia_relacion = Column(String(50), nullable=True)

    # Información clínica (llenada por terapeuta)
    motivo_consulta = Column(Text, nullable=True)
    diagnostico = Column(Text, nullable=True)
    medicamentos = Column(Text, nullable=True)
    antecedentes = Column(Text, nullable=True)

    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    paciente = relationship("Usuario", backref="expediente")


class NotaSesion(Base):
    __tablename__ = "notas_sesion"

    id = Column(Integer, primary_key=True, index=True)
    terapeuta_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    paciente_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    nota = Column(Text, nullable=False)
    fecha = Column(DateTime(timezone=True), server_default=func.now())

    terapeuta = relationship("Usuario", foreign_keys=[terapeuta_id])
    paciente = relationship("Usuario", foreign_keys=[paciente_id])
