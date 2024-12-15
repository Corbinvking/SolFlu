from pydantic import BaseModel
from typing import Optional

class MarketMetrics(BaseModel):
    price: float
    volume_24h: float
    price_change_24h: float
    market_cap: float
    source: Optional[str] = None
    reliability: Optional[float] = None

class SimulationParameters(BaseModel):
    infection_rate: float
    mutation_rate: float
    transmission_speed: float
    cure_progress: float 