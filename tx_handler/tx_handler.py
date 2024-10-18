import redis
import threading
import time
import json
import requests

# Conexión a Redis
r = redis.StrictRedis(host='redis_server', port=6379, db=0)

# Comunicación con OwnRPC (placeholder)
OWN_RPC_URL = 'http://ownrpc.url/api'

def send_to_ownrpc(action, tx):
    data = {"action": action, "tx": tx}
    # Lógica para comunicarte con OwnRPC
    response = requests.post(OWN_RPC_URL, json=data)
    return response.json()

# Función para manejar una transacción desde txsend
def handle_txsend(tx):
    print(f"Received txsend: {tx}")
    tx_id = tx['tx_id']
    print(f"with id {tx_id}")

    # Timer de 5 segundos para txSend
    timer_5s = threading.Timer(5.0, timeout_txsend, [tx_id])
    timer_5s.start()

    # Escuchar por posibles txclaim
    pubsub = r.pubsub()
    pubsub.subscribe('txclaim')
    
    while True:
        message = pubsub.get_message(timeout=5)
        if message and message['type'] == 'message':
            received_tx = json.loads(message['data'].decode('utf-8'))
            if received_tx['tx_id'] == tx_id:
                timer_5s.cancel()  # Detiene el timer de 5 segundos
                print(f"Received txclaim: {received_tx}")
                handle_txclaim(received_tx)
                break

# Función de timeout para el timer de 5 segundos en txSend
def timeout_txsend(tx_id):
    print(f"Timeout txsend, no txclaim received for {tx_id}. Sending release.")
    print(f'release de {tx_id}')
    #send_to_ownrpc("release", tx_id)

# Función para manejar la transacción en txclaim
def handle_txclaim(tx):
    tx_id = tx['tx_id']
    
    # Timer de 1 minuto para esperar respuesta de usuario
    timer_1m = threading.Timer(20.0, timeout_txclaim, [tx_id])
    timer_1m.start()

    # Aquí esperarías la respuesta de usuario (ok/pass)
    # Simulando con input para ejemplo:

    #hardcodeo la respuesta del usuario
    time.sleep(2)
    user_response = "ok"

    #user_response = input("User action (ok/pass): ").strip()
    
    if user_response == "ok":
        timer_1m.cancel()
        #send_to_ownrpc("drop", tx_id)'
        print('se envia drop al rpc')
    elif user_response == "pass":
        timer_1m.cancel()
        print('se envia release al rpc')
        #send_to_ownrpc("release", tx_id)
    else:
        print("Invalid input, sending release.")
        print('se envia release al rpc por error de msg')
        #send_to_ownrpc("release", tx_id)

# Timeout para el timer de 1 minuto en txClaim
def timeout_txclaim(tx_id):
    print(f"Timeout txclaim, no user response for {tx_id}. Sending release.")
    print('se envia release al rpc por tiempo')
    #send_to_ownrpc("release", tx_id)

# Loop principal de suscripción a txsend
def main():
    pubsub = r.pubsub()
    pubsub.subscribe('txsend')
    
    while True:
        message = pubsub.get_message(timeout=1)
        if message and message['type'] == 'message':
            tx = json.loads(message['data'].decode('utf-8'))
            threading.Thread(target=handle_txsend, args=(tx,)).start()

if __name__ == "__main__":
    main()
