from sqlalchemy.orm import Session
from app.models.auditoria import LogAuditoria

def registrar(
    db: Session,
    accion: str,
    detalle: str = None,
    usuario_id: int = None,
    usuario_nombre: str = None,
    ip: str = None
):
    log = LogAuditoria(
        usuario_id=usuario_id,
        usuario_nombre=usuario_nombre,
        accion=accion,
        detalle=detalle,
        ip=ip
    )
    db.add(log)
    db.commit()
