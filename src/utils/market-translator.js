// Constants for parameter ranges
const INFECTION_RATE_RANGE = {
    MIN: 0.05,
    MAX: 0.5
};

const SPREAD_DISTANCE_RANGE = {
    MIN: 0.001,
    MAX: 0.01
};

const BRANCH_RATE_RANGE = {
    MIN: 0.1,
    MAX: 0.8
};

class MarketTranslator {
    constructor() {
        this.lastMarketCap = null;
        this.lastVolume = null;
        this.marketTrends = {
            capTrend: 0,
            volumeTrend: 0
        };
    }

    calculateTrends(marketData) {
        if (this.lastMarketCap !== null) {
            this.marketTrends.capTrend = (marketData.marketCap - this.lastMarketCap) / this.lastMarketCap;
        }
        if (this.lastVolume !== null) {
            this.marketTrends.volumeTrend = (marketData.volume - this.lastVolume) / this.lastVolume;
        }

        this.lastMarketCap = marketData.marketCap;
        this.lastVolume = marketData.volume;

        return this.marketTrends;
    }

    calculateInfectionRate(marketCap, volatility) {
        const normalizedCap = Math.pow(Math.min(1, marketCap / 1000000), 0.5);
        
        const baseRate = INFECTION_RATE_RANGE.MIN + 
            (normalizedCap * (INFECTION_RATE_RANGE.MAX - INFECTION_RATE_RANGE.MIN));
        
        return baseRate * (1 + volatility * 0.5);
    }

    calculateSpreadDistance(marketCap, volume, volatility) {
        const normalizedCap = Math.pow(Math.min(1, marketCap / 1000000), 0.5);
        const normalizedVolume = Math.min(1, volume / 1000000);
        
        const baseDistance = SPREAD_DISTANCE_RANGE.MIN +
            (normalizedCap * (SPREAD_DISTANCE_RANGE.MAX - SPREAD_DISTANCE_RANGE.MIN));
        
        return baseDistance * (1 + (normalizedVolume * 0.3) + (volatility * 0.2));
    }

    calculateBranchingProbability(marketCap, volatility, trend) {
        const normalizedCap = Math.min(1, marketCap / 1000000);
        
        let probability = BRANCH_RATE_RANGE.MIN +
            (normalizedCap * (BRANCH_RATE_RANGE.MAX - BRANCH_RATE_RANGE.MIN));
        
        if (trend > 0) {
            probability *= (1 + trend * 2);
        }
        
        return Math.min(BRANCH_RATE_RANGE.MAX, probability);
    }

    calculateShrinkRate(trend, volatility) {
        if (trend < 0) {
            return Math.min(0.8, Math.abs(trend) * (1 + volatility));
        }
        return 0;
    }

    translate(marketData) {
        const trends = this.calculateTrends(marketData);
        
        const momentum = trends.capTrend * 0.7 + (this.marketTrends.capTrend || 0) * 0.3;
        
        const virusParameters = {
            infectionRate: this.calculateInfectionRate(
                marketData.marketCap,
                marketData.volatility
            ),
            spreadDistance: this.calculateSpreadDistance(
                marketData.marketCap,
                marketData.volume,
                marketData.volatility
            ),
            branchProbability: this.calculateBranchingProbability(
                marketData.marketCap,
                marketData.volatility,
                momentum
            ),
            shrinkRate: this.calculateShrinkRate(
                momentum,
                marketData.volatility
            ),
            simultaneousGrowth: Math.max(1, Math.floor(
                Math.pow(marketData.marketCap / 1000000, 0.5) * 10
            ))
        };

        console.log('Market Translation:', {
            input: {
                marketCap: marketData.marketCap,
                normalizedCap: marketData.marketCap / 1000000,
                volatility: marketData.volatility,
                trend: trends.capTrend,
                momentum
            },
            output: virusParameters
        });

        return virusParameters;
    }
}

export default MarketTranslator; 