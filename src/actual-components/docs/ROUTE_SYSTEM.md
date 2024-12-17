# Route System Documentation

## Overview
The Route System is a comprehensive visualization system built on DeckGL that manages and displays animated transportation routes on a global map. It consists of four main components:
1. Route paths (dotted lines)
2. Vehicle icons (planes and ships)
3. Endpoint markers (A-B for planes, C-D for ships)
4. Label system for endpoints

## Components Breakdown

### 1. Icon System
```javascript
setupIconAtlas() {
    // Canvas setup: 64x32 pixels, two 32x32 icons side by side
    // Left half: Plane icon (0-31 x coordinates)
    // Right half: Ship icon (32-63 x coordinates)
}
```

#### Plane Icon (Triangle with Wings)
- Main triangle dimensions:
  - Top point: (16, 6)
  - Bottom left: (4, 26)
  - Bottom right: (28, 26)
- Wing details:
  - Left point: (12, 20)
  - Center: (20, 20)
  - Top: (16, 14)
- Color: White fill with black outline
- Stroke width: 1 pixel

#### Ship Icon (Boat Shape)
- Dimensions:
  - Bottom left: (36, 20)
  - Front point: (42, 8)
  - Top right: (56, 8)
  - Bottom right: (60, 20)
- Color: White fill with black outline
- Stroke width: 1 pixel

### 2. Route Path System
```javascript
createPathLayer() {
    // PathLayer configuration
    widthScale: 1,
    widthMinPixels: 2,
    widthMaxPixels: 4,
    getDashArray: [6, 4]  // 6 pixels line, 4 pixels gap
}
```

#### Path Properties
- Color: White
- Width: 2 pixels
- Style: Dotted (6px dash, 4px gap)
- Depth test disabled for visibility

### 3. Endpoint System

#### Visual Properties
- Planes (A-B):
  - Color: Orange [255, 165, 0]
  - Labels: A1-B1, A2-B2, etc.
- Ships (C-D):
  - Color: Blue [0, 191, 255]
  - Labels: C1-D1, C2-D2, etc.

#### Endpoint Markers
```javascript
ScatterplotLayer {
    radiusMinPixels: 6,
    radiusMaxPixels: 12,
    lineWidthMinPixels: 2,
    opacity: 0.8
}
```

#### Label System
```javascript
TextLayer {
    getSize: 14,
    getColor: [255, 255, 255],
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center'
}
```

### 4. Animation System

#### Vehicle Properties
```javascript
{
    type: 'plane'|'ship',
    start: [longitude, latitude],
    end: [longitude, latitude],
    progress: 0-1,
    speed: float,
    isReturning: boolean,
    lastUpdate: timestamp
}
```

#### Speed Configuration
- Planes:
  - NY-London: 0.5 units/second
  - Tokyo-SF: 0.4 units/second
- Ships:
  - LA-Tokyo: 0.3 units/second
  - Rotterdam-NY: 0.25 units/second

#### Animation Logic
1. Progress Calculation:
```javascript
scaledDelta = deltaTime * vehicle.speed;
vehicle.progress += scaledDelta;
```

2. Position Interpolation:
```javascript
pos = [
    fromPoint[0] + (toPoint[0] - fromPoint[0]) * progress,
    fromPoint[1] + (toPoint[1] - fromPoint[1]) * progress
];
```

3. Direction Reversal:
```javascript
if (progress >= 1) {
    isReturning = !isReturning;
    progress = 0;
    speed *= 0.9 + Math.random() * 0.2;  // ±10% variation
}
```

### 5. Layer Management

#### Layer Order (bottom to top):
1. Path Layer (routes)
2. Endpoint Layer (dots)
3. Label Layer (text)
4. Vehicle Layer (icons)

#### Update Triggers
```javascript
updateTriggers: {
    getPosition: [Date.now()],
    getAngle: [Date.now()]
}
```

## Implementation Guide

### 1. Route Definition
```javascript
addRoute(type, start, end, speed) {
    // type: 'plane' or 'ship'
    // start: [longitude, latitude]
    // end: [longitude, latitude]
    // speed: movement units per second
}
```

### 2. Performance Optimization
- Layer updates only when needed (progress change > 0.001)
- Conditional layer recreation
- Depth test disabled for better rendering
- Update triggers for smooth animation

### 3. Coordinate System
- Uses Mercator projection
- Coordinates in [longitude, latitude] format
- Interpolation handles wraparound for trans-Pacific routes

## Example Route Configuration
```javascript
// Air Routes
['plane', [-74.006, 40.7128], [0.1278, 51.5074], 0.5]  // NY-London
['plane', [139.6917, 35.6895], [-122.4194, 37.7749], 0.4]  // Tokyo-SF

// Sea Routes
['ship', [-118.2437, 34.0522], [139.6917, 35.6895], 0.3]  // LA-Tokyo
['ship', [4.4000, 51.9000], [-74.006, 40.7128], 0.25]  // Rotterdam-NY
```

## Interaction System
- Clickable endpoints with route information
- Event handling for future expansions
- Debug logging for development

## Future Enhancements
1. Route traffic density visualization
2. Weather impact integration
3. Dynamic speed adjustments
4. Interactive route creation
5. Enhanced endpoint interactions

## Dependencies
- @deck.gl/layers
- @deck.gl/core
- react-map-gl 