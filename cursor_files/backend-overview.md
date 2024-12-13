# Project Overview

## Purpose
This document serves as a foundational reference for the development of a live, interactive virus simulation system. The simulation is dynamically influenced by cryptocurrency market metrics, designed to demonstrate how real-time market performance can drive complex simulations. The primary focus is on building a modular and scalable MVP, with well-documented components that facilitate seamless integration and future expansion.

---

## Core Objectives
1. **Real-Time Data Integration**:
   - Build a pipeline that ingests cryptocurrency market data (e.g., market cap, trading volume, whale events) in real-time.
   - Translate these metrics into simulation parameters that adjust virus behavior dynamically.

2. **Simulation Engine**:
   - Develop a country-level simulation engine with attributes such as:
     - Infection rates and intensities.
     - Mutation dynamics and resistance attributes.
     - Predefined transmission routes (planes, cargo, etc.).
   - Generate real-time outputs ready for frontend visualization.

3. **Frontend Visualization**:
   - Use **spread.gl** as the base framework for rendering the global map.
   - Simplify where necessary to focus on:
     - Real-time updates of infection zones.
     - Animations for transmission routes.
     - Clickable countries displaying infection statistics and other relevant data.

4. **Future Scalability**:
   - Build modular components for the translator module, simulation engine, and frontend visualization to allow:
     - New crypto metrics or features to be added easily.
     - More detailed infection dynamics (e.g., airborne/waterborne transmission).
     - Advanced interactive features (e.g., user voting, live tokenomics).

---

## System Architecture Overview

### **Data Flow**
1. **Crypto Market Data**:
   - Ingested via APIs (e.g., CoinGecko, Binance).
   - Metrics include market cap, trading volume, price changes, and whale events.

2. **Translator Module**:
   - Maps raw crypto metrics to predefined simulation parameters using dynamic thresholds.
   - Example:
     - Market cap increase → Faster infection spread.
     - Price drop → Increased cure progress.

3. **Simulation Engine**:
   - Processes translated parameters to simulate virus behavior at the country level.
   - Outputs include infection data, transmission routes, and mutation details.

4. **Frontend Visualization**:
   - Fetches real-time data from the simulation engine.
   - Displays infection zones, transmission routes, and region-specific stats on an interactive map.

---

## Key Features

### **1. Translator Module**
- Dynamically maps crypto data to simulation parameters.
- Example mappings:
  - Market cap growth → Larger infection radius.
  - High trading volume → Increased mutation rates.
  - Whale buy events → Unlock advanced transmission routes (e.g., airborne).

### **2. Simulation Engine**
- Core attributes:
  - **Country-level dynamics**:
    - Infection rates, deaths, cure progress.
  - **Transmission routes**:
    - Predefined for MVP (e.g., major cargo and air routes).
  - **Mutation mechanics**:
    - Base mutation rates, with future expansion for specific traits (e.g., airborne spread).

- Output format:
  - JSON structure containing global and regional statistics, ready for frontend consumption.

### **3. Frontend Integration**
- Simplified **spread.gl**-based map:
  - Heatmaps for infection zones.
  - Animated arcs for transmission routes.
  - Clickable countries with detailed stats.

- Real-time data updates:
  - Use periodic API polling for MVP.
  - Transition to WebSocket-based updates for smoother performance in future iterations.

---

## Development Scope

### **Phase 1: Forking and Simplifying spread.gl**
- Fork the spread.gl repository.
- Remove unused components related to phylogeographic reconstructions.
- Retain:
  - Map rendering with multi-layered capabilities.
  - Animation support for dynamic elements like routes.

### **Phase 2: Translator Module Development**
- Ingest live crypto data using APIs.
- Map metrics to simulation parameters using configurable thresholds.

### **Phase 3: Simulation Engine**
- Implement a simplified SIR-based simulation at the country level.
- Add attributes for transmission and mutation mechanics.

### **Phase 4: Frontend Data Integration**
- Connect the simulation output to the frontend via REST APIs.
- Render infection zones, routes, and stats on the interactive map.

---

## Deliverables
1. **Backend**:
   - A modular simulation engine connected to a dynamic translator module.
   - APIs to expose simulation data to the frontend.

2. **Frontend**:
   - An interactive map built on a simplified spread.gl framework.
   - Real-time updates and basic interactivity (e.g., country click events).

3. **Deployment**:
   - A hosted website showcasing the live simulation.

---

## Development Goals
1. Ensure modularity for future expansions (e.g., tokenomics, voting).
2. Focus on delivering core functionality for the MVP.
3. Optimize the system for real-time data flow and visualization.

