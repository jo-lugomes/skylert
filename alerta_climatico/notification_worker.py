import os
import smtplib

from firebase_config import db
from dotenv import load_dotenv
from email.mime.text import MIMEText
from skylert_meteo_service import gerar_id_cidade

load_dotenv()

EMAIL_REMETENTE = os.getenv("EMAIL_REMETENTE")
EMAIL_SENHA_APP = os.getenv("EMAIL_SENHA_APP")


def enviar_email_alerta(destinatario, cidade, titulo, mensagem):

    # Envia um e-mail de alerta climático via SMTP do Gmail (SSL, porta 465).
    # As credenciais são lidas das variáveis de ambiente EMAIL_REMETENTE e EMAIL_SENHA_APP.

    assunto = f"⚠️ Skylert - {titulo}"

    corpo = f"""
Olá!

O Skylert detectou uma condição climática severa.

Cidade:
{cidade}

Detalhes:
{mensagem}

Tome cuidado.

Equipe Skylert.
"""

    msg = MIMEText(corpo)
    msg['Subject'] = assunto
    msg['From'] = EMAIL_REMETENTE
    msg['To'] = destinatario

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as servidor:
            servidor.login(EMAIL_REMETENTE, EMAIL_SENHA_APP)
            servidor.sendmail(EMAIL_REMETENTE, destinatario, msg.as_string())

        print(f"[OK] E-mail enviado para {destinatario}")

    except Exception as e:
        print(f"[ERRO] SMTP: {e}")


def verificar_alertas():
    ""
    # Percorre todos os documentos de 'alertas_config' no Firestore e verifica
    # se as condições climáticas atuais da cidade monitorada atingem algum
    # limite configurado pelo usuário (chuva forte, ventania, temperatura crítica).

    # Para cada alerta disparado, o campo 'ultimoWeatherCode' é atualizado no Firestore,
    # impedindo que o mesmo alerta seja enviado repetidamente enquanto o clima não mudar.

    print("\n==========================")
    print("VERIFICANDO ALERTAS")
    print("==========================\n")

    usuarios = db.collection("alertas_config").stream()

    for usuario in usuarios:
        try:
            dados = usuario.to_dict()

            cidade = dados.get("cidadeMonitorada")
            email = dados.get("emailUsuario")

            if not cidade or not email:
                continue

            cidade_id = gerar_id_cidade(cidade)
            clima_doc = db.collection("clima_cache").document(cidade_id).get()

            if not clima_doc.exists:
                print(f"[ERRO] Cache não encontrado para {cidade}")
                continue

            clima = clima_doc.to_dict()

            codigo = clima.get("weatherCode", 0)
            temperatura = clima.get("temperatura", 0)
            vento = clima.get("vento", 0)
            chuva = clima.get("chuva", 0)
            precipitacao = clima.get("precipitacao", 0)
            descricao = clima.get("descricao", "Desconhecido")

            ultimo_codigo = dados.get("ultimoWeatherCode")

            # Pula se o código de clima não mudou desde o último alerta enviado
            if ultimo_codigo == codigo:
                print(f"[INFO] Alerta já enviado para {cidade}")
                continue

            alerta_disparado = False

            # Chuva: aciona se chance ≥ 70%, precipitação > 8mm, ou código WMO de chuva forte/tempestade
            if (
                dados.get("receberChuva")
                and (chuva >= 70 or precipitacao > 8 or codigo in [65, 80, 95])
            ):
                enviar_email_alerta(
                    email, cidade, "Chuva Forte",
                    f"{descricao}\n\nChance de chuva: {chuva}%\nPrecipitação: {precipitacao} mm"
                )
                alerta_disparado = True

            # Vento: aciona se velocidade > 36 km/h
            if dados.get("receberVento") and vento > 36:
                enviar_email_alerta(
                    email, cidade, "Ventania Extrema",
                    f"Ventos de {vento} km/h detectados."
                )
                alerta_disparado = True

            # Temperatura: aciona se abaixo de 12°C ou acima de 35°C
            if (
                dados.get("receberTemperatura")
                and (temperatura < 12 or temperatura > 35)
            ):
                enviar_email_alerta(
                    email, cidade, "Temperatura Crítica",
                    f"Temperatura atual: {temperatura}°C"
                )
                alerta_disparado = True

            # Registra o código atual para evitar alertas duplicados no próximo ciclo
            if alerta_disparado:
                db.collection("alertas_config").document(usuario.id).update({
                    "ultimoWeatherCode": codigo
                })
                print(f"[OK] Alerta registrado {cidade}")

        except Exception as e:
            print(f"[ERRO] {e}")


if __name__ == "__main__":
    verificar_alertas()