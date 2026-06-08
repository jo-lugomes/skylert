import firebase_admin

from firebase_admin import (
    credentials,
    firestore
)

# Inicializa o Firebase Admin SDK apenas uma vez para evitar erros de app duplicado
if not firebase_admin._apps:
    cred = credentials.Certificate("firebase-chave.json")
    firebase_admin.initialize_app(cred)

# Instância global do Firestore usada pelos workers e demais módulos
db = firestore.client()