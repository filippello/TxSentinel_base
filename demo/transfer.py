from web3 import Web3

w3 = Web3(Web3.HTTPProvider("http://localhost:8080"))

if __name__ == "__main__":
    assert w3.is_connected()

    acc0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    acc1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

    acc0_pk = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

    # 1. Build a new tx
    transaction = {
        'from': acc0,
        'to': acc1,
        'value': 1000000000,
        'nonce': w3.eth.get_transaction_count(acc0),
        'gas': 200000,
        'maxFeePerGas': 2000000000,
        'maxPriorityFeePerGas': 1000000000,
        "chainId": 31337,
    }

    # 2. Sign tx with a private key
    signed = w3.eth.account.sign_transaction(transaction, acc0_pk)
    print(signed)

    # 3. Send the signed transaction
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    # tx = w3.eth.get_transaction(tx_hash)
    # print(tx)
    # assert tx["from"] == acc0
