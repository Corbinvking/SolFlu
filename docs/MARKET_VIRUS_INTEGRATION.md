# Market Timeline and Virus Integration Documentation

## Overview
This document outlines the integration between the market simulation system and virus visualization, detailing how market stages influence virus spread patterns and coverage.

## Market Growth Stages

### Stage Definitions
```javascript
const MARKET_STAGES = {
    LAUNCH: {
        range: [2000, 10000],           // $2K - $10K
        growthRate: 1.5,                // 50% growth potential
        volatilityRange: [0.5, 0.9],    // High volatility
        coverage: 0.05                  // 5% map coverage
    },
    EARLY_GROWTH: {
        range: [10000, 100000],         // $10K - $100K
        growthRate: 1.3,                // 30% growth potential
        volatilityRange: [0.3, 0.7],    // Moderate volatility
        coverage: 0.15                  // 15% map coverage
    },
    VIRAL: {
        range: [100000, 1000000],       // $100K - $1M
        growthRate: 1.2,                // 20% growth potential
        volatilityRange: [0.4, 0.8],    // High viral volatility
        coverage: 0.40                  // 40% map coverage
    },
    ESTABLISHMENT: {
        range: [1000000, 10000000],     // $1M - $10M
        growthRate: 1.1,                // 10% growth potential
        volatilityRange: [0.2, 0.5],    // Stabilizing volatility
        coverage: 0.65                  // 65% map coverage
    },
    MATURATION: {
        range: [10000000, 100000000],   // $10M - $100M
        growthRate: 1.05,               // 5% growth potential
        volatilityRange: [0.1, 0.3],    // Low volatility
        coverage: 0.80                  // 80% map coverage
    },
    PEAK: {
        range: [100000000, 500000000],  // $100M - $500M
        growthRate: 1.02,               // 2% growth potential
        volatilityRange: [0.05, 0.2],   // Minimal volatility
        coverage: 0.90                  // 90% map coverage
    }
}
```

## Virus Growth Mathematics

### 1. Coverage Calculation
```javascript
// Base coverage calculation
const calculateCoverage = (points, mapBounds) => {
    const totalArea = mapBounds.width * mapBounds.height;
    const coveredArea = points.reduce((acc, point) => {
        return acc + (Math.PI * Math.pow(point.radius, 2));
    }, 0);
    return coveredArea / totalArea;
};

// Target coverage based on market cap
const getTargetCoverage = (marketCap, stage) => {
    const { range, coverage } = MARKET_STAGES[stage];
    const progress = (marketCap - range[0]) / (range[1] - range[0]);
    return coverage * progress;
};
```

### 2. Growth Rate Formulas

#### Base Growth Rate
```javascript
const calculateGrowthRate = (stage, marketMetrics) => {
    const baseRate = MARKET_STAGES[stage].growthRate;
    const momentum = marketMetrics.momentum;
    const volatility = marketMetrics.volatility;
    
    // Adjust growth based on market conditions
    return baseRate * (1 + momentum) * (1 + volatility * 0.5);
};
```

#### Spread Velocity
```javascript
const calculateSpreadVelocity = (currentCoverage, targetCoverage, growthRate) => {
    // Logarithmic growth model
    const gap = targetCoverage - currentCoverage;
    const velocity = Math.log(1 + gap) * growthRate;
    return Math.max(0.01, Math.min(velocity, 1.0)); // Clamp between 0.01 and 1.0
};
```

## Integration Components

### 1. VirusGrowthController
```javascript
class VirusGrowthController {
    constructor(marketSimulator, mapBounds) {
        this.marketSimulator = marketSimulator;
        this.mapBounds = mapBounds;
        this.currentCoverage = 0;
        this.spreadPoints = [];
    }

    update(deltaTime) {
        const marketMetrics = this.marketSimulator.getMetrics();
        const stage = this.marketSimulator.getCurrentStage();
        
        // Calculate target metrics
        const targetCoverage = getTargetCoverage(
            marketMetrics.marketCap, 
            stage
        );
        const growthRate = calculateGrowthRate(
            stage, 
            marketMetrics
        );
        const velocity = calculateSpreadVelocity(
            this.currentCoverage,
            targetCoverage,
            growthRate
        );

        // Update spread points
        this.updateSpreadPoints(velocity, deltaTime);
        this.currentCoverage = calculateCoverage(
            this.spreadPoints, 
            this.mapBounds
        );
    }

    updateSpreadPoints(velocity, deltaTime) {
        // Implementation for point generation and movement
    }
}
```

### 2. Market-Virus Synchronization
```javascript
class MarketVirusBridge {
    constructor(marketSimulator, virusController) {
        this.marketSimulator = marketSimulator;
        this.virusController = virusController;
        this.syncInterval = 100; // ms
    }

    startSync() {
        this.syncInterval = setInterval(() => {
            const marketState = this.marketSimulator.getState();
            this.virusController.update(this.syncInterval / 1000);
            this.emitMetrics();
        }, this.syncInterval);
    }

    emitMetrics() {
        const metrics = {
            marketCap: this.marketSimulator.getMarketCap(),
            coverage: this.virusController.currentCoverage,
            stage: this.marketSimulator.getCurrentStage(),
            growthRate: this.marketSimulator.getGrowthRate()
        };
        this.emit('metrics-update', metrics);
    }
}
```

## Performance Optimizations

### 1. Spatial Partitioning
```javascript
class QuadTree {
    constructor(bounds) {
        this.bounds = bounds;
        this.points = [];
        this.children = null;
        this.MAX_POINTS = 4;
    }

    insert(point) {
        if (!this.children) {
            if (this.points.length < this.MAX_POINTS) {
                this.points.push(point);
                return;
            }
            this.subdivide();
        }
        this.insertIntoChildren(point);
    }

    // Additional QuadTree methods...
}
```

### 2. Level of Detail System
```javascript
const LOD_LEVELS = {
    FULL: { distance: 0, pointDetail: 1.0 },
    HIGH: { distance: 1000, pointDetail: 0.75 },
    MEDIUM: { distance: 2000, pointDetail: 0.5 },
    LOW: { distance: 4000, pointDetail: 0.25 }
};

const calculateLOD = (viewDistance) => {
    for (const [level, data] of Object.entries(LOD_LEVELS)) {
        if (viewDistance <= data.distance) {
            return data.pointDetail;
        }
    }
    return LOD_LEVELS.LOW.pointDetail;
};
```

## Implementation Timeline

1. **Phase 1: Core Integration**
   - Implement VirusGrowthController
   - Create MarketVirusBridge
   - Set up basic synchronization

2. **Phase 2: Growth Mathematics**
   - Implement coverage calculations
   - Add growth rate formulas
   - Create spread velocity system

3. **Phase 3: Optimization**
   - Add QuadTree implementation
   - Implement LOD system
   - Optimize point generation

4. **Phase 4: Visual Feedback**
   - Add coverage indicators
   - Implement stage transition effects
   - Create growth visualization

## Testing Considerations

1. **Performance Testing**
   - Measure point generation efficiency
   - Monitor memory usage
   - Test different coverage scenarios

2. **Visual Testing**
   - Verify spread patterns
   - Check stage transitions
   - Validate coverage visualization

3. **Integration Testing**
   - Test market-virus synchronization
   - Verify growth rate calculations
   - Validate coverage targets

## Future Enhancements

1. **Advanced Spread Patterns**
   - Implement directional spread
   - Add spread resistance areas
   - Create spread channels

2. **Market Impact Features**
   - Add market events influence
   - Implement shock responses
   - Create recovery patterns

3. **Visual Improvements**
   - Add particle effects
   - Implement color gradients
   - Create transition animations
  </rewritten_file> 