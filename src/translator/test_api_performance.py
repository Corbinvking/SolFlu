import asyncio
import time
import statistics
from typing import List, Dict
import aiohttp
import unittest
import multiprocessing
import uvicorn
import requests
import signal
import os
import json
from api import app

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8002, log_level="error", workers=4)

class APIPerformanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Start the server in a separate process
        cls.server_process = multiprocessing.Process(target=run_server)
        cls.server_process.start()
        
        # Wait for server to be ready with exponential backoff
        max_retries = 5
        retry_delay = 1
        for attempt in range(max_retries):
            try:
                response = requests.get("http://localhost:8002/health")
                if response.status_code == 200:
                    print(f"\nServer started successfully after {attempt + 1} attempts")
                    print(f"Initial cache stats: {response.json()['cache_stats']}")
                    break
            except requests.exceptions.ConnectionError:
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    raise Exception("Server failed to start after multiple attempts")

    @classmethod
    def tearDownClass(cls):
        # Get final metrics
        try:
            response = requests.get("http://localhost:8002/metrics")
            if response.status_code == 200:
                print("\nFinal API Metrics:")
                print(json.dumps(response.json(), indent=2))
        except:
            pass

        # Shutdown the server
        if cls.server_process.is_alive():
            os.kill(cls.server_process.pid, signal.SIGTERM)
            cls.server_process.join(timeout=5)
            if cls.server_process.is_alive():
                os.kill(cls.server_process.pid, signal.SIGKILL)
                cls.server_process.join()

    def setUp(self):
        self.base_url = "http://localhost:8002"
        self.sample_market_metrics = {
            "price": 100.0,
            "volume_24h": 5_000_000_000,
            "price_change_24h": 10.0,
            "market_cap": 10_000_000_000,
            "timestamp": time.time()
        }

    def test_translation_performance(self):
        """Test the performance of parameter translation endpoint"""
        print("\nTesting Translation Performance")
        print("-" * 50)
        
        iterations = 100
        times: List[float] = []
        
        # Warm-up request
        requests.post(f"{self.base_url}/translate", json=self.sample_market_metrics)
        
        # Test requests
        for _ in range(iterations):
            start_time = time.perf_counter()
            response = requests.post(f"{self.base_url}/translate", json=self.sample_market_metrics)
            end_time = time.perf_counter()
            
            self.assertEqual(response.status_code, 200)
            times.append((end_time - start_time) * 1000)  # Convert to milliseconds
        
        # Get cache stats
        cache_stats = requests.get(f"{self.base_url}/metrics").json()["cache_stats"]
        
        avg_time = statistics.mean(times)
        p95_time = statistics.quantiles(times, n=20)[18]
        p99_time = statistics.quantiles(times, n=100)[98]
        max_time = max(times)
        min_time = min(times)
        std_dev = statistics.stdev(times)
        
        print(f"\nTranslation Performance Metrics (over {iterations} requests):")
        print(f"Average Time: {avg_time:.3f}ms")
        print(f"95th Percentile: {p95_time:.3f}ms")
        print(f"99th Percentile: {p99_time:.3f}ms")
        print(f"Maximum Time: {max_time:.3f}ms")
        print(f"Minimum Time: {min_time:.3f}ms")
        print(f"Standard Deviation: {std_dev:.3f}ms")
        print(f"\nCache Performance:")
        print(f"Cache Hit Rate: {cache_stats['hit_rate']*100:.1f}%")
        print(f"Total Requests: {cache_stats['total_requests']}")
        print(f"Cache Hits: {cache_stats['cache_hits']}")
        print(f"Cache Misses: {cache_stats['cache_misses']}")
        
        # Assert performance requirements
        self.assertLess(avg_time, 50, "Average response time exceeds 50ms")
        self.assertLess(p95_time, 100, "95th percentile response time exceeds 100ms")
        self.assertGreater(cache_stats['hit_rate'], 0.8, "Cache hit rate below 80%")

    async def concurrent_request(self, session: aiohttp.ClientSession, metrics: Dict) -> float:
        """Make a single concurrent request and return the response time"""
        start_time = time.perf_counter()
        async with session.post(f"{self.base_url}/translate", json=metrics) as response:
            await response.json()
        end_time = time.perf_counter()
        return (end_time - start_time) * 1000

    def test_concurrent_performance(self):
        """Test API performance under concurrent load"""
        print("\nTesting Concurrent Performance")
        print("-" * 50)
        
        async def run_concurrent_test():
            concurrent_users = 20
            requests_per_user = 5
            
            # Generate slightly different metrics for each request
            metrics_variations = []
            for i in range(concurrent_users * requests_per_user):
                metrics = self.sample_market_metrics.copy()
                metrics["price"] += (i % 5)  # Add some variation
                metrics_variations.append(metrics)
            
            async with aiohttp.ClientSession() as session:
                tasks = []
                for metrics in metrics_variations:
                    tasks.append(self.concurrent_request(session, metrics))
                
                times = await asyncio.gather(*tasks)
            
            return times
        
        times = asyncio.run(run_concurrent_test())
        
        # Get cache stats after concurrent test
        cache_stats = requests.get(f"{self.base_url}/metrics").json()["cache_stats"]
        
        avg_time = statistics.mean(times)
        p95_time = statistics.quantiles(times, n=20)[18]
        max_time = max(times)
        
        print(f"\nConcurrent Performance Metrics:")
        print(f"Average Time: {avg_time:.3f}ms")
        print(f"95th Percentile: {p95_time:.3f}ms")
        print(f"Maximum Time: {max_time:.3f}ms")
        print(f"\nCache Performance:")
        print(f"Cache Hit Rate: {cache_stats['hit_rate']*100:.1f}%")
        print(f"Total Requests: {cache_stats['total_requests']}")
        
        # Assert performance under load
        self.assertLess(avg_time, 100, "Average concurrent response time exceeds 100ms")
        self.assertLess(p95_time, 200, "95th percentile concurrent response time exceeds 200ms")

    def test_cache_effectiveness(self):
        """Test the effectiveness of response caching"""
        print("\nTesting Cache Effectiveness")
        print("-" * 50)
        
        # First request (cache miss)
        start_time = time.perf_counter()
        response = requests.post(f"{self.base_url}/translate", json=self.sample_market_metrics)
        first_request_time = (time.perf_counter() - start_time) * 1000
        
        # Second request with same data (cache hit)
        start_time = time.perf_counter()
        response = requests.post(f"{self.base_url}/translate", json=self.sample_market_metrics)
        second_request_time = (time.perf_counter() - start_time) * 1000
        
        # Slightly different data (cache miss)
        different_metrics = self.sample_market_metrics.copy()
        different_metrics["price"] = 101.0
        start_time = time.perf_counter()
        response = requests.post(f"{self.base_url}/translate", json=different_metrics)
        different_data_time = (time.perf_counter() - start_time) * 1000
        
        # Get cache stats
        cache_stats = requests.get(f"{self.base_url}/metrics").json()["cache_stats"]
        
        print(f"\nCache Performance Metrics:")
        print(f"First Request (Cache Miss): {first_request_time:.3f}ms")
        print(f"Second Request (Cache Hit): {second_request_time:.3f}ms")
        print(f"Different Data (Cache Miss): {different_data_time:.3f}ms")
        print(f"Cache Hit Improvement: {((first_request_time - second_request_time) / first_request_time * 100):.1f}%")
        print(f"\nOverall Cache Stats:")
        print(f"Cache Hit Rate: {cache_stats['hit_rate']*100:.1f}%")
        print(f"Total Requests: {cache_stats['total_requests']}")
        
        # Assert cache effectiveness
        self.assertLess(second_request_time, first_request_time * 0.8,
                       "Cache hit not faster than cache miss")
        self.assertGreater(different_data_time, second_request_time * 1.2,
                          "Cache miss not slower than cache hit")
        self.assertGreater(cache_stats['hit_rate'], 0.3,
                          "Overall cache hit rate too low")

if __name__ == '__main__':
    print("Running API Performance Tests...")
    print("=" * 50)
    unittest.main(verbosity=2) 