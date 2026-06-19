from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class LogAuditoria(Base):
    __tablename__ = "log_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    usuario_nombre = Column(String(100), nullable=True)
    accion = Column(String(100), nullable=False)
    detalle = Column(String(500), nullable=True)
    ip = Column(String(50), nullable=True)
    fecha = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", foreign_keys=[usuario_id])
