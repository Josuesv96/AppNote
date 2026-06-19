from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.usuario import Usuario, RolUsuario
from app.models.relacion import RelacionTerapeutaPaciente
from app.models.entrada import Entrada
from app.schemas.usuario import UsuarioCreate, UsuarioOut, UsuarioUpdate
from app.core.dependencies import require_rol
from app.core.auditoria import registrar
from app.core.security import hash_password, get_password_hash

router = APIRouter(prefix="/admin", tags=["Administrador"])

@router.get("/usuarios", response_model=List[UsuarioOut])
def listar_usuarios(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_rol(RolUsuario.admin))
):
    return db.query(Usuario).all()

@router.post("/usuarios", response_model=UsuarioOut, status_code=201)
def crear_usuario(
    datos: UsuarioCreate,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_rol(RolUsuario.admin))
):
    """
    Creación de usuarios con rol específico (terapeuta, admin o paciente).
    Protegido: solo un administrador autenticado puede acceder.
    Este es el ÚNICO camino para crear cuentas con rol distinto a paciente.
    """
    existing = db.query(Usuario).filter(Usuario.email == datos.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    nuevo = Usuario(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=get_password_hash(datos.password),
        rol=datos.rol
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    registrar(
        db, "CREAR_USUARIO",
        f"Admin creó usuario {nuevo.email} con rol {nuevo.rol.value}",
        usuario_id=current_admin.id, usuario_nombre=current_admin.nombre
    )
    return nuevo

@router.patch("/usuarios/{usuario_id}/activar")
def toggle_activo(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_rol(RolUsuario.admin))
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.activo = 0 if usuario.activo else 1
    db.commit()
    estado = "activado" if usuario.activo else "desactivado"
    registrar(db, "TOGGLE_USUARIO", f"Usuario {usuario.nombre} ({usuario.email}) {estado}", usuario_id=current_admin.id, usuario_nombre=current_admin.nombre)
    return {"id": usuario_id, "activo": usuario.activo}

@router.post("/asignar-paciente")
def asignar_paciente(
    terapeuta_id: int,
    paciente_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_rol(RolUsuario.admin))
):
    existe = db.query(RelacionTerapeutaPaciente).filter_by(
        terapeuta_id=terapeuta_id, paciente_id=paciente_id
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya estan asignados")
    relacion = RelacionTerapeutaPaciente(terapeuta_id=terapeuta_id, paciente_id=paciente_id)
    db.add(relacion)
    db.commit()
    registrar(db, "ASIGNAR_PACIENTE", f"Paciente id={paciente_id} asignado a terapeuta id={terapeuta_id}", usuario_id=current_admin.id, usuario_nombre=current_admin.nombre)
    return {"mensaje": "Paciente asignado correctamente"}

@router.put("/usuarios/{usuario_id}")
def editar_usuario(
    usuario_id: int,
    datos: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_rol(RolUsuario.admin))
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # SEGURIDAD: un admin no puede quitarse a sí mismo el rol de admin
    # (evita quedarse fuera del sistema por accidente).
    if (
        usuario_id == current_admin.id
        and datos.rol is not None
        and datos.rol != RolUsuario.admin
    ):
        raise HTTPException(
            status_code=400,
            detail="No puedes cambiar tu propio rol de administrador"
        )

    if datos.nombre is not None:
        usuario.nombre = datos.nombre
    if datos.email is not None:
        usuario.email = datos.email
    if datos.rol is not None:
        usuario.rol = datos.rol
    db.commit()
    db.refresh(usuario)
    registrar(db, "EDITAR_USUARIO", f"Usuario {usuario.nombre} ({usuario.email}) editado", usuario_id=current_admin.id, usuario_nombre=current_admin.nombre)
    return usuario

@router.delete("/usuarios/{usuario_id}")
def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_rol(RolUsuario.admin))
):
    if usuario_id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    nombre = usuario.nombre
    email = usuario.email

    from app.models.entrada import Entrada
    from app.models.expediente import Expediente, NotaSesion
    from app.models.auditoria import LogAuditoria

    db.query(NotaSesion).filter(
        (NotaSesion.terapeuta_id == usuario_id) | (NotaSesion.paciente_id == usuario_id)
    ).delete(synchronize_session=False)

    db.query(Expediente).filter(Expediente.paciente_id == usuario_id).delete(synchronize_session=False)
    db.query(Entrada).filter(Entrada.paciente_id == usuario_id).delete(synchronize_session=False)
    db.query(RelacionTerapeutaPaciente).filter(
        (RelacionTerapeutaPaciente.terapeuta_id == usuario_id) |
        (RelacionTerapeutaPaciente.paciente_id == usuario_id)
    ).delete(synchronize_session=False)
    db.query(LogAuditoria).filter(LogAuditoria.usuario_id == usuario_id).delete(synchronize_session=False)

    db.delete(usuario)
    db.commit()
    registrar(db, "ELIMINAR_USUARIO", f"Usuario {nombre} ({email}) eliminado", usuario_id=admin.id, usuario_nombre=admin.nombre)
    return {"mensaje": "Usuario eliminado correctamente"}

@router.get("/estadisticas")
def estadisticas_sistema(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_rol(RolUsuario.admin))
):
    from datetime import datetime, timezone, timedelta
    
    total_terapeutas = db.query(Usuario).filter(Usuario.rol == RolUsuario.terapeuta, Usuario.activo == 1).count()
    total_pacientes = db.query(Usuario).filter(Usuario.rol == RolUsuario.paciente, Usuario.activo == 1).count()
    total_entradas = db.query(Entrada).count()
    total_admins = db.query(Usuario).filter(Usuario.rol == RolUsuario.admin, Usuario.activo == 1).count()

    hace_30 = datetime.now(timezone.utc) - timedelta(days=30)
    nuevos_pacientes = db.query(Usuario).filter(
        Usuario.rol == RolUsuario.paciente,
        Usuario.fecha_registro >= hace_30
    ).count()
    nuevas_entradas = db.query(Entrada).filter(Entrada.timestamp >= hace_30).count()
    nuevos_terapeutas = db.query(Usuario).filter(
        Usuario.rol == RolUsuario.terapeuta,
        Usuario.fecha_registro >= hace_30
    ).count()

    promedio_entradas = round(total_entradas / total_pacientes, 1) if total_pacientes else 0

    return {
        "total_terapeutas": total_terapeutas,
        "total_pacientes": total_pacientes,
        "total_entradas": total_entradas,
        "total_admins": total_admins,
        "nuevos_pacientes_30d": nuevos_pacientes,
        "nuevas_entradas_30d": nuevas_entradas,
        "nuevos_terapeutas_30d": nuevos_terapeutas,
        "promedio_entradas_por_paciente": promedio_entradas
    }

@router.get("/auditoria")
def ver_auditoria(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_rol(RolUsuario.admin))
):
    from app.models.auditoria import LogAuditoria
    logs = db.query(LogAuditoria).order_by(LogAuditoria.fecha.desc()).limit(100).all()
    return [
        {
            "id": l.id,
            "usuario_nombre": l.usuario_nombre,
            "accion": l.accion,
            "detalle": l.detalle,
            "fecha": str(l.fecha)
        }
        for l in logs
    ]

@router.patch("/usuarios/{usuario_id}/password")
def cambiar_password(
    usuario_id: int,
    datos: dict,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_rol(RolUsuario.admin))
):
    if not datos.get("password") or len(datos["password"]) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.password_hash = hash_password(datos["password"])
    db.commit()
    registrar(db, "CAMBIAR_PASSWORD", f"Contraseña cambiada para {usuario.nombre} ({usuario.email})", usuario_id=admin.id, usuario_nombre=admin.nombre)
    return {"mensaje": "Contraseña actualizada correctamente"}

@router.get("/terapeuta/{terapeuta_id}/detalle")
def detalle_terapeuta(
    terapeuta_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_rol(RolUsuario.admin))
):
    terapeuta = db.query(Usuario).filter(
        Usuario.id == terapeuta_id,
        Usuario.rol == RolUsuario.terapeuta
    ).first()
    if not terapeuta:
        raise HTTPException(status_code=404, detail="Terapeuta no encontrado")

    pacientes_detalle = []
    for relacion in terapeuta.pacientes:
        p = relacion.paciente
        entradas = db.query(Entrada).filter(Entrada.paciente_id == p.id).all()
        total = len(entradas)
        prom_animo = round(sum(e.estado_animo for e in entradas) / total, 1) if total else 0
        ultima = max((e.timestamp for e in entradas), default=None)
        pacientes_detalle.append({
            "id": p.id,
            "nombre": p.nombre,
            "email": p.email,
            "activo": p.activo,
            "total_entradas": total,
            "promedio_animo": prom_animo,
            "ultima_entrada": str(ultima.date()) if ultima else None
        })

    return {
        "id": terapeuta.id,
        "nombre": terapeuta.nombre,
        "email": terapeuta.email,
        "activo": terapeuta.activo,
        "fecha_registro": str(terapeuta.fecha_registro.date()),
        "total_pacientes": len(pacientes_detalle),
        "pacientes": pacientes_detalle
    }

@router.get("/test")
def test_admin(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_rol(RolUsuario.admin))
):
    return {"message": "Admin endpoint works!", "user": current_admin.email}

@router.get("/public-test")
def public_test():
    return {"message": "Public test endpoint works!"}