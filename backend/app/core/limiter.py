"""
Configuracion del rate limiter (slowapi).

Se define en su propio modulo para que tanto main.py como los routers
puedan importar la misma instancia sin imports circulares.

key_func = get_remote_address  -> el limite se aplica POR IP de origen.

IMPORTANTE sobre proxies inversos (nginx, traefik, etc.):
Si la app corre detras de un proxy, request.client.host sera la IP del
proxy y TODOS los usuarios compartirian el mismo cupo. Para que el limite
sea por IP real del cliente:
  1. Levantar uvicorn con --proxy-headers (y --forwarded-allow-ips).
  2. Asegurarse de que el proxy reenvie la cabecera X-Forwarded-For.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)