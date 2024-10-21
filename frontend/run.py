import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.mount("/", StaticFiles(directory="./dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(
        app, host="0.0.0.0", port=5173, workers=1
    )
