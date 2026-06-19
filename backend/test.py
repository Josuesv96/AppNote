"""
Prueba rápida de la corrección de escalada de privilegios.
Ejecutar desde la carpeta backend/ con el entorno virtual activado:

    python test_seguridad_registro.py

No toca la base de datos: solo valida los schemas de Pydantic.
"""
from pydantic import ValidationError
from app.schemas.usuario import UsuarioRegistroPublico, UsuarioCreate


def main():
    print("=== PRUEBA 1: Ataque de escalada en registro público ===")
    try:
        u = UsuarioRegistroPublico(
            nombre="Atacante", email="hack@x.com",
            password="pass12345", rol="admin"
        )
        print("✗ FALLO: el ataque pasó ->", u)
    except ValidationError:
        print("✓ BLOQUEADO: el campo 'rol' es rechazado (extra=forbid -> 422)")

    print("\n=== PRUEBA 2: Registro público legítimo (sin rol) ===")
    u = UsuarioRegistroPublico(
        nombre="Paciente Real", email="pac@x.com", password="passok123"
    )
    print(f"✓ OK -> nombre: {u.nombre} | email: {u.email} | (no existe campo rol)")

    print("\n=== PRUEBA 3: Contraseña demasiado corta ===")
    try:
        UsuarioRegistroPublico(nombre="X", email="a@b.com", password="123")
        print("✗ FALLO: aceptó password corto")
    except ValidationError:
        print("✓ BLOQUEADO: password < 8 caracteres rechazado")

    print("\n=== PRUEBA 4: Admin SÍ puede definir rol (endpoint protegido) ===")
    a = UsuarioCreate(
        nombre="Nuevo Terapeuta", email="ter@x.com",
        password="passok123", rol="terapeuta"
    )
    print(f"✓ OK -> el admin puede crear con rol: {a.rol.value}")


def test_entradas():
    """Validaciones de rango y longitud en EntradaCreate."""
    from pydantic import ValidationError
    from app.schemas.entrada import EntradaCreate

    print("\n=== PRUEBA 5: estado_animo fuera de rango (11) ===")
    try:
        EntradaCreate(texto="hoy", estado_animo=11, ansiedad=5)
        print("✗ FALLO: aceptó estado_animo=11")
    except ValidationError:
        print("✓ BLOQUEADO: estado_animo debe estar entre 1 y 10")

    print("\n=== PRUEBA 6: ansiedad = 0 (fuera de rango) ===")
    try:
        EntradaCreate(texto="hoy", estado_animo=5, ansiedad=0)
        print("✗ FALLO: aceptó ansiedad=0")
    except ValidationError:
        print("✓ BLOQUEADO: ansiedad debe estar entre 1 y 10")

    print("\n=== PRUEBA 7: texto vacío ===")
    try:
        EntradaCreate(texto="", estado_animo=5, ansiedad=5)
        print("✗ FALLO: aceptó texto vacío")
    except ValidationError:
        print("✓ BLOQUEADO: el texto no puede estar vacío")

    print("\n=== PRUEBA 8: entrada válida ===")
    e = EntradaCreate(texto="Me siento bien", estado_animo=7, ansiedad=3,
                      emociones=["Calma"], contexto="trabajo")
    print(f"✓ OK -> ánimo: {e.estado_animo}/10, ansiedad: {e.ansiedad}/10")


if __name__ == "__main__":
    main()
    test_entradas()