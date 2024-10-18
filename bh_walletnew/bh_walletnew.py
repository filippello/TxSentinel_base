import redis
import threading
import json
import time
import requests
from bs4 import BeautifulSoup

# List of suspicious addresses
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
    if check_wallet(tx_to):
        #simula el delay de eleccion, sino recibe todo junto y se vuelve un poco loco
        time.sleep(1)
        # Create warning message
        warning_data = {
            "tx_id": tx_id,
            "recipient": tx_to,
            "warning_level": "mediaum",
            "reason": "Wallet is empty, are you sure you want to send funds?"
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

def check_wallet(tx_to):
    # URL to scrape
    print(f"Checking wallet: {tx_to}")
    url = f"https://testnet.snowtrace.io/address/{tx_to}"

    # Perform a GET request to fetch the page content
    response = requests.get(url)

    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(response.text, "html.parser")

    # Find the relevant text on the page
    transactions_text = soup.get_text()

    # Check if "Latest 0 from a total of 0 transactions" exists in the text
    check_phrase = "Latest 0 from a total of 0 transactions" in transactions_text

    if check_phrase:
        return True


if __name__ == "__main__":
    main()
