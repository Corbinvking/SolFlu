Here’s the **`phase1-setup.md`** file:

---

```markdown
# Phase 1: Forking and Simplifying spread.gl

## Objective
The goal of Phase 1 is to set up the development environment and modify the spread.gl framework to focus solely on the project’s requirements. This includes removing unnecessary components and preparing the base visualization for integration with the backend simulation data.

---

## Steps to Completion

### **1. Fork and Clone the Repository**
1. Navigate to the [spread.gl GitHub repository](https://github.com/GuyBaele/SpreadGL).
2. Fork the repository to your GitHub account.
3. Clone the repository locally:
   ```bash
   git clone https://github.com/corbinvking/spread.gl.git
   cd spread.gl
   ```

### **2. Install Dependencies**
1. Ensure **Node.js** (v16 or above) and **npm** are installed.
2. Install project dependencies:
   ```bash
   npm install
   ```

### **3. Run the Development Environment**
1. Start the development server to verify the initial setup:
   ```bash
   npm start
   ```
2. Open `http://localhost:8080` in your browser to confirm the application is running.

### **4. Simplify the Codebase**
Focus on removing components and dependencies not relevant to the project.

#### **4.1 Remove Phylogenetic Parsing Logic**
- Locate and remove any code or modules related to:
  - Phylogeographic reconstructions.
  - Advanced trait mapping or KML file generation.

#### **4.2 Retain Map and Visualization Features**
- Ensure the following features remain functional:
  - **Map Rendering**: Keep GeoJSON support for country boundaries and infection zones.
  - **Dynamic Layers**: Retain the ability to add/remove heatmaps, arcs, and point layers.
  - **Animations**: Preserve animation capabilities for transmission routes (e.g., planes, ships).

#### **4.3 Modularize Layer Management**
- Refactor the code to simplify layer management, allowing:
  - Infection zones (heatmaps or shaded regions).
  - Transmission routes (animated arcs for planes and cargo).
  - Interactive country elements (clickable stats display).

### **5. Configure Base Map**
1. Replace any default datasets with placeholders for dynamic backend data:
   - Infection zones: Initialize with empty GeoJSON layers.
   - Routes: Add a dummy set of routes to test animations.

2. Ensure the map uses a tile server for base rendering:
   - Default to **Mapbox** or **OpenStreetMap** for simplicity:
     ```javascript
     import { MapContainer, TileLayer } from 'react-leaflet';

     const Map = () => (
       <MapContainer center={[0, 0]} zoom={2} style={{ height: "100vh" }}>
         <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
       </MapContainer>
     );
     export default Map;
     ```

---

## Testing and Validation

### **1. Verify Simplified Map Functionality**
- Ensure the map renders correctly and remains responsive.
- Test the addition and removal of dummy layers (e.g., infection zones and routes).

### **2. Validate Interactivity**
- Add placeholders for clickable countries and verify click events are registered.

### **3. Push Changes to Repository**
- Commit and push changes to your forked repository:
   ```bash
   git add .
   git commit -m "Simplified spread.gl for project requirements"
   git push origin main
   ```

---

## Deliverables
1. A simplified version of spread.gl with:
   - Map rendering.
   - Support for dynamic layers and animations.
   - Placeholder data for testing.

2. Initial scaffolding for backend integration:
   - Infection zones (heatmaps).
   - Transmission routes (arcs).

---

## Next Steps
Once Phase 1 is complete:
- Proceed to **Phase 2: Translator Module Development** to ingest and process crypto market data into simulation parameters.
```

---
