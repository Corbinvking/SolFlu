# Market-Driven Virus Visualization Implementation Plan

## Overview
This plan outlines the steps to create a fully connected system where market data drives virus behavior visualization through our translation layer.

## Current Status
- Market controls UI implemented
- Basic virus visualization working
- Mock market data generation functional
- Translation layer exists but needs connection
- Visualization responds to basic updates

## Implementation Phases

### Phase 1: Market Data Integration
#### Goals
- Connect MockCryptoMarket to TranslatorBridge
- Ensure market events propagate correctly
- Implement proper data formatting

#### Tasks
1. **Update MockCryptoMarket**
   ```javascript
   // Add event emission for market changes
   class MockCryptoMarket {
       notifySubscribers() {
           const marketState = {
               marketCap: this.marketCap,
               volatility: this.volatility,
               trend: this.trend,
               timestamp: Date.now(),
               eventType: this.lastEvent || 'normal'
           };
           this.subscribers.forEach(cb => cb(marketState));
       }
   }
   ```

2. **Enhance TranslatorBridge**
   ```javascript
   // Add market data processing
   class TranslatorBridge {
       processMarketData(data) {
           return {
               spreadFactor: this.calculateSpreadFactor(data.marketCap),
               mutationRate: this.calculateMutationRate(data.volatility),
               spreadSpeed: this.calculateSpreadSpeed(data.trend),
               eventImpact: this.calculateEventImpact(data.eventType)
           };
       }
   }
   ```

### Phase 2: Translation Layer Enhancement
#### Goals
- Implement SIR model parameter calculation
- Create market-to-virus translation rules
- Add event-specific translations

#### Tasks
1. **Update Translator Models**
   ```python
   class MarketToVirusTranslator:
       def translate_market_state(self, market_data):
           return {
               'infection_rate': self.calculate_infection_rate(market_data['marketCap']),
               'recovery_rate': self.calculate_recovery_rate(market_data['volatility']),
               'mutation_probability': self.calculate_mutation_prob(market_data['trend']),
               'spread_pattern': self.determine_spread_pattern(market_data['eventType'])
           }
   ```

2. **Implement Translation Rules**
   ```python
   class TranslationRules:
       def calculate_infection_rate(self, market_cap):
           # Higher market cap = higher infection rate
           base_rate = 0.3
           market_factor = math.log(market_cap) / 10
           return min(0.8, base_rate * (1 + market_factor))
   ```

### Phase 3: Virus Behavior System
#### Goals
- Update VirusStateMachine to consume translated data
- Implement dynamic pattern generation
- Add market event responses

#### Tasks
1. **Enhance VirusStateMachine**
   ```javascript
   class VirusStateMachine {
       updateFromMarketData(translatedData) {
           this.updateInfectionRate(translatedData.infection_rate);
           this.updateMutationRate(translatedData.mutation_probability);
           this.updateSpreadPattern(translatedData.spread_pattern);
       }
   }
   ```

2. **Implement SpreadPatternManager**
   ```javascript
   class SpreadPatternManager {
       createPatternFromMarket(marketConditions) {
           return {
               intensity: this.calculateIntensity(marketConditions.marketCap),
               speed: this.calculateSpeed(marketConditions.volatility),
               pattern: this.selectPattern(marketConditions.eventType)
           };
       }
   }
   ```

### Phase 4: Visualization Enhancement
#### Goals
- Update visualization to reflect market conditions
- Add visual feedback for market events
- Implement smooth transitions

#### Tasks
1. **Update LayerManager**
   ```javascript
   class LayerManager {
       updateVisualization(virusState, marketConditions) {
           this.updateIntensity(marketConditions.marketCap);
           this.updateSpreadSpeed(marketConditions.volatility);
           this.updatePatternStyle(marketConditions.eventType);
       }
   }
   ```

2. **Enhance Animation System**
   ```javascript
   class AnimationSystem {
       handleMarketEvent(eventType) {
           switch(eventType) {
               case 'boom':
                   this.accelerateSpread();
                   this.increaseIntensity();
                   break;
               case 'crash':
                   this.decelerateSpread();
                   this.decreaseIntensity();
                   break;
           }
       }
   }
   ```

## Testing Strategy

### Unit Tests
1. **Market Data Tests**
   - Verify market event generation
   - Test data formatting
   - Validate subscription system

2. **Translation Tests**
   - Test market to virus parameter conversion
   - Verify event handling
   - Test edge cases

3. **Virus Behavior Tests**
   - Test pattern generation
   - Verify state updates
   - Test event responses

### Integration Tests
1. **Market to Translation Flow**
   ```javascript
   describe('Market to Translation Integration', () => {
       it('should properly translate market boom event', async () => {
           const market = new MockCryptoMarket();
           const translator = new TranslatorBridge();
           market.triggerEvent('boom');
           const result = await translator.processMarketData(market.getState());
           expect(result.spreadFactor).toBeGreaterThan(1);
       });
   });
   ```

2. **Translation to Visualization Flow**
   ```javascript
   describe('Translation to Visualization Integration', () => {
       it('should update visualization on market change', async () => {
           const visualizer = new LayerManager();
           const translator = new TranslatorBridge();
           const result = await translator.processMarketData(marketData);
           visualizer.update(result);
           expect(visualizer.layers).toHaveLength(2);
       });
   });
   ```

## Success Criteria
1. **Market Events**
   - Boom event causes visible virus spread acceleration
   - Crash event causes visible virus spread deceleration
   - Recovery shows stabilization pattern

2. **Real-time Updates**
   - Visualization updates within 100ms of market change
   - Smooth transitions between states
   - No visual glitches during updates

3. **Performance**
   - Maintains 60 FPS during animations
   - Memory usage stays below 100MB
   - CPU usage below 30%

## Implementation Order
1. Market data integration
2. Translation layer enhancement
3. Virus behavior system updates
4. Visualization improvements
5. Testing and optimization

## Timeline
- Phase 1: 1 day
- Phase 2: 1 day
- Phase 3: 1 day
- Phase 4: 1 day
- Testing & Optimization: 1 day

## Next Steps
1. Begin with Market Data Integration
2. Set up continuous testing pipeline
3. Implement translation rules
4. Connect visualization system
5. Run full integration tests 