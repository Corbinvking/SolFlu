import pytest
from fastapi.testclient import TestClient
from src.translator.api import app
from src.translator.models import MarketMetrics, SimulationParameters

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "cache_stats" in data

def test_translate_metrics():
    market_data = {
        "price": 100.0,
        "volume_24h": 1000000.0,
        "price_change_24h": 5.0,
        "market_cap": 10000000.0,
        "source": "test",
        "reliability": 0.9
    }
    
    response = client.post("/translate", json=market_data)
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data["infection_rate"], float)
    assert isinstance(data["mutation_rate"], float)
    assert isinstance(data["transmission_speed"], float)
    assert isinstance(data["cure_progress"], float)

def test_metrics_endpoint():
    response = client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "cache_stats" in data
    assert "uptime" in data 