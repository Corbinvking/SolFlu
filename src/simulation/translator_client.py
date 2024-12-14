from typing import Dict, Any, Optional
import aiohttp
import logging
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class TranslatorClient:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
        self.last_params: Optional[Dict[str, Any]] = None
        self.last_fetch: Optional[datetime] = None
        self.cache_ttl = 1.0  # seconds
        
    async def __aenter__(self):
        """Context manager entry."""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        await self.close()
    
    async def connect(self):
        """Create aiohttp session."""
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    async def close(self):
        """Close aiohttp session."""
        if self.session:
            await self.session.close()
            self.session = None
    
    def _is_cache_valid(self) -> bool:
        """Check if cached parameters are still valid."""
        if not self.last_fetch or not self.last_params:
            return False
        
        age = datetime.now() - self.last_fetch
        return age.total_seconds() < self.cache_ttl
    
    async def get_parameters(self) -> Dict[str, Any]:
        """Get simulation parameters from the translator API."""
        # Return cached parameters if still valid
        if self._is_cache_valid():
            return self.last_params
        
        if not self.session:
            await self.connect()
        
        try:
            # Fetch market data parameters
            async with self.session.get(f"{self.base_url}/market/parameters") as response:
                if response.status == 200:
                    market_data = await response.json()
                else:
                    logger.error(f"Failed to fetch market parameters: {response.status}")
                    return self._get_fallback_parameters()
            
            # Transform market data into simulation parameters
            parameters = await self._transform_parameters(market_data)
            
            # Cache the results
            self.last_params = parameters
            self.last_fetch = datetime.now()
            
            return parameters
            
        except aiohttp.ClientError as e:
            logger.error(f"Error fetching parameters from translator API: {e}")
            return self._get_fallback_parameters()
    
    async def _transform_parameters(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform market data into simulation parameters."""
        try:
            # Extract relevant metrics
            market_cap = market_data.get("market_cap", 0)
            volatility = market_data.get("volatility", 0)
            prev_market_cap = market_data.get("previous_market_cap", market_cap)
            
            # Calculate market cap change percentage
            market_cap_change = (market_cap - prev_market_cap) / prev_market_cap if prev_market_cap > 0 else 0
            
            # Calculate infection rate based on market cap change
            # Positive change increases spread, negative change depletes
            base_infection_rate = 1.0  # Base rate for stable market
            infection_rate = base_infection_rate * (1 + market_cap_change)
            
            # Ensure infection rate doesn't go negative
            infection_rate = max(0.1, infection_rate)
            
            # Use volatility as a speed multiplier
            # Normalize volatility to a reasonable range (0.5 - 2.0)
            speed_multiplier = 0.5 + (volatility / 100.0 * 1.5)  # Assuming volatility is in percentage
            speed_multiplier = max(0.5, min(2.0, speed_multiplier))
            
            # Recovery rate is constant as per new model
            recovery_rate = 0.1
            
            return {
                "infection_rate": infection_rate,
                "recovery_rate": recovery_rate,
                "speed_multiplier": speed_multiplier,
                "market_data": {
                    "market_cap": market_cap,
                    "market_cap_change": market_cap_change,
                    "volatility": volatility
                }
            }
            
        except Exception as e:
            logger.error(f"Error transforming parameters: {e}")
            return self._get_fallback_parameters()
    
    def _get_fallback_parameters(self) -> Dict[str, Any]:
        """Return fallback parameters when API call fails."""
        return {
            "infection_rate": 1.0,
            "recovery_rate": 0.1,
            "speed_multiplier": 1.0,
            "market_data": {
                "market_cap": 0,
                "market_cap_change": 0,
                "volatility": 0
            }
        } 