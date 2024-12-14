# Market Data and State Management Documentation

## Market Data Processing

### Overview
The market data processing system handles real-time market updates through WebSocket connections and manages state updates for the visualization system. The system is designed to maintain a consistent 60 FPS while processing market updates efficiently.

### Components

#### MarketDataManager
- Establishes WebSocket connection to simulation server
- Processes incoming market data updates
- Maintains current market state
- Emits events for state changes
- Handles connection errors and reconnection

#### State Flow
1. Market data received via WebSocket
2. Data parsed and validated
3. State differences calculated
4. State updated
5. Events emitted for changes
6. Updates queued for visualization

## Spread Mechanics

### Overview
The spread mechanics system calculates virus spread based on market metrics and manages the visualization update queue.

### Components

#### SpreadStateManager
- Processes market updates into spread mechanics
- Manages update priority queue
- Maintains frame rate consistency
- Handles spread calculations

#### UpdateQueue
- Prioritizes updates based on market volatility
- Maintains consistent frame timing
- Processes updates in order of priority
- Handles both spread and route updates

### Calculations
- Spread rate based on market cap and volatility
- Route activation based on market conditions
- Center intensity calculations
- Performance-optimized update scheduling

## State Management

### Overview
The state management system ensures consistent state across all components and manages the update lifecycle.

### Components

#### State Updates
1. Market data received
2. State differences calculated
3. Updates prioritized
4. Spread mechanics updated
5. Visualization queue updated
6. Frame timing maintained

#### Event System
- Market cap updates
- Volatility changes
- Route activations
- Center updates
- Performance metrics

## Performance Metrics

### Overview
The performance monitoring system tracks key metrics to ensure optimal performance.

### Metrics Tracked
- FPS (target: 60)
- Market update latency (target: <16ms)
- Spread calculation time (target: <16ms)
- Memory usage
- Update queue length

### Performance Optimization
- Frame rate maintenance
- Update prioritization
- Memory management
- Efficient state diffing
- Optimized calculations

## Error Handling

### Types of Errors
- WebSocket connection failures
- Data parsing errors
- State update failures
- Performance degradation

### Error Recovery
- Automatic reconnection
- State recovery
- Performance warnings
- Graceful degradation

## Best Practices

### Development Guidelines
1. Maintain frame rate above 55 FPS
2. Keep update latency below 16ms
3. Optimize memory usage
4. Handle errors gracefully
5. Document state changes
6. Test performance impact

### Performance Tips
- Minimize state updates
- Use efficient data structures
- Implement proper error handling
- Monitor performance metrics
- Optimize calculations
- Use appropriate update priorities 