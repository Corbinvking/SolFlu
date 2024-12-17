# Virus Mechanics Documentation

## Core Components

### 1. Growth State System
```javascript
const states = {
    OUTBREAK: {
        duration: 2000,    // 2 seconds
        multiplier: 2.0,   // Rapid growth
        sporeActivation: true
    },
    SETTLEMENT: {
        duration: 1500,    // 1.5 seconds
        multiplier: 0.7,   // Gentle recession
        sporeActivation: false
    },
    DORMANT: {
        duration: 750,     // 0.75 seconds
        multiplier: 1.0,   // Maintain size
        sporeActivation: true
    }
}
```

### 2. Territory Management
- Grid size: 0.005 (map units)
- Points tracked in Map structure
- Edge points tracked in Set
- Four-directional growth pattern

### 3. Growth Parameters
- Base target coverage: 200 minimum
- Market cap scaling: `marketCap / 150`
- Growth interval: 8ms
- Maximum points: 4000
- Base spread radius: 0.04

## Growth Mechanics

### 1. Spore System
```javascript
// Spore Activation Parameters
baseSporeProbability: 0.7
coverageBonus: Math.max(0, 0.3 * (1 - coverage / 2000))
maxProbability: 0.9
sporeIntensity: 1.4
```

### 2. Growth Probability
```javascript
baseProb: 0.35
growthProb = baseProb * stateMultiplier * (1 - Math.pow(coverageRatio, 1.3))
minimumGrowthProb: 0.4 (when edge points < 100)
```

### 3. Recession Control
```javascript
recessionThreshold: 1.3
recessionRate: 0.04
recessionProb = recessionRate * (coverageRatio - recessionThreshold)
```

## State Cycle

### 1. Automated Cycle
1. **OUTBREAK Phase (2s)**
   - Rapid growth (2.0x multiplier)
   - Active spore generation
   - Maximum expansion

2. **SETTLEMENT Phase (1.5s)**
   - Gentle recession (0.7x multiplier)
   - No new spores
   - Edge point cleanup

3. **DORMANT Phase (0.75s)**
   - Stable state (1.0x multiplier)
   - Limited spore activation
   - Preparation for next cycle

Total Cycle Duration: 4.25 seconds

### 2. Growth Pattern
```
OUTBREAK → Maximum expansion with new spores
    ↓
SETTLEMENT → Controlled recession at edges
    ↓
DORMANT → Brief stabilization period
    ↓
(Cycle repeats)
```

## Point Management

### 1. Edge Point System
- Points marked as edges when not fully surrounded
- Edge points become potential spores
- Minimum 100 edge points maintained
- Automatic cleanup of isolated points

### 2. Point Properties
```javascript
{
    position: [x, y],
    intensity: 1.0,
    colorIntensity: dynamic,
    isEdge: boolean,
    generation: number
}
```

### 3. Visualization Parameters
```javascript
{
    radius: 3,  // Fixed pixel size
    colorIntensity: value * growthMultiplier,
    position: [longitude, latitude]
}
```

## Implementation Notes

### 1. Key Features
- Continuous pulsing growth pattern
- Self-sustaining spore generation
- Organic, moss-like spread
- Dynamic size adaptation

### 2. Performance Optimizations
- Grid-based position tracking
- Set-based edge point management
- Efficient point removal system
- Optimized growth calculations

### 3. Safety Mechanisms
- Minimum edge point threshold (100)
- Conservative recession rate (0.04)
- Automatic cycle management
- Growth probability floors

## Usage Example

```javascript
// Initialize virus
const virus = new VirusStateMachine();
virus.initialize([longitude, latitude], {
    marketCap: 380000,
    intensity: 0.5,
    colorIntensity: 0.5
});

// Automated cycle starts automatically
// Manual controls available:
virus.boostSpread(2.0);    // Manual boost
virus.suppressSpread(0.7); // Manual suppress
```

## Troubleshooting

### Common Issues
1. **Growth Stagnation**
   - Check edge point count
   - Verify spore activation rates
   - Ensure growth probabilities > 0

2. **Unstable Cycling**
   - Verify state durations
   - Check multiplier values
   - Monitor recession rates

3. **Performance Issues**
   - Reduce point count maximum
   - Increase grid size
   - Adjust growth interval
``` 
</rewritten_file>