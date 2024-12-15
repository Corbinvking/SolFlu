import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket
import json
import asyncio
from datetime import datetime, timedelta
from websocket_server import ConnectionManager, websocket_endpoint
from api import app

class MockWebSocket:
    def __init__(self):
        self.sent_messages = []
        self.closed = False
        self.close_code = None
        self.close_reason = None

    async def accept(self):
        pass

    async def send_json(self, data):
        self.sent_messages.append(data)

    async def receive_json(self):
        return {"type": "heartbeat", "timestamp": datetime.now().timestamp()}

    async def close(self, code=1000, reason=None):
        self.closed = True
        self.close_code = code
        self.close_reason = reason

@pytest.fixture
def connection_manager():
    return ConnectionManager()

@pytest.mark.asyncio
async def test_connection_manager_connect():
    manager = ConnectionManager()
    websocket = MockWebSocket()
    
    await manager.connect(websocket)
    assert websocket in manager.active_connections
    assert websocket in manager.last_heartbeat
    assert len(manager.active_connections) == 1

@pytest.mark.asyncio
async def test_connection_manager_disconnect():
    manager = ConnectionManager()
    websocket = MockWebSocket()
    
    await manager.connect(websocket)
    manager.disconnect(websocket)
    
    assert websocket not in manager.active_connections
    assert websocket not in manager.last_heartbeat
    assert len(manager.active_connections) == 0

@pytest.mark.asyncio
async def test_handle_heartbeat():
    manager = ConnectionManager()
    websocket = MockWebSocket()
    
    await manager.connect(websocket)
    await manager.handle_heartbeat(websocket, {
        "type": "heartbeat",
        "timestamp": datetime.now().timestamp()
    })
    
    assert len(websocket.sent_messages) == 1
    assert websocket.sent_messages[0]["type"] == "heartbeat_ack"

@pytest.mark.asyncio
async def test_handle_market_update():
    manager = ConnectionManager()
    
    market_data = {
        "price": 100.0,
        "volume_24h": 1000000.0,
        "price_change_24h": 5.0,
        "market_cap": 10000000.0
    }
    
    response = await manager.handle_market_update(market_data)
    
    assert response is not None
    assert response["type"] == "simulation_parameters"
    assert "data" in response
    assert "timestamp" in response

@pytest.mark.asyncio
async def test_cleanup_stale_connections():
    manager = ConnectionManager()
    websocket = MockWebSocket()
    
    await manager.connect(websocket)
    
    # Set last heartbeat to more than 60 seconds ago
    manager.last_heartbeat[websocket] = (
        datetime.now() - timedelta(seconds=61)
    ).timestamp()
    
    await manager.cleanup_stale_connections()
    
    assert websocket not in manager.active_connections
    assert websocket not in manager.last_heartbeat
    assert websocket.closed
    assert websocket.close_code == 1000

@pytest.mark.asyncio
async def test_broadcast():
    manager = ConnectionManager()
    websocket1 = MockWebSocket()
    websocket2 = MockWebSocket()
    
    await manager.connect(websocket1)
    await manager.connect(websocket2)
    
    test_message = {
        "type": "test",
        "data": "test_data"
    }
    
    await manager.broadcast(test_message)
    
    assert len(websocket1.sent_messages) == 1
    assert len(websocket2.sent_messages) == 1
    assert websocket1.sent_messages[0] == test_message
    assert websocket2.sent_messages[0] == test_message

@pytest.mark.asyncio
async def test_websocket_endpoint():
    websocket = MockWebSocket()
    
    # Mock receive_json to return a sequence of messages
    messages = [
        {"type": "heartbeat", "timestamp": datetime.now().timestamp()},
        {"type": "market_update", "data": {
            "price": 100.0,
            "volume_24h": 1000000.0,
            "price_change_24h": 5.0,
            "market_cap": 10000000.0
        }},
        {"type": "unknown", "data": {}}
    ]
    
    message_iterator = iter(messages)
    
    async def mock_receive_json():
        try:
            return next(message_iterator)
        except StopIteration:
            raise WebSocketDisconnect()
    
    websocket.receive_json = mock_receive_json
    
    await websocket_endpoint(websocket)
    
    # Check that appropriate responses were sent
    assert len(websocket.sent_messages) >= 2
    assert any(msg["type"] == "heartbeat_ack" for msg in websocket.sent_messages)
    assert any(msg["type"] == "simulation_parameters" for msg in websocket.sent_messages)
    assert any(msg["type"] == "error" and "Unknown message type" in msg["error"] 
              for msg in websocket.sent_messages)

@pytest.mark.asyncio
async def test_invalid_json():
    websocket = MockWebSocket()
    
    async def mock_receive_json():
        raise json.JSONDecodeError("Invalid JSON", "", 0)
    
    websocket.receive_json = mock_receive_json
    
    await websocket_endpoint(websocket)
    
    assert len(websocket.sent_messages) == 1
    assert websocket.sent_messages[0]["type"] == "error"
    assert "Invalid JSON format" in websocket.sent_messages[0]["error"] 