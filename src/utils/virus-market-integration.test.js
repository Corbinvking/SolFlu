import MarketSimulator from './market-simulator';
import VirusStateMachine from './virus-state-machine';
import SpreadPatternManager from './spread-pattern-manager';

describe('Virus-Market Integration', () => {
    let marketSimulator;
    let virusStateMachine;
    let spreadPatternManager;
    
    beforeEach(() => {
        marketSimulator = new MarketSimulator({
            initialMarketCap: 2000,
            initialPrice: 0.0001,
            initialSupply: 20000000
        });
        
        virusStateMachine = new VirusStateMachine();
        spreadPatternManager = new SpreadPatternManager();
    });

    afterEach(() => {
        marketSimulator.stop();
    });

    test('virus system responds to market phases', async () => {
        const marketStates = [];
        const virusStates = [];
        const patternStates = [];

        // Initialize virus with some starting points
        virusStateMachine.initializeFromCenters([
            { lat: 0, lng: 0 },
            { lat: 1, lng: 1 }
        ]);

        // Collect data for 5 updates
        for (let i = 0; i < 5; i++) {
            // Get market update
            const marketData = marketSimulator.update();
            marketStates.push(marketData);

            // Update virus state
            const virusState = virusStateMachine.updateMarketState({
                marketCap: marketData.marketCap,
                volatility: marketData.volatility,
                volume: marketData.volume24h,
                recentPrices: marketSimulator.state.priceHistory
            });
            virusStates.push(virusState);

            // Update spread patterns
            spreadPatternManager.updateMarketConditions({
                trend: virusState.trend,
                volatility: virusState.volatility,
                strength: virusState.strength
            });
            patternStates.push(spreadPatternManager.getActivePatterns());

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Verify market influence on virus behavior
        expect(marketStates.length).toBe(5);
        expect(virusStates.length).toBe(5);
        expect(patternStates.length).toBe(5);

        // Check for correlations between market and virus behavior
        for (let i = 1; i < marketStates.length; i++) {
            const marketGrowth = (marketStates[i].marketCap - marketStates[i-1].marketCap) / marketStates[i-1].marketCap;
            const virusGrowth = virusStates[i].trend;

            // Virus growth should correlate with market growth
            if (marketGrowth > 0) {
                expect(virusGrowth).toBeGreaterThan(-0.5);
            }
        }
    });

    test('spread patterns adapt to market volatility', async () => {
        // Create initial patterns
        const exponentialPattern = spreadPatternManager.createPattern('exponential', { x: 0, y: 0 });
        const linearPattern = spreadPatternManager.createPattern('linear', { x: 1, y: 1 });
        
        // Record initial properties
        const initialExpSpeed = exponentialPattern.speed;
        const initialLinSpeed = linearPattern.speed;
        
        // Simulate high volatility market
        marketSimulator.state.volatilityFactor = 0.8;
        const volatileMarket = marketSimulator.update();
        
        // Update patterns with volatile market
        spreadPatternManager.updateMarketConditions({
            trend: (volatileMarket.marketCap - 2000) / 2000,
            volatility: marketSimulator.state.volatilityFactor,
            strength: volatileMarket.marketCap / 10000
        });

        // Store pattern state before evolution
        const preEvolveState = {
            expPosition: { ...exponentialPattern.position },
            linPosition: { ...linearPattern.position }
        };

        // Evolve patterns multiple times to ensure changes
        for (let i = 0; i < 3; i++) {
            spreadPatternManager.evolvePattern(exponentialPattern, 0.5);
            spreadPatternManager.evolvePattern(linearPattern, 0.5);
        }

        // Verify pattern adaptation through position changes
        expect(exponentialPattern.position).not.toEqual(preEvolveState.expPosition);
        expect(linearPattern.position).not.toEqual(preEvolveState.linPosition);
        
        // Verify pattern properties are within valid ranges
        expect(exponentialPattern.speed).toBeGreaterThan(0);
        expect(exponentialPattern.intensity).toBeGreaterThan(0);
        expect(exponentialPattern.branchingFactor).toBeGreaterThan(0);
        expect(exponentialPattern.branchingFactor).toBeLessThan(1);
        
        // Verify age affects the pattern
        expect(exponentialPattern.age).toBeGreaterThan(0);
    });

    test('virus mutation probability increases with market stress', async () => {
        // Initialize with stable market
        const initialMarket = marketSimulator.update();
        const initialState = virusStateMachine.updateMarketState({
            marketCap: initialMarket.marketCap,
            volatility: 0.1, // Start with low volatility
            volume: initialMarket.volume24h,
            recentPrices: [100, 101, 102, 103] // Stable price history
        });

        // Record initial mutation probability
        const initialMutationProb = virusStateMachine.adaptation.mutationProbability;

        // Simulate market crash
        const crashedMarket = {
            marketCap: initialMarket.marketCap * 0.7, // 30% crash
            volatility: 0.9, // High volatility
            volume: initialMarket.volume24h * 1.5, // Increased volume
            recentPrices: [100, 90, 80, 70] // Declining prices
        };
        
        // Update virus with stressed market data
        virusStateMachine.updateMarketState(crashedMarket);

        // Verify increased mutation probability under stress
        expect(virusStateMachine.adaptation.mutationProbability)
            .toBeGreaterThan(initialMutationProb);
        
        // Additional verification
        expect(virusStateMachine.marketState.volatility).toBeGreaterThan(0.5);
        expect(virusStateMachine.marketState.trend).toBeLessThan(0);
    });

    test('market events trigger appropriate virus responses', async () => {
        // Initialize virus system with multiple points
        virusStateMachine.initializeFromCenters([
            { lat: 0, lng: 0 },
            { lat: 1, lng: 1 },
            { lat: -1, lng: -1 }
        ]);

        // Record initial state
        const initialState = {
            growthRate: virusStateMachine.growthParams.baseGrowthRate,
            resistance: virusStateMachine.adaptation.resistanceFactor,
            mutationProb: virusStateMachine.adaptation.mutationProbability
        };

        // Simulate normal market conditions first
        const normalMarket = {
            marketCap: 5000,
            volatility: 0.2,
            volume: 1000,
            recentPrices: [100, 101, 102, 103]
        };
        virusStateMachine.updateMarketState(normalMarket);
        
        // Record normal market metrics
        const normalMetrics = {
            growthRate: virusStateMachine.growthParams.baseGrowthRate,
            trend: virusStateMachine.marketState.trend,
            volatility: virusStateMachine.marketState.volatility
        };

        // Trigger market crash event
        const crashMarket = {
            marketCap: 2500, // 50% crash
            volatility: 0.9,
            volume: 5000, // High volume during crash
            recentPrices: [100, 80, 60, 50]
        };
        
        // Update virus with crash data
        virusStateMachine.updateMarketState(crashMarket);

        // Verify virus response to market crash
        expect(virusStateMachine.growthParams.baseGrowthRate)
            .toBeLessThan(normalMetrics.growthRate);
        expect(virusStateMachine.adaptation.mutationProbability)
            .toBeGreaterThan(initialState.mutationProb);
        
        // Verify market state impact
        expect(virusStateMachine.marketState.trend).toBeLessThan(0);
        expect(virusStateMachine.marketState.volatility)
            .toBeGreaterThan(normalMetrics.volatility);
        
        // Verify adaptation response
        expect(virusStateMachine.adaptation.resistanceFactor)
            .not.toBe(initialState.resistance);
    });

    test('market response system integration', async () => {
        // Initialize virus with some starting points
        virusStateMachine.initializeFromCenters([
            { lat: 0, lng: 0 },
            { lat: 1, lng: 1 }
        ]);

        // Set shorter response durations for testing
        virusStateMachine.marketResponseSystem.responseRules.forEach(rule => {
            rule.duration = 100; // 100ms for testing
        });

        // Record initial state
        const initialState = {
            growthRate: virusStateMachine.growthParams.baseGrowthRate,
            mutationProb: virusStateMachine.adaptation.mutationProbability
        };

        // Test market crash response with extreme conditions
        const crashMarket = {
            marketCap: 500, // 75% crash from initial 2000
            volatility: 0.95, // Very high volatility
            volume: 10000, // Extreme volume
            recentPrices: [100, 60, 30, 25] // Severe price decline
        };
        
        virusStateMachine.updateMarketState(crashMarket);
        
        // Verify market responses
        const crashResponses = virusStateMachine.getMarketResponses();
        const hasHighVolatility = crashResponses.active.some(r => r.id === 'high_volatility');
        const hasCrash = crashResponses.active.some(r => r.id === 'crash');
        expect(hasHighVolatility || hasCrash).toBe(true);
        
        // Verify response effects on virus behavior
        expect(virusStateMachine.growthParams.baseGrowthRate)
            .toBeLessThan(0.051); // Allow for small numerical differences
        expect(virusStateMachine.adaptation.mutationProbability)
            .toBeGreaterThan(initialState.mutationProb);

        // Wait for response duration
        await new Promise(resolve => setTimeout(resolve, 50));

        // Test recovery response with clear stabilization
        const recoveryMarket = {
            marketCap: 2500,
            volatility: 0.15, // Very low volatility
            volume: 500, // Normal volume
            recentPrices: [25, 30, 35, 40] // Clear recovery trend
        };
        
        virusStateMachine.updateMarketState(recoveryMarket);
        
        // Verify response transition
        const recoveryResponses = virusStateMachine.getMarketResponses();
        expect(recoveryResponses.active.length).toBeGreaterThan(0);
        expect(recoveryResponses.active.some(r => 
            r.id === 'stabilization' || r.id === 'strong_growth'
        )).toBe(true);
        
        // Verify response history
        const history = recoveryResponses.history;
        expect(history.length).toBeGreaterThan(1);
        expect(history[0].marketState.volatility).toBeGreaterThan(0.9); // Crash state
        expect(history[1].marketState.volatility).toBeLessThan(0.2); // Recovery state
    });

    test('market response cleanup', async () => {
        // Override response durations for testing
        const shortDuration = 50; // 50ms
        virusStateMachine.marketResponseSystem.responseRules.forEach(rule => {
            rule.duration = shortDuration;
        });

        // Clear any existing responses
        virusStateMachine.clearMarketResponses();

        // Trigger crash response with extreme conditions
        virusStateMachine.updateMarketState({
            marketCap: 500,
            volatility: 0.95,
            volume: 10000,
            recentPrices: [100, 60, 30, 25]
        });

        // Wait briefly for response processing
        await new Promise(resolve => setTimeout(resolve, 10));

        const initialResponses = virusStateMachine.getMarketResponses().active;
        expect(initialResponses.length).toBeGreaterThan(0);

        // Wait for responses to expire
        await new Promise(resolve => setTimeout(resolve, shortDuration + 20));

        // Trigger cleanup with clear stabilization
        virusStateMachine.updateMarketState({
            marketCap: 2000,
            volatility: 0.15,
            volume: 500,
            recentPrices: [25, 27, 30, 32]
        });

        // Wait briefly for cleanup
        await new Promise(resolve => setTimeout(resolve, 10));

        const finalResponses = virusStateMachine.getMarketResponses().active;
        expect(finalResponses.length).toBeGreaterThan(0);
        expect(finalResponses.some(r => 
            r.id === 'stabilization' || r.id === 'strong_growth'
        )).toBe(true);
    });

    test('combined market and virus effects', async () => {
        // Initialize virus
        virusStateMachine.initializeFromCenters([
            { lat: 0, lng: 0 }
        ]);

        // Set shorter response durations
        virusStateMachine.marketResponseSystem.responseRules.forEach(rule => {
            rule.duration = 100; // 100ms for testing
        });

        // Clear any existing responses
        virusStateMachine.clearMarketResponses();

        // Record initial state
        const initialState = {
            growthRate: virusStateMachine.growthParams.baseGrowthRate,
            mutationProb: virusStateMachine.adaptation.mutationProbability,
            resistance: virusStateMachine.adaptation.resistanceFactor
        };

        // Simulate market volatility with growth
        const volatileGrowth = {
            marketCap: 3000,
            volatility: 0.8, // Increased volatility
            volume: 4000,
            recentPrices: [100, 120, 150, 180]
        };
        
        virusStateMachine.updateMarketState(volatileGrowth);
        
        // Wait briefly for response processing
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Verify combined effects of market state and responses
        const currentState = {
            growthRate: virusStateMachine.growthParams.baseGrowthRate,
            mutationProb: virusStateMachine.adaptation.mutationProbability,
            resistance: virusStateMachine.adaptation.resistanceFactor
        };

        // At least one metric should change
        expect(
            currentState.growthRate !== initialState.growthRate ||
            currentState.mutationProb !== initialState.mutationProb ||
            currentState.resistance !== initialState.resistance
        ).toBe(true);
        
        // Verify active responses
        const responses = virusStateMachine.getMarketResponses();
        expect(responses.active.length).toBeGreaterThan(0);
        expect(responses.active.some(r => 
            r.id === 'high_volatility' || r.id === 'strong_growth'
        )).toBe(true);
    });
}); 