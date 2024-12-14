import asyncio
import aiohttp
import datetime
import time
from aiohttp import ClientError

base_url = "http://localhost:8000"

async def wait_for_server(max_retries=5, delay=2):
    for attempt in range(max_retries):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{base_url}/health") as response:
                    if response.status == 200:
                        print(f"Server is ready after {attempt + 1} attempts")
                        return True
        except ClientError:
            if attempt < max_retries - 1:
                print(f"Server not ready, retrying in {delay} seconds... (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(delay)
            continue
    return False

async def test_endpoints():
    print(f"Starting API tests at {datetime.datetime.now()}")
    print("=" * 50)
    print()

    # Wait for server to be ready
    if not await wait_for_server():
        print("Error: Server failed to start after multiple retries")
        return

    async with aiohttp.ClientSession() as session:
        # Test health endpoint
        print("1. Testing Health Endpoint")
        print("-" * 50)
        async with session.get(f"{base_url}/health") as response:
            assert response.status == 200
            data = await response.json()
            assert data["status"] == "healthy"
            print("✓ Health check passed")
            print()

        # Test translation endpoint
        print("2. Testing Translation Endpoint")
        print("-" * 50)
        test_data = {
            "text": "Hello world",
            "source_lang": "en",
            "target_lang": "es"
        }
        async with session.post(f"{base_url}/translate", json=test_data) as response:
            assert response.status == 200
            data = await response.json()
            assert "translated_text" in data
            print("✓ Translation test passed")
            print(f"Input: {test_data['text']}")
            print(f"Output: {data['translated_text']}")
            print()

if __name__ == "__main__":
    asyncio.run(test_endpoints()) 