const TranslationRules = require('../TranslationRules');

describe('TranslationRules', () => {
    let rules;

    beforeEach(() => {
        rules = new TranslationRules();
    });

    describe('infection rate calculation', () => {
        it('should calculate higher infection rate for higher market cap', () => {
            const lowCapRate = rules.calculateInfectionRate(10000);
            const highCapRate = rules.calculateInfectionRate(1000000);
            
            expect(highCapRate).toBeGreaterThan(lowCapRate);
            expect(highCapRate).toBeLessThanOrEqual(0.8); // Max cap
        });

        it('should handle zero or negative market cap', () => {
            const zeroCapRate = rules.calculateInfectionRate(0);
            const negativeCapRate = rules.calculateInfectionRate(-1000);
            
            expect(zeroCapRate).toBeGreaterThan(0);
            expect(negativeCapRate).toBeGreaterThan(0);
        });
    });

    describe('recovery rate calculation', () => {
        it('should calculate higher recovery rate for lower volatility', () => {
            const highVolRate = rules.calculateRecoveryRate(0.8);
            const lowVolRate = rules.calculateRecoveryRate(0.2);
            
            expect(lowVolRate).toBeGreaterThan(highVolRate);
            expect(lowVolRate).toBeLessThanOrEqual(0.5); // Max cap
        });

        it('should handle extreme volatility values', () => {
            const maxVolRate = rules.calculateRecoveryRate(1.0);
            const minVolRate = rules.calculateRecoveryRate(0.0);
            
            expect(maxVolRate).toBeGreaterThan(0);
            expect(minVolRate).toBeLessThanOrEqual(0.5);
        });
    });

    describe('mutation probability calculation', () => {
        it('should increase with higher volatility', () => {
            const lowVolProb = rules.calculateMutationProbability(0.2, 0);
            const highVolProb = rules.calculateMutationProbability(0.8, 0);
            
            expect(highVolProb).toBeGreaterThan(lowVolProb);
        });

        it('should be affected by trend magnitude', () => {
            const noTrendProb = rules.calculateMutationProbability(0.5, 0);
            const highTrendProb = rules.calculateMutationProbability(0.5, 0.8);
            
            expect(highTrendProb).toBeGreaterThan(noTrendProb);
        });
    });

    describe('spread pattern determination', () => {
        const marketConditions = {
            marketCap: 100000,
            volatility: 0.5,
            trend: 0.2
        };

        it('should return different patterns for different events', () => {
            const boomPattern = rules.determineSpreadPattern('boom', marketConditions);
            const crashPattern = rules.determineSpreadPattern('crash', marketConditions);
            
            expect(boomPattern.type).toBe('exponential');
            expect(crashPattern.type).toBe('spiral');
            expect(boomPattern.direction).toBe('outward');
            expect(crashPattern.direction).toBe('inward');
        });

        it('should modify pattern based on market conditions', () => {
            const normalPattern = rules.determineSpreadPattern('normal', marketConditions);
            const highCapConditions = {
                ...marketConditions,
                marketCap: 1000000
            };
            const highCapPattern = rules.determineSpreadPattern('normal', highCapConditions);
            
            expect(highCapPattern.intensity).toBeGreaterThan(normalPattern.intensity);
        });
    });

    describe('market impact calculation', () => {
        it('should calculate higher impact for extreme market conditions', () => {
            const normalConditions = {
                marketCap: 100000,
                volatility: 0.3,
                trend: 0.1
            };
            
            const extremeConditions = {
                marketCap: 1000000,
                volatility: 0.8,
                trend: 0.5
            };
            
            const normalImpact = rules.calculateMarketImpact(normalConditions);
            const extremeImpact = rules.calculateMarketImpact(extremeConditions);
            
            expect(extremeImpact.total).toBeGreaterThan(normalImpact.total);
            expect(extremeImpact.factors.volatility).toBeGreaterThan(normalImpact.factors.volatility);
        });

        it('should handle all market condition components', () => {
            const conditions = {
                marketCap: 100000,
                volatility: 0.5,
                trend: 0.3
            };
            
            const impact = rules.calculateMarketImpact(conditions);
            
            expect(impact.factors).toHaveProperty('marketCap');
            expect(impact.factors).toHaveProperty('volatility');
            expect(impact.factors).toHaveProperty('trend');
            expect(impact.total).toBeGreaterThan(0);
        });
    });
}); 