from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioOut
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.core.auditoria import registrar

router = APIRouter()

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    
    if not usuario:
        registrar(db, "LOGIN_FALLIDO", f"Intento fallido para {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )
    
    if not verify_password(form_data.password, usuario.password_hash):
        registrar(db, "LOGIN_FALLIDO", f"Intento fallido para {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )
    
    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo"
        )
    
    access_token = create_access_token(
        data={"sub": usuario.email, "rol": usuario.rol.value},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    registrar(db, "LOGIN", f"Login exitoso: {usuario.email}", usuario_id=usuario.id, usuario_nombre=usuario.nombre)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "rol": usuario.rol.value,
        "nombre": usuario.nombre,
        "id": usuario.id
    }

@router.post("/registro", response_model=UsuarioOut)
def registro(
    usuario_data: UsuarioCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    nuevo_usuario = Usuario(
        nombre=usuario_data.nombre,
        email=usuario_data.email,
        password_hash=get_password_hash(usuario_data.password),
        rol=usuario_data.rol
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    
    registrar(db, "REGISTRO", f"Nuevo usuario: {nuevo_usuario.email}")
    
    return nuevo_usuario
