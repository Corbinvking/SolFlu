import numpy as np
from typing import Dict, Any, Set
import json
import logging
from .transmission import TransmissionNetwork, RouteType
from .mutation import VirusMutation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SIRModel:
    def __init__(self):
        self.countries: Dict[str, Dict[str, Any]] = {}
        self.beta = 0.3  # Base infection rate
        self.gamma = 0.1  # Base recovery rate
        self.dt = 0.1    # Time step
        
        # Initialize transmission and mutation systems
        self.transmission_network = TransmissionNetwork()
        self.mutation_system = VirusMutation()
        
        # Track activated routes
        self.activated_routes: Set[str] = set()

    def add_country(self, country_id: str, data: Dict[str, Any]) -> None:
        """Add a country to the simulation with initial conditions."""
        try:
            self.countries[country_id] = {
                "population": data["population"],
                "susceptible": data["population"] - data.get("infected", 0),
                "infected": data.get("infected", 0),
                "recovered": data.get("recovered", 0),
                "resistance": data.get("resistance", {
                    "air": 0.5,
                    "sea": 0.3,
                    "land": 0.4
                }),
                "location": data.get("location", {"lat": 0, "lng": 0}),
                "infection_radius": 0.0  # Track spread radius
            }
            logger.info(f"Added country {country_id} to simulation")
        except KeyError as e:
            logger.error(f"Missing required field in country data: {e}")
            raise

    def add_route(self, source: str, target: str, route_type: RouteType) -> None:
        """Add a transmission route between countries."""
        if source in self.countries and target in self.countries:
            self.transmission_network.add_route(source, target, route_type)
            # Activate the route immediately
            self.transmission_network.activate_route(source, target)
            # Set route points based on country locations
            source_location = self.countries[source]["location"]
            target_location = self.countries[target]["location"]
            route_id = f"{source}-{target}"
            self.activated_routes.add(route_id)
        else:
            logger.warning(f"Cannot add route: {source} or {target} not in simulation")

    def _check_route_activation(self, country_id: str, infection_radius: float) -> None:
        """Check if infection has reached any route points and activate them."""
        country_data = self.countries[country_id]
        country_location = country_data["location"]
        
        for route in self.transmission_network.get_outbound_routes(country_id):
            route_id = f"{route.source}-{route.target}"
            
            # Skip already activated routes
            if route_id in self.activated_routes:
                continue
            
            # Check if infection radius intersects with route point
            if self._infection_reaches_route(country_location, infection_radius, route):
                # Activate route and start infection at target
                self.activated_routes.add(route_id)
                target_country = self.countries[route.target]
                
                # Start new infection at target if not already infected
                if target_country["infected"] < 100:
                    target_country["infected"] += 100
                    target_country["susceptible"] -= 100
                    logger.info(f"Route activated: {route_id}")

    def _infection_reaches_route(self, location: Dict[str, float], radius: float, route: Any) -> bool:
        """Check if infection radius intersects with route point."""
        # Simplified distance check - in real implementation, use proper geo-calculations
        route_point = getattr(route, "source_point", location)
        dx = location["lng"] - route_point["lng"]
        dy = location["lat"] - route_point["lat"]
        distance = np.sqrt(dx*dx + dy*dy)
        return distance <= radius

    def update(self, parameters: Dict[str, Any]) -> None:
        """Update the SIR model state using current parameters."""
        # Check for mutations
        global_stats = self._calculate_global_stats()
        if self.mutation_system.check_mutation_trigger(global_stats, parameters):
            self.mutation_system.mutate(global_stats)
            parameters = self.mutation_system.apply_strain_effects(parameters)

        # Get speed multiplier from parameters
        speed_multiplier = parameters.get("speed_multiplier", 1.0)
        infection_rate_modifier = parameters.get("infection_rate", 1.0)
        recovery_rate = parameters.get("recovery_rate", 0.1)

        # Update transmission network intensities
        self.transmission_network.update_intensities(parameters)

        # First calculate all changes
        updates = {}
        for country_id, country_data in self.countries.items():
            try:
                S = country_data["susceptible"]
                I = country_data["infected"]
                R = country_data["recovered"]
                N = country_data["population"]

                # Apply speed multiplier to the time step
                effective_dt = self.dt * speed_multiplier

                # Calculate infection spread
                effective_beta = self.beta * infection_rate_modifier
                internal_transmission = effective_beta * S * I / N

                # Update infection radius based on infected population
                infection_radius = np.sqrt(I / N) * 0.1  # Adjust factor as needed
                country_data["infection_radius"] = infection_radius

                # Check for route activations
                self._check_route_activation(country_id, infection_radius)

                # SIR differential equations
                dSdt = -internal_transmission
                dIdt = internal_transmission - recovery_rate * I
                dRdt = recovery_rate * I

                # Store updates
                updates[country_id] = {
                    "susceptible": max(0, S + dSdt * effective_dt),
                    "infected": max(0, I + dIdt * effective_dt),
                    "recovered": max(0, R + dRdt * effective_dt)
                }

            except Exception as e:
                logger.error(f"Error updating country {country_id}: {e}")
                raise

        # Calculate transmissions through routes
        route_transmissions = self.transmission_network.calculate_transmissions(
            self.countries,
            {route_type.value: 0.5 for route_type in RouteType}  # Default resistance factors
        )

        # Add route transmissions to updates
        for country_id, transmission in route_transmissions.items():
            if country_id in updates:
                updates[country_id]["infected"] += transmission
                updates[country_id]["susceptible"] -= transmission

        # Apply all updates
        for country_id, update in updates.items():
            country_data = self.countries[country_id]
            for key, value in update.items():
                country_data[key] = value

            # Verify population conservation
            total = (country_data["susceptible"] + 
                    country_data["infected"] + 
                    country_data["recovered"])
            if abs(total - country_data["population"]) > 1.0:
                logger.warning(f"Population conservation error in {country_id}: "
                             f"diff = {abs(total - country_data['population'])}")
                # Adjust to maintain population
                scale = country_data["population"] / total
                country_data["susceptible"] *= scale
                country_data["infected"] *= scale
                country_data["recovered"] *= scale

    def get_state(self) -> Dict[str, Any]:
        """Return the current state of all countries and systems."""
        return {
            "countries": self.countries,
            "global_stats": self._calculate_global_stats(),
            "mutation_state": self.mutation_system.get_current_state(),
            "active_routes": list(self.activated_routes)
        }

    def _calculate_global_stats(self) -> Dict[str, float]:
        """Calculate global statistics across all countries."""
        total_susceptible = sum(c["susceptible"] for c in self.countries.values())
        total_infected = sum(c["infected"] for c in self.countries.values())
        total_recovered = sum(c["recovered"] for c in self.countries.values())
        total_population = sum(c["population"] for c in self.countries.values())

        return {
            "total_susceptible": total_susceptible,
            "total_infected": total_infected,
            "total_recovered": total_recovered,
            "total_population": total_population,
            "infection_rate": total_infected / total_population if total_population > 0 else 0,
            "timestamp": self.dt  # Add timestamp for mutation history
        } 