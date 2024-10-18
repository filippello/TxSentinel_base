import os
import logging

import uvicorn
from dotenv import load_dotenv

load_dotenv(override=True)

logging.basicConfig(level=os.environ["LOGGING_LEVEL"])

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    uvicorn.run(
        "main:app", host="0.0.0.0", port=8080, workers=int(os.environ["WORKERS"])
    )
