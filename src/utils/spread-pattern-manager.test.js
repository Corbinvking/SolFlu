import SpreadPatternManager from './spread-pattern-manager';

describe('SpreadPatternManager', () => {
    let manager;
    
    beforeEach(() => {
        manager = new SpreadPatternManager();
    });

    describe('Pattern Creation', () => {
        test('should create patterns of different types', () => {
            const initialPosition = { x: 0, y: 0 };
            
            const exponentialPattern = manager.createPattern('exponential', initialPosition);
            const linearPattern = manager.createPattern('linear', initialPosition);
            const clusteredPattern = manager.createPattern('clustered', initialPosition);

            expect(exponentialPattern.type).toBe('exponential');
            expect(linearPattern.type).toBe('linear');
            expect(clusteredPattern.type).toBe('clustered');
        });

        test('should throw error for invalid pattern type', () => {
            expect(() => {
                manager.createPattern('invalid', { x: 0, y: 0 });
            }).toThrow('Unknown pattern type: invalid');
        });
    });

    describe('Market Conditions', () => {
        const marketData = {
            trend: 0.5,
            volatility: 0.3,
            strength: 0.7
        };

        test('should update market conditions', () => {
            manager.updateMarketConditions(marketData);
            
            expect(manager.marketConditions).toEqual(marketData);
        });

        test('should modify patterns based on market conditions', () => {
            const pattern = manager.createPattern('exponential', { x: 0, y: 0 });
            const initialSpeed = pattern.speed;
            const initialIntensity = pattern.intensity;

            manager.updateMarketConditions(marketData);

            expect(pattern.speed).not.toBe(initialSpeed);
            expect(pattern.intensity).not.toBe(initialIntensity);
        });
    });

    describe('Pattern Evolution', () => {
        test('should evolve pattern position over time', () => {
            const pattern = manager.createPattern('linear', { x: 0, y: 0 });
            const initialPosition = { ...pattern.position };

            manager.updateMarketConditions({
                trend: 0.2,
                volatility: 0.1,
                strength: 0.5
            });

            manager.evolvePattern(pattern, 1.0);

            expect(pattern.position).not.toEqual(initialPosition);
        });

        test('should handle pattern branching', () => {
            const pattern = manager.createPattern('exponential', { x: 0, y: 0 });
            
            // Force high branching conditions
            manager.updateMarketConditions({
                trend: 0.8,
                volatility: 0.9,
                strength: 0.9
            });

            // Evolve multiple times to increase chance of branching
            for (let i = 0; i < 10; i++) {
                manager.evolvePattern(pattern, 0.1);
            }

            const activePatterns = manager.getActivePatterns();
            expect(activePatterns.length).toBeGreaterThanOrEqual(1);
        });

        test('should terminate patterns based on conditions', () => {
            const pattern = manager.createPattern('clustered', { x: 0, y: 0 });
            
            // Force termination conditions
            pattern.age = 11; // Exceeds max age
            pattern.intensity = 0.05; // Below minimum intensity

            const result = manager.evolvePattern(pattern, 1.0);
            expect(result).toBeNull();
            expect(manager.getActivePatterns().length).toBe(0);
        });
    });

    describe('Pattern Movement', () => {
        test('should calculate different movements for each pattern type', () => {
            const deltaTime = 1.0;
            manager.updateMarketConditions({
                trend: 0.5,
                volatility: 0.3,
                strength: 0.6
            });

            const exponential = manager.createPattern('exponential', { x: 0, y: 0 });
            const linear = manager.createPattern('linear', { x: 0, y: 0 });
            const clustered = manager.createPattern('clustered', { x: 0, y: 0 });

            const expMovement = manager.calculateMovement(exponential, deltaTime);
            const linMovement = manager.calculateMovement(linear, deltaTime);
            const clusMovement = manager.calculateMovement(clustered, deltaTime);

            // Each pattern type should have unique movement characteristics
            expect(expMovement).not.toEqual(linMovement);
            expect(linMovement).not.toEqual(clusMovement);
            expect(clusMovement).not.toEqual(expMovement);
        });
    });

    describe('Cleanup', () => {
        test('should remove all active patterns', () => {
            manager.createPattern('exponential', { x: 0, y: 0 });
            manager.createPattern('linear', { x: 0, y: 0 });
            manager.createPattern('clustered', { x: 0, y: 0 });

            expect(manager.getActivePatterns().length).toBe(3);

            manager.cleanup();

            expect(manager.getActivePatterns().length).toBe(0);
        });
    });
}); 