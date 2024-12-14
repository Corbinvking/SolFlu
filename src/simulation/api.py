from fastapi import FastAPI, WebSocket, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List, Optional
import asyncio
import json
import logging
from datetime import datetime
from .sir_model import SIRModel
from .transmission import RouteType
from .cache import StateCache
from .translator_client import TranslatorClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SolFlu Simulation API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
simulation = SIRModel()
state_cache = StateCache()
translator_client = TranslatorClient()
active_websockets: List[WebSocket] = []

class SimulationService:
    def __init__(self):
        self.simulation = simulation
        self.cache = state_cache
        self.translator = translator_client
        self.update_interval = 1.0  # seconds
        self.is_running = False
        self.last_update = None
        self.batch_size = 10  # Number of updates to batch before broadcasting

    async def start_simulation(self):
        """Start the simulation update loop."""
        if self.is_running:
            return
        
        self.is_running = True
        await self.translator.connect()
        asyncio.create_task(self._update_loop())

    async def stop_simulation(self):
        """Stop the simulation update loop."""
        self.is_running = False
        await self.translator.close()

    async def _update_loop(self):
        """Main simulation update loop."""
        update_count = 0
        batch_start_time = datetime.now()
        
        while self.is_running:
            try:
                # Get parameters from translator API
                parameters = await self.translator.get_parameters()
                
                # Update simulation
                self.simulation.update(parameters)
                update_count += 1
                
                # Cache new state
                new_state = self.simulation.get_state()
                self.cache.update(new_state)
                
                # Broadcast state if batch is complete or significant changes
                if (update_count >= self.batch_size or 
                    self._has_significant_changes(self.cache.get_diff())):
                    await self._broadcast_state(new_state)
                    update_count = 0
                    batch_start_time = datetime.now()
                
                self.last_update = datetime.now()
                
                # Calculate time to sleep
                elapsed = (datetime.now() - batch_start_time).total_seconds()
                sleep_time = max(0, self.update_interval - elapsed)
                
            except Exception as e:
                logger.error(f"Error in simulation update loop: {e}")
                sleep_time = self.update_interval
            
            await asyncio.sleep(sleep_time)

    def _has_significant_changes(self, diff: Optional[Dict[str, Any]]) -> bool:
        """Check if state changes are significant enough to broadcast."""
        if not diff:
            return False
            
        # Check for mutation changes
        if "mutation_state" in diff and "strain" in diff["mutation_state"]:
            return True
            
        # Check for significant global stat changes
        if "global_stats" in diff:
            infection_change = diff["global_stats"].get("infection_rate", {})
            if infection_change:
                old = infection_change.get("old", 0)
                new = infection_change.get("new", 0)
                if abs(new - old) > 0.1:  # 10% change threshold
                    return True
        
        # Check for country changes
        if "countries" in diff:
            changed_countries = sum(1 for c in diff["countries"].values() 
                                 if c.get("status") in ["new", "removed"])
            if changed_countries > 0:
                return True
        
        return False

    async def _broadcast_state(self, state: Dict[str, Any]):
        """Broadcast state to all connected websocket clients."""
        message = json.dumps({
            "type": "state_update",
            "data": state,
            "timestamp": datetime.now().isoformat()
        })
        
        for websocket in active_websockets[:]:  # Copy list to allow modification
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to websocket: {e}")
                active_websockets.remove(websocket)

# Dependency
def get_simulation_service():
    return SimulationService()

@app.on_event("startup")
async def startup_event():
    """Initialize the simulation on startup."""
    service = SimulationService()
    await service.start_simulation()

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    service = SimulationService()
    await service.stop_simulation()

@app.get("/simulation/state")
async def get_simulation_state(
    service: SimulationService = Depends(get_simulation_service)
) -> Dict[str, Any]:
    """Get current simulation state."""
    cached_state = service.cache.get()
    if cached_state:
        return cached_state
    
    return service.simulation.get_state()

@app.get("/simulation/diff")
async def get_state_diff(
    service: SimulationService = Depends(get_simulation_service)
) -> Dict[str, Any]:
    """Get state changes since last update."""
    diff = service.cache.get_diff()
    if not diff:
        return {}
    return diff

@app.post("/simulation/country")
async def add_country(
    country_id: str,
    data: Dict[str, Any],
    service: SimulationService = Depends(get_simulation_service)
) -> Dict[str, Any]:
    """Add a new country to the simulation."""
    try:
        service.simulation.add_country(country_id, data)
        return {"status": "success", "message": f"Added country {country_id}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/simulation/route")
async def add_route(
    source: str,
    target: str,
    route_type: RouteType,
    service: SimulationService = Depends(get_simulation_service)
) -> Dict[str, Any]:
    """Add a new transmission route."""
    try:
        service.simulation.add_route(source, target, route_type)
        return {
            "status": "success",
            "message": f"Added {route_type.value} route: {source} -> {target}"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/simulation/control")
async def control_simulation(
    command: str,
    service: SimulationService = Depends(get_simulation_service)
) -> Dict[str, Any]:
    """Control simulation execution."""
    if command == "start":
        await service.start_simulation()
        return {"status": "success", "message": "Simulation started"}
    elif command == "stop":
        await service.stop_simulation()
        return {"status": "success", "message": "Simulation stopped"}
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown command: {command}. Valid commands: start, stop"
        )

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await websocket.accept()
    active_websockets.append(websocket)
    
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            data = await websocket.receive_text()
            # Process any incoming messages if needed
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        active_websockets.remove(websocket) 