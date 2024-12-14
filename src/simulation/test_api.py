import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
import json
import asyncio
from datetime import datetime
from .api import app, SimulationService
from .transmission import RouteType

@pytest.fixture
def test_client():
    return TestClient(app)

@pytest.fixture
def mock_translator():
    async def mock_get_parameters():
        return {
            "infection_rate": 1.0,
            "recovery_rate": 0.1,
            "transmission_intensity": 1.0
        }
    
    with patch("simulation.api.translator_client") as mock:
        mock.get_parameters = AsyncMock(side_effect=mock_get_parameters)
        yield mock

@pytest.fixture
def sample_country_data():
    return {
        "population": 1000000,
        "infected": 1000,
        "recovered": 0,
        "resistance": {
            "air": 0.5,
            "sea": 0.3,
            "land": 0.4
        }
    }

def test_get_simulation_state(test_client):
    """Test getting current simulation state."""
    response = test_client.get("/simulation/state")
    assert response.status_code == 200
    
    data = response.json()
    assert "countries" in data
    assert "global_stats" in data
    assert "mutation_state" in data

def test_add_country(test_client, sample_country_data):
    """Test adding a country to the simulation."""
    response = test_client.post(
        "/simulation/country",
        params={"country_id": "test_country"},
        json=sample_country_data
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify country was added
    state = test_client.get("/simulation/state").json()
    assert "test_country" in state["countries"]

def test_add_route(test_client, sample_country_data):
    """Test adding a transmission route."""
    # Add countries first
    test_client.post(
        "/simulation/country",
        params={"country_id": "country1"},
        json=sample_country_data
    )
    test_client.post(
        "/simulation/country",
        params={"country_id": "country2"},
        json=sample_country_data
    )
    
    # Add route
    response = test_client.post(
        "/simulation/route",
        params={
            "source": "country1",
            "target": "country2",
            "route_type": RouteType.AIR.value
        }
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_simulation_control(test_client):
    """Test simulation control endpoints."""
    # Start simulation
    response = test_client.post(
        "/simulation/control",
        params={"command": "start"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Stop simulation
    response = test_client.post(
        "/simulation/control",
        params={"command": "stop"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Invalid command
    response = test_client.post(
        "/simulation/control",
        params={"command": "invalid"}
    )
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_websocket(test_client):
    """Test WebSocket connection and updates."""
    with test_client.websocket_connect("/ws") as websocket:
        # Add a country to trigger state update
        test_client.post(
            "/simulation/country",
            params={"country_id": "ws_test"},
            json={
                "population": 1000000,
                "infected": 1000,
                "recovered": 0
            }
        )
        
        # Wait for update
        data = websocket.receive_json()
        assert data["type"] == "state_update"
        assert "data" in data
        assert "timestamp" in data

def test_get_state_diff(test_client, sample_country_data):
    """Test getting state differences."""
    # Add initial country
    test_client.post(
        "/simulation/country",
        params={"country_id": "diff_test1"},
        json=sample_country_data
    )
    
    # Get initial diff (should be empty)
    response = test_client.get("/simulation/diff")
    assert response.status_code == 200
    initial_diff = response.json()
    assert not initial_diff  # Should be empty
    
    # Add another country
    test_client.post(
        "/simulation/country",
        params={"country_id": "diff_test2"},
        json=sample_country_data
    )
    
    # Get diff after change
    response = test_client.get("/simulation/diff")
    assert response.status_code == 200
    diff = response.json()
    assert "countries" in diff
    assert "diff_test2" in diff["countries"]
    assert diff["countries"]["diff_test2"]["status"] == "new"

@pytest.mark.asyncio
async def test_update_loop(mock_translator):
    """Test simulation update loop."""
    service = SimulationService()
    
    # Start simulation
    await service.start_simulation()
    
    # Wait for a few updates
    await asyncio.sleep(2.0)
    
    # Verify updates occurred
    assert service.last_update is not None
    assert isinstance(service.last_update, datetime)
    
    # Stop simulation
    await service.stop_simulation()

def test_api_performance(test_client, sample_country_data):
    """Test API endpoint performance."""
    # Add multiple countries
    for i in range(100):
        test_client.post(
            "/simulation/country",
            params={"country_id": f"perf_test_{i}"},
            json=sample_country_data
        )
    
    # Measure state endpoint performance
    import time
    start_time = time.time()
    response = test_client.get("/simulation/state")
    end_time = time.time()
    
    assert response.status_code == 200
    assert (end_time - start_time) < 0.1  # Response time < 100ms 