import time
import statistics
from sir_model import SIRModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_performance_test(num_countries=100, num_iterations=1000):
    """
    Run performance benchmarks on the SIR model.
    Target: Update speed < 50ms
    """
    model = SIRModel()
    
    # Initialize countries
    for i in range(num_countries):
        model.add_country(f"country_{i}", {
            "population": 1000000,
            "infected": 1000,
            "recovered": 0,
            "resistance": {
                "airborne": 0.5,
                "contact": 0.3
            }
        })
    
    # Measure update times
    update_times = []
    parameters = {"infection_rate": 1.0, "recovery_rate": 1.0}
    
    for _ in range(num_iterations):
        start_time = time.perf_counter()
        model.update(parameters)
        end_time = time.perf_counter()
        update_times.append((end_time - start_time) * 1000)  # Convert to milliseconds
    
    # Calculate statistics
    avg_time = statistics.mean(update_times)
    max_time = max(update_times)
    min_time = min(update_times)
    p95_time = sorted(update_times)[int(len(update_times) * 0.95)]
    
    logger.info(f"""
Performance Results:
------------------
Number of countries: {num_countries}
Number of iterations: {num_iterations}
Average update time: {avg_time:.2f}ms
95th percentile time: {p95_time:.2f}ms
Min time: {min_time:.2f}ms
Max time: {max_time:.2f}ms
Target met: {"Yes" if avg_time < 50 else "No"}
""")
    
    return avg_time < 50  # Return whether we met the target

if __name__ == "__main__":
    success = run_performance_test()
    exit(0 if success else 1) 