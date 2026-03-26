import json
from fastapi import WebSocket

ws_connections: set[WebSocket] = set()


async def broadcast_ws(data: dict):
    """Broadcast a message to all connected WebSocket clients."""
    message = json.dumps(data)
    disconnected = set()
    for ws in ws_connections:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.add(ws)
    ws_connections -= disconnected
