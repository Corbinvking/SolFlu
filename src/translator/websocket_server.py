import asyncio
import logging
import json
from fastapi import FastAPI, WebSocket
from datetime import datetime, timedelta

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("translator_api")

# Initialize FastAPI app
app = FastAPI()

# Store active connections
active_connections = []

@app.on_event("startup")
async def startup_event():
    logger.info("Starting WebSocket server...")
    asyncio.create_task(cleanup_task())

@app.get("/")
async def root():
    return {"message": "WebSocket server is running"}

@app.websocket("/translator")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint handler."""
    try:
        logger.info("New WebSocket connection request received")
        await websocket.accept()
        logger.info("WebSocket connection accepted")
        
        websocket.last_activity = datetime.now()
        active_connections.append(websocket)
        logger.info(f"Client connected. Total connections: {len(active_connections)}")
        
        while True:
            try:
                data = await websocket.receive_text()
                websocket.last_activity = datetime.now()
                logger.debug(f"Received data: {data}")
                
                # Process the message and send response
                try:
                    message = json.loads(data)
                    logger.debug(f"Parsed message: {message}")
                    
                    if message.get("type") == "heartbeat":
                        response = {
                            "type": "heartbeat",
                            "timestamp": datetime.now().isoformat()
                        }
                        logger.debug("Sending heartbeat response")
                    elif message.get("type") == "marketUpdate":
                        logger.info("Processing market update message")
                        response = await process_market_update(message.get("data", {}))
                    else:
                        logger.warning(f"Unknown message type: {message.get('type')}")
                        response = {
                            "type": message.get("type", "unknown"),
                            "timestamp": datetime.now().isoformat(),
                            "data": message.get("data", {})
                        }
                    
                    logger.debug(f"Sending response: {json.dumps(response, indent=2)}")
                    await websocket.send_json(response)
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON received: {str(e)}")
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid JSON format",
                        "timestamp": datetime.now().isoformat(),
                        "details": str(e)
                    })
                
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                break
                
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
            logger.info(f"Client disconnected. Total connections: {len(active_connections)}")
        try:
            await websocket.close(code=1000)
        except Exception as e:
            logger.error(f"Error closing WebSocket: {e}")

async def cleanup_task():
    """Background task to clean up stale connections."""
    while True:
        try:
            current_time = datetime.now()
            stale_connections = []
            
            for connection in active_connections:
                if hasattr(connection, 'last_activity'):
                    if current_time - connection.last_activity > timedelta(seconds=60):
                        stale_connections.append(connection)
            
            for connection in stale_connections:
                try:
                    await connection.close(code=1000)
                    if connection in active_connections:
                        active_connections.remove(connection)
                        logger.info(f"Cleaned up stale connection. Total connections: {len(active_connections)}")
                except Exception as e:
                    logger.error(f"Error cleaning up stale connection: {e}")
            
            await asyncio.sleep(30)  # Run cleanup every 30 seconds
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}")
            await asyncio.sleep(30)  # Keep running even if there's an error

async def process_market_update(data):
    """Process market update data and return simulation parameters."""
    try:
        market_metrics = data.get("marketMetrics", {})
        logger.info(f"Processing market update: {json.dumps(market_metrics, indent=2)}")
        
        # Validate required fields
        required_fields = ["price", "volume", "marketCap", "volatility"]
        for field in required_fields:
            if field not in market_metrics:
                raise ValueError(f"Missing required field: {field}")
        
        # Process the data and generate response
        response = {
            "type": "marketUpdate",
            "timestamp": datetime.now().isoformat(),
            "data": {
                "marketMetrics": market_metrics,
                "simulationParameters": {
                    "infectionRate": calculate_infection_rate(market_metrics),
                    "spreadDistance": calculate_spread_distance(market_metrics),
                    "volatilityFactor": market_metrics["volatility"]
                }
            }
        }
        
        logger.info(f"Generated response: {json.dumps(response, indent=2)}")
        return response
    except Exception as e:
        logger.error(f"Error processing market update: {e}")
        return {
            "type": "error",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

def calculate_infection_rate(metrics):
    """Calculate infection rate based on market metrics."""
    base_rate = 0.1
    market_factor = min(1.0, metrics["marketCap"] / 1000000)
    volatility_factor = 1 + metrics["volatility"]
    return base_rate * market_factor * volatility_factor

def calculate_spread_distance(metrics):
    """Calculate spread distance based on market metrics."""
    base_distance = 1.0
    volume_factor = min(1.0, metrics["volume"] / 1000000)
    return base_distance * (1 + volume_factor)