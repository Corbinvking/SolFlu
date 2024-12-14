import pytest
from sir_model import SIRModel
import numpy as np

@pytest.fixture
def sir_model():
    return SIRModel()

@pytest.fixture
def sample_country_data():
    return {
        "population": 1000000,
        "infected": 1000,
        "recovered": 0,
        "resistance": {
            "airborne": 0.5,
            "contact": 0.3
        }
    }

def test_add_country(sir_model, sample_country_data):
    sir_model.add_country("test_country", sample_country_data)
    
    country_data = sir_model.countries["test_country"]
    assert country_data["population"] == 1000000
    assert country_data["infected"] == 1000
    assert country_data["susceptible"] == 999000
    assert country_data["recovered"] == 0

def test_update_mechanics(sir_model, sample_country_data):
    sir_model.add_country("test_country", sample_country_data)
    
    # Test with default parameters
    sir_model.update({"infection_rate": 1.0, "recovery_rate": 1.0})
    
    country_data = sir_model.countries["test_country"]
    
    # Basic sanity checks
    assert country_data["susceptible"] >= 0
    assert country_data["infected"] >= 0
    assert country_data["recovered"] >= 0
    
    # Conservation of population
    total_population = (country_data["susceptible"] + 
                       country_data["infected"] + 
                       country_data["recovered"])
    assert abs(total_population - 1000000) < 1.0  # Allow for floating point error

def test_global_stats(sir_model, sample_country_data):
    sir_model.add_country("country1", sample_country_data)
    sir_model.add_country("country2", {
        "population": 2000000,
        "infected": 2000,
        "recovered": 0,
        "resistance": {"airborne": 0.5, "contact": 0.3}
    })
    
    state = sir_model.get_state()
    global_stats = state["global_stats"]
    
    assert global_stats["total_population"] == 3000000
    assert global_stats["total_infected"] == 3000
    assert global_stats["total_recovered"] == 0
    assert global_stats["total_susceptible"] == 2997000

def test_parameter_sensitivity(sir_model, sample_country_data):
    sir_model.add_country("test_country", sample_country_data)
    
    # Test with high infection rate
    sir_model.update({"infection_rate": 2.0, "recovery_rate": 1.0})
    high_infection = sir_model.countries["test_country"]["infected"]
    
    # Reset model
    sir_model = SIRModel()
    sir_model.add_country("test_country", sample_country_data)
    
    # Test with low infection rate
    sir_model.update({"infection_rate": 0.5, "recovery_rate": 1.0})
    low_infection = sir_model.countries["test_country"]["infected"]
    
    # Higher infection rate should lead to more infections
    assert high_infection > low_infection

def test_error_handling(sir_model):
    # Test missing required field
    with pytest.raises(KeyError):
        sir_model.add_country("test_country", {"infected": 1000}) 