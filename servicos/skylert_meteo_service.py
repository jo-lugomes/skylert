import requests

TRADUCAO_CLIMA = {
    0: "Céu Limpo / Ensolarado",
    1: "Principalmente Limpo",
    2: "Parcialmente Nublado",
    3: "Nublado",
    45: "Névoa",
    48: "Neblina",
    51: "Chuvisco Leve",
    53: "Chuvisco",
    55: "Chuvisco Forte",
    61: "Chuva Leve",
    63: "Chuva",
    65: "Chuva Forte",
    80: "Pancadas de Chuva",
    95: "Tempestade"
}


def gerar_id_cidade(cidade):

    # Converte o nome da cidade em um ID seguro para usar como chave no Firestore.
    # Ex: "São Paulo - SP" → "são_paulo___sp"
    
    return (
        cidade
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
    )


def obter_coordenadas(cidade):
    
    # Consulta a API de geocoding do Open-Meteo e retorna latitude, longitude
    # e nome da primeira cidade correspondente ao termo buscado.
    # Retorna None se nenhum resultado for encontrado.
    
    geo_url = "https://geocoding-api.open-meteo.com/v1/search"

    params = {
        "name": cidade,
        "count": 1,
        "language": "pt",
        "format": "json"
    }

    response = requests.get(geo_url, params=params, timeout=10)
    dados = response.json()

    if "results" not in dados:
        return None

    resultado = dados["results"][0]

    return {
        "latitude": resultado["latitude"],
        "longitude": resultado["longitude"],
        "nome": resultado["name"]
    }


def obter_clima(cidade):

    # Busca as condições climáticas atuais para uma cidade usando o Open-Meteo.
    # Primeiro resolve as coordenadas via geocoding, depois consulta a previsão.
    # Retorna um dicionário com temperatura, umidade, vento, precipitação e
    # código WMO traduzido. Retorna None se a cidade não for encontrada.
    
    coordenadas = obter_coordenadas(cidade)

    if not coordenadas:
        return None

    latitude = coordenadas["latitude"]
    longitude = coordenadas["longitude"]

    weather_url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "precipitation_probability",
            "weather_code",
            "wind_speed_10m",
            "is_day"
        ],
        "timezone": "America/Sao_Paulo"
    }

    response = requests.get(weather_url, params=params, timeout=10)
    dados = response.json()

    current = dados.get("current")

    if not current:
        return None

    codigo = current.get("weather_code", 0)

    return {
        "cidade": cidade,
        "weather_code": codigo,
        "descricao": TRADUCAO_CLIMA.get(codigo, "Desconhecido"),
        "temperatura": current.get("temperature_2m"),
        "sensacao": current.get("apparent_temperature"),
        "umidade": current.get("relative_humidity_2m"),
        "vento": current.get("wind_speed_10m"),
        "precipitacao": current.get("precipitation"),
        "chuva": current.get("precipitation_probability"),
        "is_day": current.get("is_day")
    }


if __name__ == "__main__":
    clima = obter_clima("Manaus")
    print(clima)