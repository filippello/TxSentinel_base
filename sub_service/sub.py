import redis

# Conectar a Redis (asegúrate de que este host sea correcto en Docker Compose)
r = redis.Redis(host='redis_server', port=6379, db=0)

# Suscribirse a los canales txsend y txclaim
pubsub = r.pubsub()
pubsub.subscribe(['txsend', 'txclaim'])

print("Esperando mensajes...")

# Leer los mensajes de los canales
for message in pubsub.listen():
    if message['type'] == 'message':
        print(f"Mensaje recibido del canal {message['channel'].decode('utf-8')}: {message['data'].decode('utf-8')}")

