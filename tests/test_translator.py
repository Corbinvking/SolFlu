import pytest
import asyncio
from src.translator.translator import Translator, MarketMetrics, SimulationParameters
from unittest.mock import patch, MagicMock
import time

@pytest.fixture
def translator():
    return Translator()

@pytest.fixture
def sample_market_data():
    return MarketMetrics(
        price=100.0,
        volume_24h=1_000_000_000,
        price_change_24h=5.0,
        market_cap=10_000_000_000,
        timestamp=time.time()
    )

def test_translator_initialization(translator):
    """Test translator initialization."""
    assert translator.api_urls["coingecko"] == "https://api.coingecko.com/api/v3"
    assert translator.api_urls["binance"] == "https://api.binance.com/api/v3"
    assert translator.cache is not None

@pytest.mark.asyncio
async def test_market_data_fetching(translator):
    """Test market data fetching with mocked API response."""
    mock_response = {
        "solana": {
            "usd": 100.0,
            "usd_24h_vol": 1_000_000_000,
            "usd_24h_change": 5.0,
            "usd_market_cap": 10_000_000_000
        }
    }

    with patch("aiohttp.ClientSession.get") as mock_get:
        mock_get.return_value.__aenter__.return_value.status = 200
        mock_get.return_value.__aenter__.return_value.json = MagicMock(
            return_value=mock_response
        )

        metrics = await translator.get_market_data("SOL")
        
        assert metrics.price == 100.0
        assert metrics.volume_24h == 1_000_000_000
        assert metrics.price_change_24h == 5.0
        assert metrics.market_cap == 10_000_000_000

def test_parameter_translation(translator, sample_market_data):
    """Test market metrics to simulation parameters translation."""
    params = translator.translate_parameters(sample_market_data)
    
    assert isinstance(params, SimulationParameters)
    assert 0.0 <= params.infection_rate <= 0.5
    assert 0.01 <= params.mutation_rate <= 0.1
    assert 0.5 <= params.transmission_speed <= 1.5
    assert 0.0 <= params.cure_progress <= 0.2

@pytest.mark.asyncio
async def test_cache_functionality(translator):
    """Test caching mechanism."""
    mock_response = {
        "solana": {
            "usd": 100.0,
            "usd_24h_vol": 1_000_000_000,
            "usd_24h_change": 5.0,
            "usd_market_cap": 10_000_000_000
        }
    }

    with patch("aiohttp.ClientSession.get") as mock_get:
        mock_get.return_value.__aenter__.return_value.status = 200
        mock_get.return_value.__aenter__.return_value.json = MagicMock(
            return_value=mock_response
        )

        # First call should hit the API
        metrics1 = await translator.get_market_data("SOL")
        
        # Second call should use cache
        metrics2 = await translator.get_market_data("SOL")
        
        assert mock_get.call_count == 1
        assert metrics1.price == metrics2.price

@pytest.mark.asyncio
async def test_rate_limiting(translator):
    """Test rate limiting functionality."""
    mock_response = {
        "solana": {
            "usd": 100.0,
            "usd_24h_vol": 1_000_000_000,
            "usd_24h_change": 5.0,
            "usd_market_cap": 10_000_000_000
        }
    }

    with patch("aiohttp.ClientSession.get") as mock_get:
        mock_get.return_value.__aenter__.return_value.status = 200
        mock_get.return_value.__aenter__.return_value.json = MagicMock(
            return_value=mock_response
        )

        start_time = time.time()
        
        # Make multiple rapid requests
        await asyncio.gather(
            translator.get_market_data("SOL"),
            translator.get_market_data("SOL"),
            translator.get_market_data("SOL")
        )
        
        end_time = time.time()
        
        # Should take at least 2 seconds due to rate limiting
        assert end_time - start_time >= 2.0

@pytest.mark.asyncio
async def test_error_handling(translator):
    """Test error handling in API calls."""
    with patch("aiohttp.ClientSession.get") as mock_get:
        mock_get.return_value.__aenter__.return_value.status = 429
        mock_get.return_value.__aenter__.return_value.json = MagicMock(
            side_effect=Exception("API Error")
        )

        with pytest.raises(Exception):
            await translator.get_market_data("SOL")

def test_parameter_bounds(translator):
    """Test parameter bounds with extreme market conditions."""
    extreme_market_data = MarketMetrics(
        price=1000.0,
        volume_24h=10_000_000_000,  # Very high volume
        price_change_24h=50.0,      # Extreme price change
        market_cap=100_000_000_000,
        timestamp=time.time()
    )
    
    params = translator.translate_parameters(extreme_market_data)
    
    # Check that parameters are clamped to their bounds
    assert params.infection_rate <= 0.5
    assert params.mutation_rate <= 0.1
    assert params.transmission_speed <= 1.5
    assert params.cure_progress <= 0.2 