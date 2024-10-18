import redis
import threading
import json
import time

# List of suspicious addresses
suspicious_addresses = [
    "0x1234567890abcdef1234567890abcdef12345678",
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
]
input_topic = 'txsend'
output_topic = 'txclaim'

# Conexión a Redis
r = redis.StrictRedis(host='redis_server', port=6379, db=0)

# Comunicación con OwnRPC (placeholder)
OWN_RPC_URL = 'http://ownrpc.url/api'

# Función para manejar una transacción desde txsend
def handle_txsend(tx):
    print(f"Received txsend: {tx}")
    tx_id = tx['tx_id']
    tx_to = tx['unsigned_tx']['to']
    print(f"with id {tx_id}")
    print(f"to {tx_to}")

    # Check if recipient is in suspicious list
    if tx_to in suspicious_addresses:
        #simula el delay de eleccion, sino recibe todo junto y se vuelve un poco loco
        time.sleep(1)
        # Create warning message
        warning_data = {
            "tx_id": tx_id,
            "recipient": tx_to,
            "warning_level": "high",
            "reason": "Recipient is in suspicious list"
        }
        # Send warning message to output topic
        r.publish(output_topic, json.dumps(warning_data))
        print(f"Warning sent for tx_id: {tx_id}")
# Loop principal de suscripción a txsend
def main():
    pubsub = r.pubsub()
    pubsub.subscribe(input_topic)

    while True:
        message = pubsub.get_message(timeout=1)
        if message and message['type'] == 'message':
            tx = json.loads(message['data'].decode('utf-8'))
            threading.Thread(target=handle_txsend, args=(tx,)).start()

if __name__ == "__main__":
    main()
