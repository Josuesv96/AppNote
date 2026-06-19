from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.routers import auth, entradas, terapeuta, admin, expediente
from app.database import engine, Base
from app.core.limiter import limiter

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AppNote API", version="1.0.0")

# Rate limiting: registrar el limiter y el manejador de "limite excedido" (HTTP 429)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://172.31.20.100:4200",
        "http://127.0.0.1:4200"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
# auth NO tiene prefix en el router, por eso necesita prefix aqui
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
# Los demas routers YA tienen prefix definido en su propio archivo
app.include_router(entradas.router, tags=["Entradas"])
app.include_router(terapeuta.router, tags=["Terapeuta"])
app.include_router(admin.router, tags=["Admin"])
app.include_router(expediente.router, tags=["Expediente"])

@app.get("/")
def root():
    return {"message": "AppNote API", "status": "running"}