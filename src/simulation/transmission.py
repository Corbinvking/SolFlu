from enum import Enum
from typing import Dict, Any, List
import numpy as np
import logging

logger = logging.getLogger(__name__)

class RouteType(Enum):
    AIR = "air"
    SEA = "sea"
    LAND = "land"

class TransmissionRoute:
    def __init__(self, source: str, target: str, route_type: RouteType):
        self.source = source
        self.target = target
        self.route_type = route_type
        self.active = False
        self.intensity = 1.0  # Default intensity
        
        # Route points (in real implementation, these would be actual geo-coordinates)
        self.source_point = {"lat": 0, "lng": 0}
        self.target_point = {"lat": 0, "lng": 0}
        
        # Base transmission rates for different route types
        self._base_rates = {
            RouteType.AIR: 0.3,    # Fastest transmission
            RouteType.SEA: 0.1,    # Medium transmission
            RouteType.LAND: 0.2    # Moderate transmission
        }

    def set_points(self, source_point: Dict[str, float], target_point: Dict[str, float]) -> None:
        """Set the geographical points for route endpoints."""
        self.source_point = source_point
        self.target_point = target_point

    def activate(self) -> None:
        """Activate the route for transmission."""
        if not self.active:
            self.active = True
            logger.info(f"Route activated: {self.source} -> {self.target}")

    def deactivate(self) -> None:
        """Deactivate the route."""
        if self.active:
            self.active = False
            logger.info(f"Route deactivated: {self.source} -> {self.target}")

    def calculate_transmission(self, source_infected: float, 
                             target_susceptible: float,
                             resistance_factors: Dict[str, float]) -> float:
        """Calculate the number of new infections along this route."""
        if not self.active:
            return 0.0

        # Base transmission rate for route type
        base_rate = self._base_rates[self.route_type]
        
        # Apply resistance factors
        resistance = resistance_factors.get(self.route_type.value, 1.0)
        
        # Calculate transmission with intensity modifier and scaling factor
        transmission = (base_rate * self.intensity * source_infected * 
                       target_susceptible * (1 - resistance)) / 1000000  # Scale factor
        
        return max(0.0, transmission)

class TransmissionNetwork:
    def __init__(self):
        self.routes: List[TransmissionRoute] = []
        self._route_map: Dict[str, List[TransmissionRoute]] = {}

    def add_route(self, source: str, target: str, route_type: RouteType,
                 source_point: Dict[str, float] = None,
                 target_point: Dict[str, float] = None) -> None:
        """Add a new transmission route."""
        route = TransmissionRoute(source, target, route_type)
        
        # Set route points if provided
        if source_point and target_point:
            route.set_points(source_point, target_point)
        
        self.routes.append(route)
        
        # Update route map for quick lookups
        if source not in self._route_map:
            self._route_map[source] = []
        self._route_map[source].append(route)
        
        logger.info(f"Added {route_type.value} route: {source} -> {target}")

    def get_outbound_routes(self, country_id: str) -> List[TransmissionRoute]:
        """Get all outbound routes from a country."""
        return self._route_map.get(country_id, [])

    def get_active_routes(self) -> List[TransmissionRoute]:
        """Get all currently active routes."""
        return [route for route in self.routes if route.active]

    def activate_route(self, source: str, target: str) -> None:
        """Activate a specific route."""
        for route in self.get_outbound_routes(source):
            if route.target == target:
                route.activate()
                break

    def deactivate_route(self, source: str, target: str) -> None:
        """Deactivate a specific route."""
        for route in self.get_outbound_routes(source):
            if route.target == target:
                route.deactivate()
                break

    def get_route_points(self, source: str, target: str) -> tuple[Dict[str, float], Dict[str, float]]:
        """Get the geographical points for a route."""
        for route in self.get_outbound_routes(source):
            if route.target == target:
                return route.source_point, route.target_point
        return None, None

    def update_intensities(self, parameters: Dict[str, Any]) -> None:
        """Update route intensities based on parameters."""
        global_intensity = parameters.get("transmission_intensity", 1.0)
        
        for route in self.routes:
            # Could add more sophisticated intensity calculations here
            route.intensity = global_intensity

    def calculate_transmissions(self, countries: Dict[str, Dict[str, Any]],
                              resistance_factors: Dict[str, float]) -> Dict[str, float]:
        """Calculate all transmissions in the network."""
        new_infections = {}  # Only include countries receiving infections
        
        for route in self.routes:
            if route.source not in countries or route.target not in countries:
                continue
                
            source_data = countries[route.source]
            target_data = countries[route.target]
            
            transmission = route.calculate_transmission(
                source_data["infected"],
                target_data["susceptible"],
                resistance_factors
            )
            
            if route.target not in new_infections:
                new_infections[route.target] = 0.0
            new_infections[route.target] += transmission
            
        return new_infections