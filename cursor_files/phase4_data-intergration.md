Here’s the **`phase4-data-integration.md`** file:

---

```markdown
# Phase 4: Data Integration

## Objective
The goal of this phase is to connect the simulation engine’s output to the frontend visualization. This involves ensuring real-time data flow from the backend to the frontend and rendering the simulation results dynamically on the map.

---

## Steps to Completion

### **1. Backend API Setup**

#### **1.1 Real-Time Data Endpoint**
- Create an endpoint to serve real-time simulation data:
  ```python
  @app.route("/simulation", methods=["GET"])
  def get_simulation():
      parameters = translator.get_simulation_parameters()
      engine.update_simulation(parameters)
      return jsonify(engine.generate_output())
  ```

#### **1.2 WebSocket Integration (Optional for MVP)**
- Implement WebSocket support for continuous updates:
  ```python
  from flask_socketio import SocketIO, emit

  socketio = SocketIO(app)

  @socketio.on("connect")
  def handle_connect():
      emit("simulation_update", engine.generate_output())

  def send_periodic_updates():
      while True:
          parameters = translator.get_simulation_parameters()
          engine.update_simulation(parameters)
          socketio.emit("simulation_update", engine.generate_output())
          time.sleep(5)  # Example update interval
  ```

- Start the WebSocket server:
  ```python
  if __name__ == "__main__":
      socketio.run(app, debug=True)
  ```

---

### **2. Frontend Integration**

#### **2.1 Fetch Simulation Data**
- Use REST APIs for MVP or WebSocket streams for smoother updates.

##### **REST API Fetch Example**:
1. Create a service to fetch data:
   ```javascript
   const fetchSimulationData = async () => {
       const response = await fetch("http://localhost:5000/simulation");
       const data = await response.json();
       return data;
   };
   ```

2. Set up periodic updates in React:
   ```javascript
   useEffect(() => {
       const interval = setInterval(async () => {
           const data = await fetchSimulationData();
           updateMapLayers(data);
       }, 5000); // Fetch every 5 seconds
       return () => clearInterval(interval);
   }, []);
   ```

##### **WebSocket Stream Example**:
1. Set up a WebSocket connection:
   ```javascript
   const socket = io("http://localhost:5000");

   useEffect(() => {
       socket.on("simulation_update", (data) => {
           updateMapLayers(data);
       });
       return () => socket.disconnect();
   }, []);
   ```

---

#### **2.2 Map Integration**
- Use **spread.gl** or **react-leaflet** to render simulation data dynamically on the map.

##### **Add Infection Zones**
- Render infection zones as heatmaps or choropleth layers:
   ```javascript
   const addInfectionLayer = (countries) => {
       return countries.map((country) => ({
           id: country.name,
           geometry: country.boundaries, // GeoJSON
           properties: {
               intensity: country.infected / country.population
           }
       }));
   };
   ```

- Update the map layer:
   ```javascript
   const updateInfectionLayer = (map, countries) => {
       const data = addInfectionLayer(countries);
       map.addLayer(new HeatmapLayer({ data }));
   };
   ```

##### **Animate Transmission Routes**
- Use arcs to visualize active transmission routes:
   ```javascript
   const addRoutesLayer = (routes) => {
       return routes.map((route) => ({
           sourcePosition: route.fromCoordinates,
           targetPosition: route.toCoordinates,
           color: [255, 0, 0], // Red arcs
           width: 2
       }));
   };
   ```

- Update the map layer:
   ```javascript
   const updateRoutesLayer = (map, routes) => {
       const data = addRoutesLayer(routes);
       map.addLayer(new ArcLayer({ data }));
   };
   ```

##### **Country Interactivity**
- Add click events to display stats for a selected country:
   ```javascript
   const handleCountryClick = (country) => {
       setSelectedCountry(country);
   };
   ```

- Display stats in a side panel or modal:
   ```javascript
   const CountryStats = ({ country }) => (
       <div>
           <h2>{country.name}</h2>
           <p>Infected: {country.infected}</p>
           <p>Deaths: {country.deaths}</p>
           <p>Mutation Rate: {country.mutation_rate}</p>
       </div>
   );
   ```

---

### **3. Testing and Validation**

#### **3.1 Backend Testing**
- Validate the `/simulation` endpoint for:
  - Correct JSON structure.
  - Dynamic updates based on translator module output.
- Test WebSocket connections using a client like **Socket.io Debugger** or **Postman**.

#### **3.2 Frontend Testing**
- Verify:
  - Infection zones update correctly on the map.
  - Transmission routes animate smoothly.
  - Click events display accurate country stats.

#### **3.3 Integration Testing**
- Simulate end-to-end data flow:
  - Mock crypto API responses → Translator Module → Simulation Engine → Frontend Map.
- Perform load testing to ensure smooth updates at scale.

---

## Deliverables
1. Real-time data flow established between backend and frontend.
2. Functional map visualization with:
   - Dynamic infection zones.
   - Animated transmission routes.
   - Clickable countries with detailed stats.
3. Validated performance and integration.

---

## Next Steps
Once Phase 4 is complete:
- Proceed to **Phase 5: Deployment**, hosting the backend and frontend for public access.
```

---
