from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
import time
from functools import lru_cache
import hashlib
import json
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
import logging.handlers
import os
from datetime import datetime

# Configure logging
log_directory = "logs"
if not os.path.exists(log_directory):
    os.makedirs(log_directory)

# Main application logger
logger = logging.getLogger("translator_api")
logger.setLevel(logging.INFO)

# Create handlers
main_handler = logging.handlers.RotatingFileHandler(
    os.path.join(log_directory, "translator.log"),
    maxBytes=10485760,  # 10MB
    backupCount=5
)
error_handler = logging.handlers.RotatingFileHandler(
    os.path.join(log_directory, "error.log"),
    maxBytes=10485760,
    backupCount=5
)
performance_handler = logging.handlers.RotatingFileHandler(
    os.path.join(log_directory, "performance.log"),
    maxBytes=10485760,
    backupCount=5
)

# Create formatters
main_formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
json_formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Set formatters
main_handler.setFormatter(main_formatter)
error_handler.setFormatter(json_formatter)
performance_handler.setFormatter(json_formatter)

# Set levels
main_handler.setLevel(logging.INFO)
error_handler.setLevel(logging.ERROR)
performance_handler.setLevel(logging.INFO)

# Add handlers
logger.addHandler(main_handler)
logger.addHandler(error_handler)
logger.addHandler(performance_handler)

class MarketMetrics(BaseModel):
    price: float
    volume_24h: float
    price_change_24h: float
    market_cap: float
    timestamp: float

class SimulationParameters(BaseModel):
    infection_rate: float
    mutation_rate: float
    transmission_speed: float
    cure_progress: float

class Translator:
    def __init__(self):
        self.cache_size = 1000
        self.translate = lru_cache(maxsize=self.cache_size)(self._translate)
        self.executor = ThreadPoolExecutor(max_workers=4)
        self._cache_hits = 0
        self._cache_misses = 0
        self._total_requests = 0
        self.logger = logging.getLogger("translator_api.translator")

    def _get_cache_key(self, metrics: MarketMetrics) -> str:
        # Round values to reduce cache misses due to minor differences
        rounded_metrics = {
            "price": round(metrics.price, 2),
            "volume_24h": round(metrics.volume_24h, -8),
            "price_change_24h": round(metrics.price_change_24h, 2),
            "market_cap": round(metrics.market_cap, -8)
        }
        # Create a deterministic string representation
        metrics_str = json.dumps(rounded_metrics, sort_keys=True)
        # Generate a hash for the key
        return hashlib.md5(metrics_str.encode()).hexdigest()

    def _translate(self, metrics: MarketMetrics) -> SimulationParameters:
        start_time = time.perf_counter()
        request_id = hashlib.md5(str(time.time()).encode()).hexdigest()[:8]
        
        try:
            # Log incoming request
            self.logger.info(f"Request {request_id}: Starting translation", extra={
                "request_id": request_id,
                "metrics": metrics.dict(),
                "timestamp": datetime.utcnow().isoformat()
            })

            # Increment total requests counter
            self._total_requests += 1

            # Check cache
            cache_key = self._get_cache_key(metrics)
            if hasattr(self, '_param_cache') and cache_key in self._param_cache:
                self._cache_hits += 1
                result = self._param_cache[cache_key]
                
                # Log cache hit
                self.logger.info(f"Request {request_id}: Cache hit", extra={
                    "request_id": request_id,
                    "cache_key": cache_key,
                    "response_time_ms": (time.perf_counter() - start_time) * 1000
                })
                
                return result

            self._cache_misses += 1
            self.logger.info(f"Request {request_id}: Cache miss", extra={
                "request_id": request_id,
                "cache_key": cache_key
            })

            # Perform translation
            market_cap_factor = min(0.4, max(0.1, 
                (metrics.market_cap / 10_000_000_000) * 0.3))
            
            price_momentum = metrics.price_change_24h / 100.0
            infection_rate = min(0.8, max(0.1,
                market_cap_factor + (abs(price_momentum) * 0.4)))
            
            volume_factor = min(0.15, max(0.01,
                (metrics.volume_24h / 5_000_000_000) * 0.1))
            
            volatility_factor = abs(metrics.price_change_24h) / 100.0
            mutation_rate = min(0.2, max(0.01,
                volume_factor + (volatility_factor * 0.1)))
            
            base_speed = metrics.volume_24h / 2_000_000_000
            cap_modifier = min(0.5, metrics.market_cap / 20_000_000_000)
            transmission_speed = min(2.0, max(0.5,
                base_speed + cap_modifier))
            
            base_cure_rate = 0.05
            price_effect = -metrics.price_change_24h / 100.0
            cure_progress = min(0.3, max(0.0,
                base_cure_rate + (price_effect * 0.2 if price_effect > 0 else 0)))

            result = SimulationParameters(
                infection_rate=infection_rate,
                mutation_rate=mutation_rate,
                transmission_speed=transmission_speed,
                cure_progress=cure_progress
            )

            # Cache the result
            if not hasattr(self, '_param_cache'):
                self._param_cache = {}
            self._param_cache[cache_key] = result

            # Log successful translation
            self.logger.info(f"Request {request_id}: Translation completed", extra={
                "request_id": request_id,
                "input_metrics": metrics.dict(),
                "output_parameters": result.dict(),
                "response_time_ms": (time.perf_counter() - start_time) * 1000,
                "cache_key": cache_key
            })

            return result

        except Exception as e:
            # Log error
            self.logger.error(f"Request {request_id}: Translation error", extra={
                "request_id": request_id,
                "error": str(e),
                "metrics": metrics.dict(),
                "response_time_ms": (time.perf_counter() - start_time) * 1000
            })
            raise

    async def translate_parameters(self, metrics: MarketMetrics) -> SimulationParameters:
        # Use ThreadPoolExecutor for CPU-bound translation
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, self._translate, metrics)

    def get_cache_stats(self) -> Dict:
        return {
            "total_requests": self._total_requests,
            "cache_hits": self._cache_hits,
            "cache_misses": self._cache_misses,
            "hit_rate": self._cache_hits / self._total_requests if self._total_requests > 0 else 0
        }

app = FastAPI(
    title="SolFlu Translator API",
    description="Translates crypto market metrics into virus simulation parameters",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

translator = Translator()

@app.post("/translate")
async def translate_metrics(metrics: MarketMetrics) -> SimulationParameters:
    request_id = hashlib.md5(str(time.time()).encode()).hexdigest()[:8]
    start_time = time.perf_counter()
    
    try:
        logger.info(f"Request {request_id}: Received translation request", extra={
            "request_id": request_id,
            "endpoint": "/translate",
            "method": "POST",
            "metrics": metrics.dict()
        })
        
        result = await translator.translate_parameters(metrics)
        
        logger.info(f"Request {request_id}: Request completed", extra={
            "request_id": request_id,
            "response_time_ms": (time.perf_counter() - start_time) * 1000,
            "status": "success"
        })
        
        return result
    except Exception as e:
        logger.error(f"Request {request_id}: Request failed", extra={
            "request_id": request_id,
            "error": str(e),
            "response_time_ms": (time.perf_counter() - start_time) * 1000,
            "status": "error"
        })
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint with cache stats."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "cache_stats": translator.get_cache_stats()
    }

@app.get("/metrics")
async def get_metrics():
    """Get API metrics including cache performance."""
    return {
        "cache_stats": translator.get_cache_stats(),
        "uptime": time.time()
    } 