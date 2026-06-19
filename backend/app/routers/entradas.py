from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.entrada import Entrada
from app.models.usuario import Usuario, RolUsuario
from app.schemas.entrada import EntradaCreate, EntradaOut
from app.core.dependencies import get_current_user, require_rol
from app.core.auditoria import registrar

router = APIRouter(prefix="/entradas", tags=["Entradas"])

@router.post("/", response_model=EntradaOut, status_code=201)
def crear_entrada(
    datos: EntradaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.paciente))
):
    entrada = Entrada(
        paciente_id=current_user.id,
        texto=datos.texto,
        estado_animo=datos.estado_animo,
        ansiedad=datos.ansiedad,
        emociones=",".join(datos.emociones),
        contexto=datos.contexto
    )
    db.add(entrada)
    db.commit()
    db.refresh(entrada)
    registrar(db, "CREAR_ENTRADA", f"Nueva entrada — ánimo: {datos.estado_animo}/10, ansiedad: {datos.ansiedad}/10", usuario_id=current_user.id, usuario_nombre=current_user.nombre)
    return entrada

@router.get("/mis-entradas", response_model=List[EntradaOut])
def mis_entradas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.paciente))
):
    return db.query(Entrada)\
             .filter(Entrada.paciente_id == current_user.id)\
             .order_by(Entrada.timestamp.desc()).all()

@router.delete("/{entrada_id}", status_code=204)
def eliminar_entrada(
    entrada_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.paciente))
):
    entrada = db.query(Entrada).filter(
        Entrada.id == entrada_id,
        Entrada.paciente_id == current_user.id
    ).first()
    if not entrada:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    registrar(db, "ELIMINAR_ENTRADA", f"Entrada eliminada (id={entrada_id})", usuario_id=current_user.id, usuario_nombre=current_user.nombre)
    db.delete(entrada)
    db.commit()
