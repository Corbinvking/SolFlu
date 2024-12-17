/**
 * TranslationRules handles the conversion of market metrics into virus behavior parameters.
 * This class implements the core logic for how market conditions affect virus behavior.
 */
class TranslationRules {
    constructor() {
        // Base rates for calculations
        this.baseRates = {
            infection: 0.3,    // Base infection rate
            recovery: 0.1,     // Base recovery rate
            mutation: 0.05,    // Base mutation probability
            spread: 1.0        // Base spread rate
        };

        // Market impact factors
        this.impactFactors = {
            marketCap: 0.2,    // How much market cap affects spread
            volatility: 0.3,   // How much volatility affects mutation
            trend: 0.15        // How much trend affects direction
        };
    }

    /**
     * Calculate infection rate based on market capitalization
     * Higher market cap = higher infection rate (more resources to spread)
     */
    calculateInfectionRate(marketCap) {
        const marketFactor = Math.log10(Math.max(1, marketCap)) / 10;
        return Math.min(0.8, this.baseRates.infection * (1 + marketFactor));
    }

    /**
     * Calculate recovery rate based on market stability
     * More stable market = higher recovery rate
     */
    calculateRecoveryRate(volatility) {
        const stabilityFactor = Math.max(0, 1 - volatility);
        return Math.min(0.5, this.baseRates.recovery * (1 + stabilityFactor));
    }

    /**
     * Calculate mutation probability based on market volatility
     * Higher volatility = higher mutation chance
     */
    calculateMutationProbability(volatility, trend) {
        const volatilityFactor = volatility * this.impactFactors.volatility;
        const trendImpact = Math.abs(trend) * this.impactFactors.trend;
        return Math.min(1.0, this.baseRates.mutation * (1 + volatilityFactor + trendImpact));
    }

    /**
     * Determine spread pattern based on market event type and conditions
     */
    determineSpreadPattern(eventType, marketConditions) {
        const basePattern = this.getBasePattern(eventType);
        return this.modifyPattern(basePattern, marketConditions);
    }

    /**
     * Get base pattern configuration for different market events
     */
    getBasePattern(eventType) {
        switch (eventType) {
            case 'boom':
                return {
                    type: 'exponential',
                    intensity: 1.5,
                    speed: 1.2,
                    direction: 'outward'
                };
            case 'crash':
                return {
                    type: 'spiral',
                    intensity: 0.7,
                    speed: 1.5,
                    direction: 'inward'
                };
            case 'recovery':
                return {
                    type: 'wave',
                    intensity: 1.0,
                    speed: 0.8,
                    direction: 'balanced'
                };
            case 'volatile':
                return {
                    type: 'random',
                    intensity: 1.3,
                    speed: 1.4,
                    direction: 'chaotic'
                };
            default:
                return {
                    type: 'normal',
                    intensity: 1.0,
                    speed: 1.0,
                    direction: 'balanced'
                };
        }
    }

    /**
     * Modify pattern based on market conditions
     */
    modifyPattern(basePattern, conditions) {
        const { marketCap, volatility, trend } = conditions;
        
        // Calculate modification factors
        const intensityMod = Math.log10(Math.max(1, marketCap)) / 10;
        const speedMod = volatility * this.impactFactors.volatility;
        const directionMod = trend * this.impactFactors.trend;

        return {
            ...basePattern,
            intensity: basePattern.intensity * (1 + intensityMod),
            speed: basePattern.speed * (1 + speedMod),
            directionBias: directionMod
        };
    }

    /**
     * Calculate overall market impact score
     * Used to determine the magnitude of virus behavior changes
     */
    calculateMarketImpact(marketData) {
        const capImpact = Math.log10(Math.max(1, marketData.marketCap)) / 10;
        const volImpact = marketData.volatility * this.impactFactors.volatility;
        const trendImpact = Math.abs(marketData.trend) * this.impactFactors.trend;

        return {
            total: capImpact + volImpact + trendImpact,
            factors: {
                marketCap: capImpact,
                volatility: volImpact,
                trend: trendImpact
            }
        };
    }
}

module.exports = TranslationRules; 