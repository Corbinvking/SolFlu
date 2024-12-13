# Phase Overview

## Purpose
This document provides a detailed breakdown of the development phases for the live simulation project. Each phase is designed to incrementally build towards the MVP, ensuring that critical functionality is prioritized and delivered within a **1.5-week timeframe**. The development team consists of:
- **Human CEO**: Oversees project direction and decisions.
- **AI CTO**: Provides technical guidance and planning.
- **AI Development Agent**: Executes coding tasks and implements features.

---

## Phase Summary

### **Phase 1: Forking and Simplifying spread.gl**
- **Objective**:
  - Fork the spread.gl GitHub repository.
  - Simplify the framework to focus on:
    - Map rendering.
    - Dynamic layer updates.
    - Animations for transmission routes.

- **Key Deliverables**:
  - A stripped-down, working version of spread.gl.
  - Initial scaffolding for backend data integration.

- **Duration**: **Day 1** (Full day)

---

### **Phase 2: Translator Module Development**
- **Objective**:
  - Create a module that dynamically translates real-time cryptocurrency metrics into simulation parameters.
  - Define thresholds and mapping rules for market cap, volume, price changes, and whale events.

- **Key Deliverables**:
  - A functional translator module ready to interface with the simulation engine.
  - Real-time data ingestion from CoinGecko and Binance APIs.

- **Duration**: **Day 2–3**

---

### **Phase 3: Simulation Engine Development**
- **Objective**:
  - Build a country-level simulation engine based on the SIR model.
  - Integrate transmission routes and mutation attributes driven by translator outputs.

- **Key Deliverables**:
  - Backend APIs for:
    - Infection data (`/infection`).
    - Transmission routes (`/routes`).
  - JSON-formatted outputs ready for frontend visualization.

- **Duration**: **Day 4–5**

---

### **Phase 4: Data Integration**
- **Objective**:
  - Connect the backend simulation engine to the frontend.
  - Implement data fetching mechanisms using REST APIs (MVP) or WebSockets.

- **Key Deliverables**:
  - Real-time data updates displayed on the map.
  - Heatmaps for infection zones and animated transmission routes.

- **Duration**: **Day 6**

---

### **Phase 5: Deployment**
- **Objective**:
  - Deploy the complete simulation system (backend and frontend) on hosting platforms for public access.

- **Key Deliverables**:
  - Backend hosted on AWS or Heroku.
  - Frontend hosted on Vercel or Netlify.
  - Domain with SSL configured via Cloudflare.

- **Duration**: **Day 7**

---

## Development Timeline

| **Phase**           | **Duration**       | **Key Milestones**                           |
|----------------------|--------------------|----------------------------------------------|
| Phase 1: Setup       | Day 1             | Fork and simplify spread.gl.                 |
| Phase 2: Translator  | Day 2–3           | Build and validate translator module.         |
| Phase 3: Simulation  | Day 4–5           | Implement and test simulation engine.         |
| Phase 4: Integration | Day 6             | Connect backend data to frontend.             |
| Phase 5: Deployment  | Day 7             | Deploy and validate the full MVP system.      |

---

## Collaboration and Responsibilities

### **Human CEO**
- Approves high-level decisions, including timelines, priorities, and MVP validation.

### **AI CTO**
- Oversees technical strategy and ensures alignment across all development phases.
- Provides guidance on simplifying spread.gl, designing the translator module, and structuring the simulation engine.

### **AI Development Agent**
- Executes tasks such as coding, testing, and deploying the backend, translator module, and frontend integrations.
- Implements modular, scalable components for future enhancements.

---

## Summary
The project is structured into five distinct phases, each with clear objectives and deliverables. The team’s AI-driven efficiency ensures the project will be completed in **1.5 weeks** while maintaining scalability and modularity for future features.

