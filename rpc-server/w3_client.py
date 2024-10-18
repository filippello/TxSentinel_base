import os

from web3 import Web3

w3c = Web3(Web3.HTTPProvider(os.environ["HTTP_WEB3_PROVIDER"]))
