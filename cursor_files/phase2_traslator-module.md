Here’s the **`phase2-translator-module.md`** file:

---

```markdown
# Phase 2: Translator Module Development

## Objective
The goal of this phase is to develop a **translator module** that converts real-time cryptocurrency metrics into simulation parameters. These parameters will drive infection rates, mutation rates, transmission speeds, and cure progress within the simulation engine.

---

## Steps to Completion

### **1. Set Up the Module Framework**

#### **1.1 Create the Translator Module**
1. Add a new module to the backend:
   - File: `translator.py`
   - This module will handle:
     - Fetching crypto data from APIs.
     - Mapping metrics to simulation parameters.

2. Define the structure of the translator:
   - Core functions:
     - `fetch_crypto_data()`: Retrieves market data.
     - `translate_data()`: Maps crypto metrics to simulation parameters.
     - `get_simulation_parameters()`: Outputs translated parameters.

3. Example skeleton:
   ```python
   class Translator:
       def __init__(self):
           self.api_urls = {
               "coingecko": "https://api.coingecko.com/api/v3/simple/price",
               "binance": "https://api.binance.com/api/v3/ticker/24hr"
           }

       def fetch_crypto_data(self):
           # Fetch raw data from APIs
           pass

       def translate_data(self, raw_data):
           # Map crypto metrics to simulation parameters
           pass

       def get_simulation_parameters(self):
           # Return formatted simulation parameters
           pass
   ```

---

### **2. Fetch Crypto Data**

#### **2.1 API Integration**
1. Use the **CoinGecko API** to fetch:
   - Market cap.
   - Trading volume.
   - Price changes.
   - API endpoint:
     ```
     https://api.coingecko.com/api/v3/simple/price?ids=<token-id>&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true
     ```

2. Use the **Binance API** to fetch:
   - Whale buy/sell events.
   - Detailed price change percentages.
   - API endpoint:
     ```
     https://api.binance.com/api/v3/ticker/24hr?symbol=<TOKENPAIR>
     ```

#### **2.2 Fetch Data Function**
Example function to fetch data:
```python
import requests

class Translator:
    def fetch_crypto_data(self):
        coingecko_url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true"
        binance_url = "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"

        coingecko_response = requests.get(coingecko_url).json()
        binance_response = requests.get(binance_url).json()

        return {
            "market_cap": coingecko_response["bitcoin"]["usd_market_cap"],
            "volume": coingecko_response["bitcoin"]["usd_24h_vol"],
            "price_change": binance_response["priceChangePercent"],
            "whale_events": binance_response["quoteVolume"] > 100000  # Example threshold
        }
```

---

### **3. Translate Metrics to Parameters**

#### **3.1 Define Mapping Rules**
1. **Market Cap**:
   - Growth → Increased infection radius.
   - Decline → Slower spread, faster cure progress.

2. **Trading Volume**:
   - High volume → Increased mutation rates and spread speed.
   - Low volume → Normalized transmission rates.

3. **Price Changes**:
   - Positive → Accelerated infection spread to new regions.
   - Negative → Cure development accelerates.

4. **Whale Events**:
   - Large buy → Unlock advanced transmission routes (e.g., airborne).
   - Large sell → Boost cure progress.

#### **3.2 Implement Translation Logic**
Example function:
```python
def translate_data(self, raw_data):
    parameters = {
        "infection_rate": 0.1,  # Base rate
        "mutation_rate": 0.02,  # Base mutation rate
        "cure_progress": 0.0
    }

    if raw_data["market_cap"] > 1_000_000_000:  # Example threshold
        parameters["infection_rate"] += 0.05

    if raw_data["volume"] > 500_000_000:
        parameters["mutation_rate"] += 0.03

    if float(raw_data["price_change"]) < 0:  # Negative price change
        parameters["cure_progress"] += abs(float(raw_data["price_change"])) / 100

    if raw_data["whale_events"]:
        parameters["infection_rate"] += 0.1

    return parameters
```

---

### **4. Output Simulation Parameters**
Create an API endpoint to expose translated data:
```python
from flask import Flask, jsonify
app = Flask(__name__)

translator = Translator()

@app.route("/parameters", methods=["GET"])
def get_parameters():
    raw_data = translator.fetch_crypto_data()
    parameters = translator.translate_data(raw_data)
    return jsonify(parameters)

if __name__ == "__main__":
    app.run(debug=True)
```

---

## Testing and Validation

### **1. Validate API Integration**
- Use Postman or cURL to test API calls.
- Verify data is correctly fetched from CoinGecko and Binance.

### **2. Unit Test Translation Logic**
- Mock raw data inputs and ensure outputs match expected parameters:
```python
def test_translate_data():
    translator = Translator()
    mock_data = {
        "market_cap": 2_000_000_000,
        "volume": 800_000_000,
        "price_change": "-5.0",
        "whale_events": True
    }
    parameters = translator.translate_data(mock_data)
    assert parameters["infection_rate"] > 0.1
    assert parameters["cure_progress"] > 0.0
```

---

## Deliverables
1. A fully functional **translator module** that:
   - Fetches crypto data.
   - Maps metrics to simulation parameters.
   - Exposes parameters via an API.

2. Validation results confirming accurate data mapping and output.

---

## Next Steps
Once Phase 2 is complete:
- Proceed to **Phase 3: Simulation Engine Development**, integrating the translated parameters into the simulation logic.
```

---
