# Virus Spread Mechanics Documentation

## Core Components

### 1. Territory Management
```javascript
class Territory {
    constructor(gridSize = 0.005) {
        this.points = new Map();  // Grid-based point storage
        this.edges = new Set();   // Track edge points for growth
        this.gridSize = gridSize; // Controls spread granularity
        this.coverage = 0;        // Total territory coverage
    }
}
```
The territory system uses a grid-based approach where each point occupies a discrete cell. This ensures:
- Consistent spread patterns
- Efficient neighbor checking
- Natural-looking growth boundaries

### 2. Growth Dynamics

#### Market Cap Scaling
```javascript
const scaledMarketCap = Math.log10(Math.max(100, this.params.marketCap)) * 1000;
const baseTargetCoverage = Math.max(20, Math.floor(scaledMarketCap));
```
- Logarithmic scaling prevents exponential growth
- Minimum threshold ensures initial spread
- Smooth scaling across different market cap ranges

#### Dynamic Growth Probability
```javascript
const coverageRatio = this.territory.coverage / targetCoverage;
const baseGrowthProbability = 0.3 * (1 - coverageRatio);
const adjustedProbability = baseGrowthProbability * this.params.growthMultiplier;
```
Key features:
- Self-regulating growth based on current coverage
- Slows down as it approaches target
- Responsive to boost/suppress multipliers

## Boost/Suppress Mechanics

### 1. Growth Multiplier System
```javascript
boostSpread(multiplier) {
    this.params.growthMultiplier = multiplier;  // Typically 2.0
    this.growthTimeout = setTimeout(() => {
        this.params.growthMultiplier = 1.0;
    }, 5000);
}
```
Effects:
- Temporarily modifies growth probability
- Affects target coverage calculation
- Auto-resets after duration

### 2. Territory Expansion

#### Edge Point Management
```javascript
isPointSurrounded(position) {
    return [
        [x + this.gridSize, y],
        [x - this.gridSize, y],
        [x, y + this.gridSize],
        [x, y - this.gridSize]
    ].every(pos => this.points.has(this.getGridKey(pos)));
}
```
- Tracks points available for growth
- Maintains organic spread pattern
- Enables multi-directional growth

#### Growth Pattern Control
```javascript
getNeighborPositions(position) {
    const [x, y] = position;
    return [
        [x + this.gridSize, y],
        [x - this.gridSize, y],
        [x, y + this.gridSize],
        [x, y - this.gridSize]
    ].filter(pos => !this.points.has(this.getGridKey(pos)));
}
```
Features:
- Grid-aligned growth
- Natural-looking spread
- Prevents overlapping

## Bloom Cascade System

### 1. Edge Point Activation
```javascript
const edgePoints = Array.from(this.territory.edges)
    .map(key => this.territory.points.get(key))
    .filter(point => point.isEdge);
```
The bloom cascade begins at the territory edges:
- Each point marked as an edge point becomes a potential growth site
- Edge points are tracked in a dedicated Set for efficient access
- Only active edge points participate in the growth cycle

### 2. Cascade Mechanics
```javascript
edgePoints.forEach(point => {
    if (Math.random() < adjustedProbability) {
        const availablePositions = this.territory.getNeighborPositions(point.position);
        if (availablePositions.length > 0) {
            const newPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
            const newPoint = new VirusPoint(newPosition, 1.0, this.params.colorIntensity);
            this.points.push(newPoint);
            this.territory.addPoint(newPoint);
        }
    }
});
```
Key cascade features:
- Each new point becomes an immediate growth candidate
- Growth occurs in multiple directions simultaneously
- New points inherit the boosted growth probability
- Creates organic, moss-like spread patterns

### 3. Multi-Origin Growth
The bloom system enables sophisticated spread patterns:
- Multiple independent growth centers
- Natural territory merging
- Organic spread patterns
- Self-regulating growth boundaries

### 4. Boost-Triggered Blooms
During boost operations:
1. Growth probability is amplified across all edge points
2. New points immediately participate in growth
3. Creates cascading growth patterns
4. Forms natural-looking territory expansion

### 5. Territory Formation
```javascript
isPointSurrounded(position) {
    // Check all adjacent positions
    return [
        [x + this.gridSize, y],
        [x - this.gridSize, y],
        [x, y + this.gridSize],
        [x, y - this.gridSize]
    ].every(pos => this.points.has(this.getGridKey(pos)));
}
```
Territory management during blooms:
- Automatic detection of surrounded points
- Dynamic edge point status updates
- Seamless territory merging
- Maintains spread consistency

### 6. Growth Control
```javascript
const coverageRatio = this.territory.coverage / targetCoverage;
const baseGrowthProbability = 0.3 * (1 - coverageRatio);
const adjustedProbability = baseGrowthProbability * this.params.growthMultiplier;
```
Bloom intensity is regulated by:
- Current territory coverage
- Market cap scaling
- Boost multiplier
- Base growth probability

## Visual Effects

### 1. Color Intensity
```javascript
getFillColor: d => [
    255, // Red base
    Math.min(255, d.colorIntensity * 255), // Green (volatility)
    0,   // Blue
    255  // Alpha
]
```
- Color reflects market volatility
- Smooth transitions
- Visual feedback for state changes

### 2. Point Management
```javascript
class VirusPoint {
    constructor(position, intensity = 1.0, colorIntensity = 1.0) {
        this.position = position;
        this.intensity = intensity;
        this.colorIntensity = colorIntensity;
        this.isEdge = true;  // Initially an edge point
    }
}
```
Properties:
- Position tracking
- Intensity control
- Edge state management

## Advanced Features

### 1. Multi-Origin Growth
The system allows for multiple growth points by:
- Maintaining edge points set
- Independent growth probability per point
- Natural territory merging

### 2. Decay Mechanics
```javascript
const shrinkRatio = (this.territory.coverage - targetCoverage) / targetCoverage;
const pointsToRemove = Math.min(10, Math.floor(edgePoints.length * shrinkRatio * 0.1));
```
Features:
- Gradual edge erosion
- Proportional decay rate
- Maintains shape integrity

### 3. Performance Optimization
- Grid-based collision detection
- Efficient point management
- Batched visual updates

## Integration with Market Data

### 1. Market Cap Translation
```javascript
updateParams(params) {
    this.params = { ...this.params, ...params };
}
```
- Real-time market cap updates
- Smooth transition handling
- State preservation

### 2. Volatility Visualization
```javascript
update(deltaTime) {
    this.points.forEach(point => {
        point.colorIntensity = this.params.colorIntensity;
    });
}
```
- Color intensity reflects market state
- Real-time updates
- Visual feedback

## Usage Examples

### 1. Basic Implementation
```javascript
const virus = new VirusStateMachine();
virus.initialize([longitude, latitude], {
    marketCap: 50000,
    colorIntensity: 0.5
});
```

### 2. Market Integration
```javascript
marketSimulator.subscribe((newMarketData) => {
    const translatedParams = translator.translateMarketState(newMarketData);
    virus.updateParams(translatedParams);
});
```

### 3. Boost/Suppress Control
```javascript
// Double growth rate
virus.boostSpread(2.0);

// Halve growth rate
virus.suppressSpread(0.5);
``` 