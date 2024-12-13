# Frontend Overview

## Objective
The frontend for the live simulation system will focus on delivering a highly visual and animated user experience. The MVP will prioritize functionality and responsiveness, with a dark mode theme to create a data-centric, immersive environment. The interface will include multiple interactive pages, dynamic real-time updates, and simulated data streams to engage users.

---

## Aesthetic and Theme
- **Visual Style**: 
  - Highly visual, animated, and engaging.
  - Dark mode only for the MVP.
  - A focus on dynamic elements like animations and real-time updates to keep the interface alive and immersive.

- **Framework and Tools**:
  - **React.js**: For building interactive and reusable UI components.
  - **Tailwind CSS**: A utility-first styling framework for fast and consistent development.
  - **GSAP**: For animations and transitions (where necessary).

---

## Key Pages and Layout

### 1. **Map Page (Core Focus)**
- **Main Features**:
  - Large interactive map (using spread.gl or a similar mapping library).
  - Infection heatmap layers, animated routes, and clickable countries.
  - Side panel for country-specific stats (appears on click).
- **Layout**:
  - Full-screen map with a top navigation bar.
  - Minimal UI to keep the map as the focal point.
- **Real-Time Updates**:
  - Constant updates to infection zones and routes using WebSocket or periodic API fetches.

### 2. **Live Trading DOM Page**
- **Main Features**:
  - A scrolling stream of live user interactions (simulated for MVP).
  - Metrics to include:
    - Recent "trades" (fake user interactions).
    - Largest "whale events."
    - Market cap and volume updates.
  - Data for MVP:
    - Use an LLM to generate pseudo-random live events to simulate user activity.
- **Layout**:
  - Vertical scrolling DOM in the center with side panels for detailed stats.

### 3. **Mutation/Transmission/Ability Voting Page**
- **Main Features**:
  - Display current virus mutations, transmission types, and abilities.
  - Users can vote on one of three mutation paths.
  - Mutation effects dynamically update stats displayed on the page.
- **Layout**:
  - Split layout:
    - Left: Description and impact of current mutations.
    - Right: Voting panel for upcoming mutations.

### 4. **Whitepaper Documentation Page**
- Simple page linking to the whitepaper and providing context for the project.

---

## Navigation and UX

### **Top Navigation Bar**
- Fixed navigation for easy access to core pages.
- Items to include:
  - "Map" (Default view).
  - "Live DOM."
  - "Mutations & Abilities."
  - "Whitepaper."

### **Responsiveness**
- Fully responsive design with a priority on mobile optimization.
- Collapse the top navigation bar into a hamburger menu for smaller screens.

---

## Real-Time Updates

### **Strategy**
- Use WebSocket streams for real-time updates wherever possible.
- For MVP, fall back to periodic API fetches (e.g., every 2–5 seconds) if WebSockets prove too complex initially.

### **Frequency**
- Map updates: Every 2 seconds.
- DOM updates: Continuous scrolling stream.
- Mutation updates: Triggered upon user votes or simulation milestones.

---

## Data Generation and Interaction

### **Live Trading DOM**
- Generate fake user interactions via an LLM for MVP:
  - Example: "User A just sold 10,000 $VIRUS tokens."
- Display as a scrolling ticker.
- Include random "whale events" and market shifts.

### **AI-Generated News Ticker**
- Generate semi-humorous, location-based news tied to the simulation.
  - Example: "The virus has shut down all airports in London. Travelers advised to stay home!"
- Use an LLM to dynamically generate news headlines based on the simulation’s progression.

---

## Tools and Libraries

### **Frameworks**
- **React.js**: Core frontend framework.
- **React Router**: For seamless navigation between pages.

### **Styling**
- **Tailwind CSS**: Lightweight and flexible.
- **CSS Grid/Flexbox**: For responsive layouts.

### **Visualization**
- **spread.gl**: For the interactive map.
- **react-leaflet**: As a fallback if spread.gl is too complex for MVP.

### **Animations**
- **GSAP**: Smooth animations for DOM elements and page transitions.

### **Data Handling**
- **Socket.io-client**: For WebSocket communication.
- **axios**: For periodic API fetches.

---

## Accessibility and Best Practices

### **Accessibility**
- Follow WCAG standards for dark mode contrast.
- Use semantic HTML and ARIA roles where applicable.

### **Performance**
- Optimize image and map tile loading using lazy loading techniques.
- Minimize animation overhead on mobile devices.

---

## Development Phases

### **Phase 1: Map Page**
- Set up the interactive map with infection heatmaps and routes.
- Add country click functionality for stats display.

### **Phase 2: Live DOM Page**
- Create a scrolling DOM for simulated user interactions.
- Implement fake data generation using an LLM.

### **Phase 3: Mutation Voting Page**
- Display mutation options and current virus attributes.
- Add a voting mechanism with results dynamically displayed.

### **Phase 4: AI-Generated News**
- Implement a ticker for semi-humorous news based on simulation progress.

### **Phase 5: Navigation and Responsiveness**
- Build the top navigation bar and ensure full responsiveness.

---
