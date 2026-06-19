from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.entrada import Entrada
from app.models.usuario import Usuario, RolUsuario
from app.models.relacion import RelacionTerapeutaPaciente
from app.schemas.entrada import EntradaOut
from app.schemas.usuario import UsuarioOut
from app.core.dependencies import require_rol
from app.core.auditoria import registrar

router = APIRouter(prefix="/terapeuta", tags=["Terapeuta"])

@router.get("/mis-pacientes", response_model=List[UsuarioOut])
def mis_pacientes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.terapeuta))
):
    relaciones = db.query(RelacionTerapeutaPaciente)\
                   .filter(RelacionTerapeutaPaciente.terapeuta_id == current_user.id).all()
    ids = [r.paciente_id for r in relaciones]
    return db.query(Usuario).filter(Usuario.id.in_(ids)).all()

@router.get("/paciente/{paciente_id}/entradas", response_model=List[EntradaOut])
def entradas_paciente(
    paciente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.terapeuta))
):
    relacion = db.query(RelacionTerapeutaPaciente).filter(
        RelacionTerapeutaPaciente.terapeuta_id == current_user.id,
        RelacionTerapeutaPaciente.paciente_id == paciente_id
    ).first()
    if not relacion:
        raise HTTPException(status_code=403, detail="No tienes acceso a este paciente")
    registrar(db, "VER_ENTRADAS_PACIENTE", f"Terapeuta consultó entradas del paciente id={paciente_id}", usuario_id=current_user.id, usuario_nombre=current_user.nombre)
    return db.query(Entrada)\
             .filter(Entrada.paciente_id == paciente_id)\
             .order_by(Entrada.timestamp.desc()).all()

@router.get("/paciente/{paciente_id}/estadisticas")
def estadisticas_paciente(
    paciente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.terapeuta))
):
    relacion = db.query(RelacionTerapeutaPaciente).filter(
        RelacionTerapeutaPaciente.terapeuta_id == current_user.id,
        RelacionTerapeutaPaciente.paciente_id == paciente_id
    ).first()
    if not relacion:
        raise HTTPException(status_code=403, detail="No tienes acceso a este paciente")
    entradas = db.query(Entrada).filter(Entrada.paciente_id == paciente_id).all()
    if not entradas:
        return {"mensaje": "Sin entradas aun"}
    total = len(entradas)
    avg_animo = round(sum(e.estado_animo for e in entradas) / total, 1)
    avg_ansiedad = round(sum(e.ansiedad for e in entradas) / total, 1)
    conteo_emociones = {}
    for e in entradas:
        for emo in e.emociones.split(","):
            if emo:
                conteo_emociones[emo] = conteo_emociones.get(emo, 0) + 1
    tendencia = [{"fecha": str(e.timestamp.date()), "animo": e.estado_animo, "ansiedad": e.ansiedad} for e in entradas]
    return {
        "total_entradas": total,
        "promedio_animo": avg_animo,
        "promedio_ansiedad": avg_ansiedad,
        "emociones_frecuentes": sorted(conteo_emociones.items(), key=lambda x: x[1], reverse=True)[:5],
        "tendencia": tendencia
    }
