import unittest
import numpy as np
from simulation.sir_model import SIRModel
from simulation.transmission import TransmissionNetwork, RouteType
from simulation.mutation import VirusMutation

class TestSimulationEngine(unittest.TestCase):
    def setUp(self):
        self.model = SIRModel()
        
        # Add test countries
        self.test_countries = {
            "US": {
                "population": 1000000,
                "infected": 1000,
                "recovered": 0,
                "location": {"lat": 40.7128, "lng": -74.0060}
            },
            "UK": {
                "population": 800000,
                "infected": 0,
                "recovered": 0,
                "location": {"lat": 51.5074, "lng": -0.1278}
            }
        }
        
        for country_id, data in self.test_countries.items():
            self.model.add_country(country_id, data)

    def test_country_initialization(self):
        """Test if countries are properly initialized"""
        us_data = self.model.countries["US"]
        self.assertEqual(us_data["population"], 1000000)
        self.assertEqual(us_data["infected"], 1000)
        self.assertEqual(us_data["susceptible"], 999000)
        self.assertEqual(us_data["recovered"], 0)

    def test_sir_model_update(self):
        """Test basic SIR model dynamics"""
        initial_infected = self.model.countries["US"]["infected"]
        
        # Update with default parameters
        self.model.update({
            "speed_multiplier": 1.0,
            "infection_rate": 1.0,
            "recovery_rate": 0.1
        })
        
        current_infected = self.model.countries["US"]["infected"]
        self.assertNotEqual(initial_infected, current_infected, 
                          "Infection count should change after update")
        
        # Test population conservation
        us_data = self.model.countries["US"]
        total = us_data["susceptible"] + us_data["infected"] + us_data["recovered"]
        self.assertAlmostEqual(total, us_data["population"], places=5)

    def test_transmission_routes(self):
        """Test transmission route activation and spread"""
        # Add a route between US and UK
        self.model.add_route("US", "UK", RouteType.AIR)
        
        # Update multiple times to allow spread
        for _ in range(10):
            self.model.update({
                "speed_multiplier": 1.0,
                "infection_rate": 1.0,
                "recovery_rate": 0.1
            })
        
        # Check if infection spread to UK
        self.assertGreater(self.model.countries["UK"]["infected"], 0,
                          "Infection should spread through air route")

    def test_market_driven_parameters(self):
        """Test simulation response to market parameters"""
        # Test with bullish market conditions
        self.model.update({
            "speed_multiplier": 1.5,  # High volatility
            "infection_rate": 1.2,    # Growing market cap
            "recovery_rate": 0.1
        })
        
        bull_infected = self.model.countries["US"]["infected"]
        
        # Reset model
        self.setUp()
        
        # Test with bearish market conditions
        self.model.update({
            "speed_multiplier": 0.8,  # Low volatility
            "infection_rate": 0.8,    # Declining market cap
            "recovery_rate": 0.1
        })
        
        bear_infected = self.model.countries["US"]["infected"]
        
        self.assertGreater(bull_infected, bear_infected,
                          "Bullish market should lead to faster spread")

    def test_infection_radius(self):
        """Test infection radius calculation and route activation"""
        us_data = self.model.countries["US"]
        initial_radius = us_data["infection_radius"]
        
        # Update with high infection rate
        self.model.update({
            "speed_multiplier": 1.0,
            "infection_rate": 2.0,
            "recovery_rate": 0.1
        })
        
        new_radius = us_data["infection_radius"]
        self.assertNotEqual(initial_radius, new_radius,
                          "Infection radius should change with infection count")

    def test_global_stats(self):
        """Test global statistics calculation"""
        stats = self.model._calculate_global_stats()
        
        self.assertEqual(
            stats["total_population"],
            sum(c["population"] for c in self.test_countries.values())
        )
        
        self.assertEqual(
            stats["total_infected"],
            sum(c["infected"] for c in self.test_countries.values())
        )

if __name__ == '__main__':
    unittest.main() 