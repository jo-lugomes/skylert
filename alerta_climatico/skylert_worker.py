from firebase_config import db
from datetime import datetime
from skylert_meteo_service import (
    obter_clima,
    gerar_id_cidade
)


def atualizar_cache_climatico():

    # Lê todas as configurações de alerta no Firestore, coleta as cidades únicas
    # monitoradas e atualiza o documento de cache climático de cada uma delas.

    # O cache é salvo na coleção 'clima_cache' com o ID gerado por gerar_id_cidade().
    # Cidades duplicadas são ignoradas para evitar chamadas redundantes à API.
    
    print("\n==============================")
    print("ATUALIZANDO CACHE CLIMÁTICO")
    print("==============================\n")

    docs = db.collection("alertas_config").stream()

    # Usa um set para garantir que cada cidade seja consultada apenas uma vez
    cidades_unicas = set()

    for doc in docs:
        dados = doc.to_dict()
        cidade = dados.get("cidadeMonitorada")
        if cidade:
            cidades_unicas.add(cidade)

    print(f"{len(cidades_unicas)} cidades encontradas.\n")

    for cidade in cidades_unicas:
        try:
            print(f"[INFO] Consultando {cidade}")

            # Remove o estado do nome antes de buscar (ex: "Boa Vista - Roraima" → "Boa Vista")
            cidade_busca = cidade.split(" - ")[0].strip() if " - " in cidade else cidade

            clima = obter_clima(cidade_busca)

            if not clima:
                print(f"[ERRO] Não foi possível obter clima de {cidade}")
                continue

            cidade_id = gerar_id_cidade(cidade)

            db.collection("clima_cache").document(cidade_id).set({
                "cidade": cidade,
                "weatherCode": clima["weather_code"],
                "descricao": clima["descricao"],
                "temperatura": clima["temperatura"],
                "sensacao": clima["sensacao"],
                "umidade": clima["umidade"],
                "vento": clima["vento"],
                "precipitacao": clima["precipitacao"],
                "chuva": clima["chuva"],
                "isDay": clima["is_day"],
                "ultimaAtualizacao": datetime.utcnow()
            })

            print(f"[OK] Cache atualizado {cidade}")

        except Exception as e:
            print(f"[ERRO] {cidade}: {e}")


if __name__ == "__main__":
    atualizar_cache_climatico()