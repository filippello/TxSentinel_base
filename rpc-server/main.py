from fastapi import FastAPI

from routers import rpc_router, agent_websocket, client_websocket

app = FastAPI()
app.include_router(rpc_router)
app.include_router(client_websocket, prefix="/client")
app.include_router(agent_websocket, prefix="/agent")
