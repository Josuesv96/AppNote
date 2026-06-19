from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.usuario import Usuario, RolUsuario
from app.models.expediente import Expediente, NotaSesion
from app.models.relacion import RelacionTerapeutaPaciente
from app.schemas.expediente import (
    ExpedienteUpdate, ExpedienteClinicaUpdate,
    ExpedienteOut, NotaSesionCreate, NotaSesionOut
)
from app.core.dependencies import require_rol
from app.core.auditoria import registrar

router = APIRouter(prefix="/expediente", tags=["Expediente"])

def get_or_create_expediente(paciente_id: int, db: Session) -> Expediente:
    exp = db.query(Expediente).filter(Expediente.paciente_id == paciente_id).first()
    if not exp:
        exp = Expediente(paciente_id=paciente_id)
        db.add(exp)
        db.commit()
        db.refresh(exp)
    return exp

# --- Paciente: ver y editar sus datos personales ---

@router.get("/mi-expediente")
def ver_mi_expediente(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.paciente))
):
    exp = get_or_create_expediente(current_user.id, db)
    return {
        "id": exp.id,
        "paciente_id": exp.paciente_id,
        "fecha_nacimiento": exp.fecha_nacimiento,
        "genero": exp.genero,
        "telefono": exp.telefono,
        "direccion": exp.direccion,
        "emergencia_nombre": exp.emergencia_nombre,
        "emergencia_telefono": exp.emergencia_telefono,
        "emergencia_relacion": exp.emergencia_relacion,
        "fecha_actualizacion": exp.fecha_actualizacion
    }

@router.put("/mi-expediente", response_model=ExpedienteOut)
def actualizar_mi_expediente(
    datos: ExpedienteUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.paciente))
):
    exp = get_or_create_expediente(current_user.id, db)
    for field, value in datos.model_dump(exclude_unset=True).items():
        setattr(exp, field, value)
    db.commit()
    db.refresh(exp)
    registrar(db, "ACTUALIZAR_EXPEDIENTE", "Paciente actualizó su expediente personal", usuario_id=current_user.id, usuario_nombre=current_user.nombre)
    return exp

# --- Terapeuta: ver expediente completo y editar sección clínica ---

@router.get("/paciente/{paciente_id}", response_model=ExpedienteOut)
def ver_expediente_paciente(
    paciente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.terapeuta))
):
    relacion = db.query(RelacionTerapeutaPaciente).filter_by(
        terapeuta_id=current_user.id, paciente_id=paciente_id
    ).first()
    if not relacion:
        raise HTTPException(status_code=403, detail="No tienes acceso a este paciente")
    return get_or_create_expediente(paciente_id, db)

@router.put("/paciente/{paciente_id}/clinica", response_model=ExpedienteOut)
def actualizar_clinica(
    paciente_id: int,
    datos: ExpedienteClinicaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.terapeuta))
):
    relacion = db.query(RelacionTerapeutaPaciente).filter_by(
        terapeuta_id=current_user.id, paciente_id=paciente_id
    ).first()
    if not relacion:
        raise HTTPException(status_code=403, detail="No tienes acceso a este paciente")
    exp = get_or_create_expediente(paciente_id, db)
    for field, value in datos.model_dump(exclude_unset=True).items():
        setattr(exp, field, value)
    db.commit()
    db.refresh(exp)
    registrar(db, "ACTUALIZAR_CLINICA", f"Terapeuta actualizó información clínica del paciente id={paciente_id}", usuario_id=current_user.id, usuario_nombre=current_user.nombre)
    return exp

# --- Notas de sesión (solo terapeuta) ---

@router.post("/paciente/{paciente_id}/notas", response_model=NotaSesionOut)
def crear_nota(
    paciente_id: int,
    datos: NotaSesionCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.terapeuta))
):
    relacion = db.query(RelacionTerapeutaPaciente).filter_by(
        terapeuta_id=current_user.id, paciente_id=paciente_id
    ).first()
    if not relacion:
        raise HTTPException(status_code=403, detail="No tienes acceso a este paciente")
    nota = NotaSesion(
        terapeuta_id=current_user.id,
        paciente_id=paciente_id,
        nota=datos.nota
    )
    db.add(nota)
    db.commit()
    db.refresh(nota)
    registrar(db, "CREAR_NOTA_SESION", f"Terapeuta agregó nota de sesión para paciente id={paciente_id}", usuario_id=current_user.id, usuario_nombre=current_user.nombre)
    return nota

@router.get("/paciente/{paciente_id}/notas", response_model=List[NotaSesionOut])
def ver_notas(
    paciente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.terapeuta))
):
    relacion = db.query(RelacionTerapeutaPaciente).filter_by(
        terapeuta_id=current_user.id, paciente_id=paciente_id
    ).first()
    if not relacion:
        raise HTTPException(status_code=403, detail="No tienes acceso a este paciente")
    return db.query(NotaSesion).filter_by(
        terapeuta_id=current_user.id,
        paciente_id=paciente_id
    ).order_by(NotaSesion.fecha.desc()).all()

@router.delete("/paciente/{paciente_id}/notas/{nota_id}")
def eliminar_nota(
    paciente_id: int,
    nota_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.terapeuta))
):
    nota = db.query(NotaSesion).filter_by(
        id=nota_id, terapeuta_id=current_user.id, paciente_id=paciente_id
    ).first()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    db.delete(nota)
    db.commit()
    return {"mensaje": "Nota eliminada"}
