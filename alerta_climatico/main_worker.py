import os
import sys
import time

# Garante que os módulos da pasta raiz e de 'servicos' sejam encontrados
PASTA_RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(PASTA_RAIZ)
sys.path.append(os.path.join(PASTA_RAIZ, "servicos"))

from skylert_worker import atualizar_cache_climatico
from notification_worker import verificar_alertas

# Loop principal: atualiza o cache climático e verifica alertas a cada 5 minutos
while True:
    print("\nINICIANDO CICLO...\n")

    atualizar_cache_climatico()
    verificar_alertas()

    print("\nAGUARDANDO 5 MIN...\n")
    time.sleep(300)