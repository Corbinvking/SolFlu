Here’s the **`phase3-simulation-engine.md`** file:

---

```markdown
# Phase 3: Simulation Engine Development

## Objective
The goal of this phase is to develop a **country-level simulation engine** that uses the translated crypto parameters to dynamically control infection rates, mutation rates, transmission routes, and cure progress. This engine will serve as the core logic for the system, producing real-time data for frontend visualization.

---

## Steps to Completion

### **1. Set Up the Simulation Engine**

#### **1.1 Create the Simulation Engine Module**
1. Add a new module: `simulation_engine.py`.
2. Structure the engine to include:
   - **Initialization**:
     - Load country-level metadata (population, resistance attributes).
     - Predefine transmission routes.
   - **Dynamic Updates**:
     - Adjust infection rates, mutations, and transmission probabilities based on translated parameters.
   - **Output**:
     - Produce JSON-formatted data for frontend consumption.

3. Example skeleton:
   ```python
   class SimulationEngine:
       def __init__(self):
           self.countries = {}
           self.routes = []
           self.global_stats = {
               "infected": 0,
               "deaths": 0,
               "cure_progress": 0
           }

       def initialize_countries(self, country_data):
           # Load country metadata
           pass

       def initialize_routes(self, route_data):
           # Define transmission routes
           pass

       def update_simulation(self, parameters):
           # Apply translated parameters to update infection rates
           pass

       def generate_output(self):
           # Return simulation results in JSON format
           pass
   ```

---

### **2. Initialize Country Data**

#### **2.1 Define Country Metadata**
- Store metadata for each country, including:
  - Population.
  - Infection count.
  - Death count.
  - Resistance attributes (e.g., airborne, waterborne).

- Example `country_data.json`:
  ```json
  {
      "USA": {"population": 331000000, "infected": 1000, "deaths": 10, "resistance": {"airborne": false, "waterborne": true}},
      "India": {"population": 1380000000, "infected": 500, "deaths": 5, "resistance": {"airborne": true, "waterborne": false}}
  }
  ```

#### **2.2 Load Metadata into the Engine**
Example function:
```python
def initialize_countries(self, country_data):
    for country, data in country_data.items():
        self.countries[country] = {
            "population": data["population"],
            "infected": data["infected"],
            "deaths": data["deaths"],
            "resistance": data["resistance"]
        }
```

---

### **3. Define Transmission Routes**

#### **3.1 Predefine Routes**
- Routes connect countries, enabling infection spread.
- Example `route_data.json`:
  ```json
  [
      {"from": "USA", "to": "UK", "type": "plane"},
      {"from": "India", "to": "China", "type": "cargo"}
  ]
  ```

#### **3.2 Load Routes**
Example function:
```python
def initialize_routes(self, route_data):
    self.routes = route_data
```

---

### **4. Apply Dynamic Updates**

#### **4.1 Infection and Mutation Logic**
1. **Base Infection Dynamics**:
   - Use the SIR model to calculate infection spread:
     - `S`: Susceptible population.
     - `I`: Infected population.
     - `R`: Recovered population.
   - Example equation:
     ```python
     new_infections = (beta * S * I) / population
     ```

2. **Adjust Dynamics with Parameters**:
   - Modify the base infection rate (`beta`) using the translator module's output:
     ```python
     beta = 0.1 + parameters["infection_rate"]
     mutation_rate = parameters["mutation_rate"]
     ```

3. **Transmission Routes**:
   - Spread infections between connected countries based on route type:
     ```python
     for route in self.routes:
         if route["type"] == "plane":
             spread_chance = 0.2  # Higher for planes
         elif route["type"] == "cargo":
             spread_chance = 0.1

         if random.random() < spread_chance:
             self.countries[route["to"]]["infected"] += 100  # Example value
     ```

#### **4.2 Cure Progression**
- Increment cure progress dynamically based on translator parameters:
  ```python
  self.global_stats["cure_progress"] += parameters["cure_progress"]
  ```

---

### **5. Generate Output**

#### **5.1 Prepare JSON Output**
- Consolidate global and country-level stats into a JSON structure:
```python
def generate_output(self):
    output = {
        "global": self.global_stats,
        "countries": self.countries,
        "routes": self.routes
    }
    return output
```

#### **5.2 API Endpoint**
Expose the simulation output via an API:
```python
from flask import Flask, jsonify
app = Flask(__name__)

engine = SimulationEngine()

@app.route("/simulation", methods=["GET"])
def get_simulation():
    parameters = translator.get_simulation_parameters()
    engine.update_simulation(parameters)
    return jsonify(engine.generate_output())

if __name__ == "__main__":
    app.run(debug=True)
```

---

## Testing and Validation

### **1. Unit Test Core Functions**
- Test initialization, route loading, and infection updates:
```python
def test_initialize_countries():
    engine = SimulationEngine()
    engine.initialize_countries(mock_country_data)
    assert "USA" in engine.countries

def test_update_simulation():
    engine = SimulationEngine()
    engine.update_simulation(mock_parameters)
    assert engine.global_stats["infected"] > 0
```

### **2. Validate Output Format**
- Use Postman or cURL to fetch simulation results and ensure JSON format correctness.

### **3. Performance Testing**
- Simulate high-frequency updates to ensure stability and responsiveness.

---

## Deliverables
1. A fully functional **simulation engine** that:
   - Processes country-level infection dynamics.
   - Integrates transmission routes and mutation attributes.
   - Adjusts dynamically based on translator parameters.

2. API endpoints exposing real-time simulation data.

---

## Next Steps
Once Phase 3 is complete:
- Proceed to **Phase 4: Data Integration**, connecting the simulation engine's output to the frontend visualization.
```

---
