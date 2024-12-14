import time
import statistics
from typing import List
import unittest
from dataclasses import dataclass

@dataclass
class MarketMetrics:
    price: float
    volume_24h: float
    price_change_24h: float
    market_cap: float
    timestamp: float

@dataclass
class SimulationParameters:
    infection_rate: float
    mutation_rate: float
    transmission_speed: float
    cure_progress: float

class Translator:
    def translate_parameters(self, metrics: MarketMetrics) -> SimulationParameters:
        try:
            # Base infection rate influenced by market cap (0.1 to 0.4)
            market_cap_factor = min(0.4, max(0.1, 
                (metrics.market_cap / 10_000_000_000) * 0.3))
            
            # Price momentum affects infection spread
            price_momentum = metrics.price_change_24h / 100.0
            infection_rate = min(0.8, max(0.1,
                market_cap_factor + (abs(price_momentum) * 0.4)))
            
            # Volume affects mutation probability (0.01 to 0.15)
            volume_factor = min(0.15, max(0.01,
                (metrics.volume_24h / 5_000_000_000) * 0.1))
            
            # Volatility influences mutation aggressiveness
            volatility_factor = abs(metrics.price_change_24h) / 100.0
            mutation_rate = min(0.2, max(0.01,
                volume_factor + (volatility_factor * 0.1)))
            
            # Transmission speed based on volume and market cap
            base_speed = metrics.volume_24h / 2_000_000_000
            cap_modifier = min(0.5, metrics.market_cap / 20_000_000_000)
            transmission_speed = min(2.0, max(0.5,
                base_speed + cap_modifier))
            
            # Cure progress inversely related to price change
            base_cure_rate = 0.05
            price_effect = -metrics.price_change_24h / 100.0
            cure_progress = min(0.3, max(0.0,
                base_cure_rate + (price_effect * 0.2 if price_effect > 0 else 0)))

            return SimulationParameters(
                infection_rate=infection_rate,
                mutation_rate=mutation_rate,
                transmission_speed=transmission_speed,
                cure_progress=cure_progress
            )
        except Exception as e:
            print(f"Error translating parameters: {str(e)}")
            raise

class PerformanceTests(unittest.TestCase):
    def setUp(self):
        self.translator = Translator()
        self.sample_metrics = MarketMetrics(
            price=100.0,
            volume_24h=5_000_000_000,
            price_change_24h=10.0,
            market_cap=10_000_000_000,
            timestamp=time.time()
        )

    def test_translation_performance(self):
        """Test the performance of parameter translation logic"""
        print("\nTesting Translation Performance")
        print("-" * 50)
        
        metrics = self.sample_metrics
        iterations = 1000  # Increased for better statistical significance
        times: List[float] = []
        
        # Warm-up run
        self.translator.translate_parameters(metrics)
        
        # Actual test runs
        for _ in range(iterations):
            start_time = time.perf_counter()
            self.translator.translate_parameters(metrics)
            end_time = time.perf_counter()
            times.append((end_time - start_time) * 1000)  # Convert to milliseconds
        
        avg_time = statistics.mean(times)
        p95_time = statistics.quantiles(times, n=20)[18]  # 95th percentile
        p99_time = statistics.quantiles(times, n=100)[98]  # 99th percentile
        max_time = max(times)
        min_time = min(times)
        std_dev = statistics.stdev(times)
        
        print(f"\nTranslation Performance Metrics (over {iterations} iterations):")
        print(f"Average Time: {avg_time:.3f}ms")
        print(f"95th Percentile: {p95_time:.3f}ms")
        print(f"99th Percentile: {p99_time:.3f}ms")
        print(f"Maximum Time: {max_time:.3f}ms")
        print(f"Minimum Time: {min_time:.3f}ms")
        print(f"Standard Deviation: {std_dev:.3f}ms")
        
        # Assert performance requirements
        self.assertLess(avg_time, 1.0, "Average translation time exceeds 1ms")
        self.assertLess(p95_time, 2.0, "95th percentile translation time exceeds 2ms")
        self.assertLess(max_time, 10.0, "Maximum translation time exceeds 10ms")

    def test_translation_stability(self):
        """Test the stability of translation performance under different market conditions"""
        print("\nTesting Translation Stability")
        print("-" * 50)
        
        test_cases = [
            # Normal market conditions
            MarketMetrics(price=100.0, volume_24h=5e9, price_change_24h=5.0, market_cap=10e9, timestamp=time.time()),
            # Extreme bull market
            MarketMetrics(price=100.0, volume_24h=20e9, price_change_24h=50.0, market_cap=50e9, timestamp=time.time()),
            # Extreme bear market
            MarketMetrics(price=100.0, volume_24h=15e9, price_change_24h=-40.0, market_cap=5e9, timestamp=time.time()),
            # Low activity
            MarketMetrics(price=100.0, volume_24h=0.1e9, price_change_24h=0.1, market_cap=1e9, timestamp=time.time()),
        ]
        
        iterations = 100
        for case_index, metrics in enumerate(test_cases):
            times: List[float] = []
            
            for _ in range(iterations):
                start_time = time.perf_counter()
                self.translator.translate_parameters(metrics)
                end_time = time.perf_counter()
                times.append((end_time - start_time) * 1000)
            
            avg_time = statistics.mean(times)
            max_time = max(times)
            
            print(f"\nCase {case_index + 1} Performance:")
            print(f"Average Time: {avg_time:.3f}ms")
            print(f"Maximum Time: {max_time:.3f}ms")
            
            # Assert performance stability
            self.assertLess(avg_time, 2.0, f"Case {case_index + 1}: Average time exceeds 2ms")
            self.assertLess(max_time, 10.0, f"Case {case_index + 1}: Maximum time exceeds 10ms")

if __name__ == '__main__':
    print("Running Translation Performance Tests...")
    print("=" * 50)
    unittest.main(verbosity=2) 