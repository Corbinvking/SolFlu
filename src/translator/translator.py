import aiohttp
import asyncio
from typing import Dict, Any
import logging
import time
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class MarketMetrics:
    price: float
    volume_24h: float
    price_change_24h: float
    market_cap: float
    timestamp: float

@dataclass
class SimulationParameters:
    infection_rate: float    # Based on price momentum
    mutation_rate: float     # Based on volatility
    transmission_speed: float  # Based on volume
    cure_progress: float     # Based on inverse price growth

class TranslatorCache:
    def __init__(self, ttl_seconds: int = 60):
        self.cache = {}
        self.ttl = ttl_seconds
    
    def get(self, key: str) -> Any:
        if key in self.cache:
            value, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return value
            del self.cache[key]
        return None
    
    def set(self, key: str, value: Any):
        self.cache[key] = (value, time.time())

class Translator:
    def __init__(self):
        self.api_urls = {
            "coingecko": "https://api.coingecko.com/api/v3",
            "binance": "https://api.binance.com/api/v3"
        }
        self.cache = TranslatorCache()
        self.last_api_call = 0
        self.rate_limit_delay = 1.0  # Minimum seconds between API calls

    async def get_market_data(self, symbol: str = "SOL") -> MarketMetrics:
        """Fetch market data from multiple sources with rate limiting."""
        try:
            # Check cache first
            cached_data = self.cache.get(f"market_data_{symbol}")
            if cached_data:
                return cached_data

            # Rate limiting
            current_time = time.time()
            time_since_last_call = current_time - self.last_api_call
            if time_since_last_call < self.rate_limit_delay:
                await asyncio.sleep(self.rate_limit_delay - time_since_last_call)

            async with aiohttp.ClientSession() as session:
                # CoinGecko API call
                coingecko_url = f"{self.api_urls['coingecko']}/simple/price"
                params = {
                    "ids": "solana",
                    "vs_currencies": "usd",
                    "include_24hr_vol": "true",
                    "include_24hr_change": "true",
                    "include_market_cap": "true"
                }
                
                async with session.get(coingecko_url, params=params) as response:
                    if response.status == 429:  # Rate limit hit
                        logger.warning("Rate limit reached, implementing backoff")
                        await asyncio.sleep(60)
                        return await self.get_market_data(symbol)
                    
                    data = await response.json()
                    
                    metrics = MarketMetrics(
                        price=data['solana']['usd'],
                        volume_24h=data['solana']['usd_24h_vol'],
                        price_change_24h=data['solana']['usd_24h_change'],
                        market_cap=data['solana']['usd_market_cap'],
                        timestamp=time.time()
                    )
                    
                    # Cache the results
                    self.cache.set(f"market_data_{symbol}", metrics)
                    self.last_api_call = time.time()
                    
                    return metrics

        except Exception as e:
            logger.error(f"Error fetching market data: {str(e)}")
            raise

    def translate_parameters(self, metrics: MarketMetrics) -> SimulationParameters:
        """Convert market metrics to simulation parameters using sophisticated mapping rules.
        
        Rules:
        1. Infection Rate: 
           - Driven by price momentum and market cap
           - Higher market cap = more resources for virus = higher base rate
           - Positive price change = faster spread
        
        2. Mutation Rate:
           - Driven by volume and volatility
           - Higher volume = more interactions = higher mutation chance
           - Higher volatility = more aggressive mutations
        
        3. Transmission Speed:
           - Primarily volume-based
           - Market cap influences base transmission capability
        
        4. Cure Progress:
           - Inverse relationship with price
           - Accelerates when price drops
           - Slows when price rises
        """
        try:
            # Base infection rate influenced by market cap (0.1 to 0.4)
            market_cap_factor = min(0.4, max(0.1, 
                (metrics.market_cap / 10_000_000_000) * 0.3))
            
            # Price momentum affects infection spread
            price_momentum = metrics.price_change_24h / 100.0
            infection_rate = min(0.8, max(0.1,
                market_cap_factor + (abs(price_momentum) * 0.4)))
            
            # Volume affects mutation probability (0.01 to 0.15)
            volume_factor = min(0.15, max(0.01,
                (metrics.volume_24h / 5_000_000_000) * 0.1))
            
            # Volatility influences mutation aggressiveness
            volatility_factor = abs(metrics.price_change_24h) / 100.0
            mutation_rate = min(0.2, max(0.01,
                volume_factor + (volatility_factor * 0.1)))
            
            # Transmission speed based on volume and market cap
            base_speed = metrics.volume_24h / 2_000_000_000
            cap_modifier = min(0.5, metrics.market_cap / 20_000_000_000)
            transmission_speed = min(2.0, max(0.5,
                base_speed + cap_modifier))
            
            # Cure progress inversely related to price change
            # Accelerates in bear markets, slows in bull markets
            base_cure_rate = 0.05  # Base rate of cure progress
            price_effect = -metrics.price_change_24h / 100.0
            cure_progress = min(0.3, max(0.0,
                base_cure_rate + (price_effect * 0.2 if price_effect > 0 else 0)))

            return SimulationParameters(
                infection_rate=infection_rate,
                mutation_rate=mutation_rate,
                transmission_speed=transmission_speed,
                cure_progress=cure_progress
            )

        except Exception as e:
            logger.error(f"Error translating parameters: {str(e)}")
            raise

    async def get_simulation_parameters(self, symbol: str = "SOL") -> Dict[str, float]:
        """Main method to get current simulation parameters."""
        try:
            metrics = await self.get_market_data(symbol)
            params = self.translate_parameters(metrics)
            
            return {
                "infection_rate": params.infection_rate,
                "mutation_rate": params.mutation_rate,
                "transmission_speed": params.transmission_speed,
                "cure_progress": params.cure_progress
            }

        except Exception as e:
            logger.error(f"Error getting simulation parameters: {str(e)}")
            raise 