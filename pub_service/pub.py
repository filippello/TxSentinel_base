import redis
import time

# Conectar a Redis (asegúrate de que este host sea correcto en Docker Compose)
r = redis.Redis(host='redis_server', port=6379, db=0)

while True:
    # Publicar un mensaje en el canal txsend
    r.publish('txsend', 'Mensaje de transacción enviada')
    print("Mensaje enviado a txsend")
    
    # Publicar un mensaje en el canal txclaim
    r.publish('txclaim', 'Mensaje de reclamación realizada')
    print("Mensaje enviado a txclaim")
    
    # Esperar un tiempo antes de enviar otro mensaje
    time.sleep(5)

