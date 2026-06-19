from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class RelacionTerapeutaPaciente(Base):
    __tablename__ = "relaciones_terapeuta_paciente"

    id = Column(Integer, primary_key=True, index=True)
    terapeuta_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    paciente_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_asignacion = Column(DateTime(timezone=True), server_default=func.now())

    terapeuta = relationship("Usuario",
                             foreign_keys=[terapeuta_id],
                             back_populates="pacientes")
    paciente = relationship("Usuario",
                            foreign_keys=[paciente_id],
                            back_populates="terapeuta_asignado")