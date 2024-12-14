import pytest
import numpy as np
from simulation.transmission import TransmissionNetwork, RouteType, TransmissionRoute
from simulation.mutation import VirusMutation
from simulation.sir_model import SIRModel
import time

@pytest.fixture
def transmission_network():
    return TransmissionNetwork()

@pytest.fixture
def mutation_system():
    return VirusMutation()

@pytest.fixture
def sample_countries():
    return {
        "country1": {
            "population": 1000000,
            "susceptible": 990000,
            "infected": 10000,
            "recovered": 0
        },
        "country2": {
            "population": 2000000,
            "susceptible": 1990000,
            "infected": 5000,
            "recovered": 5000
        }
    }

def test_route_creation(transmission_network):
    transmission_network.add_route("country1", "country2", RouteType.AIR)
    routes = transmission_network.get_outbound_routes("country1")
    
    assert len(routes) == 1
    assert routes[0].source == "country1"
    assert routes[0].target == "country2"
    assert routes[0].route_type == RouteType.AIR

def test_transmission_calculation(transmission_network, sample_countries):
    transmission_network.add_route("country1", "country2", RouteType.AIR)
    transmission_network.update_intensities({"transmission_intensity": 1.0})
    
    resistance_factors = {"air": 0.3, "sea": 0.4, "land": 0.5}
    new_infections = transmission_network.calculate_transmissions(
        sample_countries,
        resistance_factors
    )
    
    assert "country2" in new_infections
    assert new_infections["country2"] > 0  # Should have some transmission
    assert "country1" not in new_infections  # No route back to country1

def test_mutation_trigger(mutation_system):
    # Test with high infection rate
    global_stats = {"infection_rate": 0.4, "timestamp": 1.0}
    parameters = {"recovery_rate": 0.1}
    
    # Run multiple times to account for randomness
    triggered = False
    for _ in range(100):
        if mutation_system.check_mutation_trigger(global_stats, parameters):
            triggered = True
            break
    
    assert triggered  # Should trigger at least once with high infection rate

def test_mutation_effects(mutation_system):
    initial_resistance = mutation_system.resistance_factors.copy()
    global_stats = {"infection_rate": 0.4, "timestamp": 1.0}
    
    mutation_system.mutate(global_stats)
    
    assert mutation_system.current_strain == 1
    assert len(mutation_system.mutation_history) == 1
    # Resistance factors should have changed
    assert any(initial_resistance[k] != mutation_system.resistance_factors[k] 
              for k in initial_resistance)

def test_integrated_simulation():
    model = SIRModel()
    
    # Add countries
    model.add_country("USA", {
        "population": 1000000,
        "infected": 10000,
        "recovered": 0
    })
    model.add_country("UK", {
        "population": 800000,
        "infected": 5000,
        "recovered": 0
    })
    
    # Add routes
    model.add_route("USA", "UK", RouteType.AIR)
    model.add_route("UK", "USA", RouteType.SEA)
    
    # Run simulation for several steps
    parameters = {
        "infection_rate": 1.2,
        "recovery_rate": 0.1,
        "transmission_intensity": 1.0
    }
    
    initial_state = model.get_state()
    initial_infections = {
        k: v["infected"] for k, v in initial_state["countries"].items()
    }
    
    # Run for 10 steps
    for _ in range(10):
        model.update(parameters)
    
    final_state = model.get_state()
    final_infections = {
        k: v["infected"] for k, v in final_state["countries"].items()
    }
    
    # Verify that infection spread through routes
    assert any(final_infections[k] != initial_infections[k] 
              for k in initial_infections)
    
    # Verify mutation system is working
    assert "mutation_state" in final_state
    
    # Verify population conservation
    for country_id, data in final_state["countries"].items():
        total = (data["susceptible"] + data["infected"] + data["recovered"])
        initial_total = initial_state["countries"][country_id]["population"]
        assert abs(total - initial_total) < 1.0  # Allow for floating point error

def test_performance(benchmark):
    """Test performance of transmission calculations."""
    network = TransmissionNetwork()
    countries = {}
    
    # Create a network of 100 countries with multiple routes
    for i in range(100):
        countries[f"country_{i}"] = {
            "population": 1000000,
            "susceptible": 990000,
            "infected": 10000,
            "recovered": 0
        }
        
        # Add routes to next 5 countries (circular)
        for j in range(1, 6):
            target_idx = (i + j) % 100
            network.add_route(f"country_{i}", 
                            f"country_{target_idx}", 
                            RouteType.AIR)
    
    # Create the function to benchmark
    def run_transmission():
        network.update_intensities({"transmission_intensity": 1.0})
        return network.calculate_transmissions(
            countries,
            {"air": 0.3, "sea": 0.4, "land": 0.5}
        )
    
    # Run benchmark
    benchmark(run_transmission)
    
    # The benchmark fixture automatically tracks timing
    # and will fail if it exceeds our thresholds