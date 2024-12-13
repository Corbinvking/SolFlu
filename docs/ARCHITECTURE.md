# SolFlu Visualization Architecture

## Core Components

### 1. Layer Management System
The layer management system handles the visualization of virus spread and transportation routes.

#### Key Components:
- `LayerManager`: Central class managing all visualization layers
- Layer Types:
  - Heatmap Layer: Virus spread visualization
  - Point Layer: Transportation hubs
  - Arc Layer: Transportation routes

```javascript
// Example Layer Structure
{
  heatmap: HeatmapLayer {
    id: 'test-heatmap',
    data: spreadPoints,
    getPosition: d => d.coordinates,
    getWeight: d => d.weight
  },
  points: ScatterplotLayer {
    id: 'test-points',
    data: routePoints,
    getPosition: d => d.position
  },
  arcs: ArcLayer {
    id: 'test-arcs',
    data: routes,
    getSourcePosition: d => d.source,
    getTargetPosition: d => d.target
  }
}
```

### 2. Animation Pipeline
The animation system provides continuous updates for dynamic visualizations.

#### Components:
- `AnimationController`: Manages animation state and timing
- `RequestAnimationFrame` loop: Ensures smooth updates
- Layer-specific animation handlers

```javascript
// Animation Lifecycle
1. Initialize AnimationController
2. Set animation parameters (duration, loop)
3. Start animation loop
4. Update layer properties
5. Trigger re-render
```

### 3. Component Architecture

#### Main Components:
- `Test.js`: Main visualization component
- `layer-manager.js`: Layer management system
- `animation-utils.js`: Animation utilities

#### Data Flow:
```
LayerManager
  ↓
Animation Controller
  ↓
Layer Updates
  ↓
React Component
  ↓
DeckGL Render
```

### 4. Integration Points

#### Backend Integration:
- Route data input format:
```javascript
{
  routes: [
    {
      source: [longitude, latitude],
      target: [longitude, latitude],
      type: 'air|ship',
      intensity: 0.0-1.0
    }
  ]
}
```

#### Visualization Updates:
- Real-time data updates
- Layer property modifications
- Animation state changes

## Performance Considerations

### 1. Render Optimization
- Layer updates batched for efficiency
- Animation frame management
- WebGL context handling

### 2. Memory Management
- Layer cleanup on unmount
- Animation frame cancellation
- Resource disposal

### 3. State Management
- Efficient React state updates
- Layer property caching
- Animation state tracking

## Testing Strategy

### 1. Component Testing
- Layer creation/deletion
- Animation lifecycle
- Property updates

### 2. Integration Testing
- Full visualization pipeline
- Data flow validation
- Performance benchmarks

### 3. Performance Testing
- Frame rate monitoring
- Memory usage tracking
- Animation smoothness 