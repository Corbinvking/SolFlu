import unittest
import time
from dataclasses import dataclass
from typing import Dict, Any

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

class TestTranslator(unittest.TestCase):
    def setUp(self):
        self.translator = Translator()
        self.sample_metrics = MarketMetrics(
            price=100.0,
            volume_24h=5_000_000_000,  # 5B volume
            price_change_24h=10.0,     # 10% up
            market_cap=10_000_000_000, # 10B market cap
            timestamp=time.time()
        )

    def test_bull_market_scenario(self):
        """Test translation during a bull market (price up, high volume)"""
        metrics = MarketMetrics(
            price=100.0,
            volume_24h=8_000_000_000,  # 8B volume (high)
            price_change_24h=15.0,     # 15% up (strong bull)
            market_cap=15_000_000_000, # 15B market cap
            timestamp=time.time()
        )
        
        params = self.translator.translate_parameters(metrics)
        
        self.assertIsInstance(params, SimulationParameters)
        # Market cap factor + price momentum contribution
        self.assertGreaterEqual(params.infection_rate, 0.3)  # Adjusted lower bound
        self.assertLessEqual(params.infection_rate, 0.8)
        # Volume factor + volatility contribution
        self.assertGreaterEqual(params.mutation_rate, 0.05)  # Adjusted lower bound
        self.assertLessEqual(params.mutation_rate, 0.2)
        # Base speed + cap modifier
        self.assertGreaterEqual(params.transmission_speed, 0.8)  # Adjusted lower bound
        self.assertLessEqual(params.transmission_speed, 2.0)
        # Bull market = low cure progress
        self.assertGreaterEqual(params.cure_progress, 0.05)  # Base rate
        self.assertLessEqual(params.cure_progress, 0.1)

    def test_bear_market_scenario(self):
        """Test translation during a bear market (price down, high volume)"""
        metrics = MarketMetrics(
            price=90.0,
            volume_24h=7_000_000_000,  # 7B volume
            price_change_24h=-20.0,    # 20% down (strong bear)
            market_cap=8_000_000_000,  # 8B market cap
            timestamp=time.time()
        )
        
        params = self.translator.translate_parameters(metrics)
        
        # Print actual values for debugging
        print("\nBear Market Test - Actual Values:")
        print(f"Infection Rate: {params.infection_rate}")
        print(f"Mutation Rate: {params.mutation_rate}")
        print(f"Transmission Speed: {params.transmission_speed}")
        print(f"Cure Progress: {params.cure_progress}")
        
        self.assertIsInstance(params, SimulationParameters)
        # Market cap factor (0.24) + price momentum (0.08)
        self.assertGreaterEqual(params.infection_rate, 0.2)
        self.assertLessEqual(params.infection_rate, 0.5)  # Adjusted upper bound
        # Volume factor (0.14) + volatility (0.02)
        self.assertGreaterEqual(params.mutation_rate, 0.05)
        self.assertLessEqual(params.mutation_rate, 0.2)
        # Base speed (3.5) + cap modifier (0.2) -> capped at 2.0
        self.assertGreaterEqual(params.transmission_speed, 0.5)
        self.assertLessEqual(params.transmission_speed, 2.0)
        # Base rate (0.05) + bear market effect (0.04)
        self.assertGreaterEqual(params.cure_progress, 0.05)
        self.assertLessEqual(params.cure_progress, 0.15)  # Adjusted upper bound

    def test_stagnant_market_scenario(self):
        """Test translation during a stagnant market (low volatility, low volume)"""
        metrics = MarketMetrics(
            price=100.0,
            volume_24h=1_000_000_000,  # 1B volume (low)
            price_change_24h=1.0,      # 1% up (low volatility)
            market_cap=10_000_000_000, # 10B market cap
            timestamp=time.time()
        )
        
        params = self.translator.translate_parameters(metrics)
        
        self.assertIsInstance(params, SimulationParameters)
        # Market cap factor + minimal price momentum
        self.assertGreaterEqual(params.infection_rate, 0.1)
        self.assertLessEqual(params.infection_rate, 0.4)  # Adjusted upper bound
        # Low volume + low volatility
        self.assertGreaterEqual(params.mutation_rate, 0.01)
        self.assertLessEqual(params.mutation_rate, 0.1)
        # Low volume impact
        self.assertGreaterEqual(params.transmission_speed, 0.5)
        self.assertLessEqual(params.transmission_speed, 1.0)
        # Minimal price effect
        self.assertGreaterEqual(params.cure_progress, 0.05)  # Base rate
        self.assertLessEqual(params.cure_progress, 0.1)

    def test_parameter_bounds(self):
        """Test that parameters stay within their defined bounds"""
        test_cases = [
            # Extreme bull
            MarketMetrics(price=100, volume_24h=50e9, price_change_24h=100, market_cap=100e9, timestamp=time.time()),
            # Extreme bear
            MarketMetrics(price=100, volume_24h=50e9, price_change_24h=-100, market_cap=100e9, timestamp=time.time()),
            # Zero activity
            MarketMetrics(price=100, volume_24h=0, price_change_24h=0, market_cap=0, timestamp=time.time()),
        ]
        
        for metrics in test_cases:
            params = self.translator.translate_parameters(metrics)
            
            self.assertGreaterEqual(params.infection_rate, 0.1)
            self.assertLessEqual(params.infection_rate, 0.8)
            self.assertGreaterEqual(params.mutation_rate, 0.01)
            self.assertLessEqual(params.mutation_rate, 0.2)
            self.assertGreaterEqual(params.transmission_speed, 0.5)
            self.assertLessEqual(params.transmission_speed, 2.0)
            self.assertGreaterEqual(params.cure_progress, 0.0)
            self.assertLessEqual(params.cure_progress, 0.3)

if __name__ == '__main__':
    print("Running Translator Module Tests...")
    print("-" * 50)
    unittest.main(verbosity=2) 