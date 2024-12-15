import logging
from datetime import datetime
from functools import lru_cache
from translator.models import MarketMetrics, SimulationParameters

logger = logging.getLogger("translator")

class Translator:
    def __init__(self):
        self.cache_size = 1000
        self.translate = lru_cache(maxsize=self.cache_size)(self._translate)
        self._cache_hits = 0
        self._cache_misses = 0
        self._total_requests = 0

    def _translate(self, metrics: MarketMetrics) -> SimulationParameters:
        # Translation logic
        market_cap_factor = min(0.4, max(0.1, (metrics.market_cap / 10_000_000_000) * 0.3))
        price_momentum = metrics.price_change_24h / 100.0
        infection_rate = min(0.8, max(0.1, market_cap_factor + (abs(price_momentum) * 0.4)))
        
        volume_factor = min(0.15, max(0.01, (metrics.volume_24h / 5_000_000_000) * 0.1))
        volatility_factor = abs(metrics.price_change_24h) / 100.0
        mutation_rate = min(0.2, max(0.01, volume_factor + (volatility_factor * 0.1)))
        
        base_speed = metrics.volume_24h / 2_000_000_000
        cap_modifier = min(0.5, metrics.market_cap / 20_000_000_000)
        transmission_speed = min(2.0, max(0.5, base_speed + cap_modifier))
        
        base_cure_rate = 0.05
        price_effect = -metrics.price_change_24h / 100.0
        cure_progress = min(0.3, max(0.0, base_cure_rate + (price_effect * 0.2 if price_effect > 0 else 0)))

        return SimulationParameters(
            infection_rate=infection_rate,
            mutation_rate=mutation_rate,
            transmission_speed=transmission_speed,
            cure_progress=cure_progress
        )

    async def get_simulation_parameters(self, metrics: MarketMetrics) -> SimulationParameters:
        """Get simulation parameters from market metrics."""
        try:
            self._total_requests += 1
            result = self.translate(metrics)
            return result
        except Exception as e:
            logger.error(f"Error translating market metrics: {str(e)}")
            raise

    def get_cache_stats(self) -> dict:
        """Get cache statistics."""
        return {
            "total_requests": self._total_requests,
            "cache_hits": self._cache_hits,
            "cache_misses": self._cache_misses,
            "hit_rate": self._cache_hits / self._total_requests if self._total_requests > 0 else 0
        } 