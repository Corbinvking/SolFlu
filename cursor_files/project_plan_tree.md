Live Simulation System
├── Crypto Data Sources
│   ├── CoinGecko API
│   │   ├── Market Cap
│   │   ├── Trading Volume
│   │   └── Price Changes
│   ├── Binance API
│   │   ├── Whale Events
│   │   ├── Price Percent Change
│   │   └── 24hr Volume
│   └── Future Data Sources (e.g., On-Chain Metrics)
│
├── Translator Module
│   ├── Fetches Crypto Data from APIs
│   ├── Maps Metrics to Simulation Parameters
│   │   ├── Infection Rate (e.g., Market Cap ↑ → Infection Spread ↑)
│   │   ├── Mutation Rate (e.g., High Volume → Faster Mutation)
│   │   ├── Cure Progress (e.g., Price Drops → Cure Development ↑)
│   │   └── Transmission Dynamics (e.g., Whale Events → Advanced Routes)
│   └── Outputs Simulation Parameters to Engine
│
├── Simulation Engine
│   ├── Core Logic
│   │   ├── Infection Spread (Country-Level Dynamics)
│   │   ├── Mutation Behavior (Dynamic Resistance Attributes)
│   │   └── Cure Progression (Based on Translator Parameters)
│   ├── Transmission Routes
│   │   ├── Planes (Fast, Long Distance)
│   │   └── Cargo (Broad, Slow Spread)
│   └── Generates JSON Output for Frontend
│       ├── Global Stats (Total Infected, Deaths, Cure Progress)
│       ├── Country-Specific Stats (Infected, Deaths, Resistance)
│       └── Active Transmission Routes (Connections Between Regions)
│
├── Frontend Visualization
│   ├── Interactive Map (Built with spread.gl)
│   │   ├── Heatmap Layers (Infection Zones)
│   │   ├── Arc Layers (Transmission Routes)
│   │   └── Clickable Countries (Display Stats in Side Panel)
│   ├── Real-Time Updates
│   │   ├── Periodic API Fetch (For MVP)
│   │   └── WebSocket Integration (For Smooth Updates)
│   └── User Interaction
│       ├── Click for Stats (In MVP)
│       ├── Voting System (Future Feature)
│       └── Event Triggers (Future Feature)
│
└── Hosting and Deployment
    ├── Backend Hosting
    │   ├── AWS EC2 or Heroku (API and WebSocket Hosting)
    │   └── Dockerized Deployment
    ├── Frontend Hosting
    │   ├── Vercel or Netlify (React App Deployment)
    │   └── Environment Variable Configuration
    └── Security and Monitoring
        ├── Cloudflare for SSL and DNS Management
        ├── Sentry for Error Tracking
        └── Performance Monitoring (e.g., AWS CloudWatch)
