class TranslatorBridge {
    constructor() {
        this.rules = {
            marketCapToIntensity: (marketCap) => {
                // Stronger scaling with market cap
                const normalized = Math.log(marketCap) / Math.log(1000000);
                // Higher base growth rate and more aggressive scaling
                return Math.max(0.5, normalized * 2.0);
            },
            volatilityToColor: (volatility) => {
                // More dramatic color changes
                return Math.max(0.3, Math.min(1.0, volatility * 3));
            },
            trendToBranchingFactor: (trend) => {
                // More aggressive branching
                return 0.3 + ((trend + 1) / 2) * 0.7;
            },
            eventToPattern: (eventType) => {
                switch (eventType) {
                    case 'boom':
                        return 'explosive';
                    case 'crash':
                        return 'contracting';
                    case 'recovery':
                        return 'balanced';
                    default:
                        return 'normal';
                }
            }
        };
    }

    translateMarketState(marketState) {
        const {
            marketCap,
            volatility,
            trend,
            eventType
        } = marketState;

        const intensity = this.rules.marketCapToIntensity(marketCap);
        return {
            intensity: intensity,
            colorIntensity: this.rules.volatilityToColor(volatility),
            speed: intensity * 1.5, // Even faster speed scaling with market cap
            branchingFactor: this.rules.trendToBranchingFactor(trend),
            pattern: this.rules.eventToPattern(eventType),
            marketCap
        };
    }

    // Method to create initial spread pattern
    async createSpreadPattern(center, marketState) {
        const params = this.translateMarketState(marketState);
        return {
            type: params.pattern,
            center: center,
            params: {
                intensity: params.intensity,
                colorIntensity: params.colorIntensity,
                speed: params.speed,
                branchingFactor: params.branchingFactor
            }
        };
    }

    // Method to update existing pattern
    updatePattern(pattern, marketState) {
        const params = this.translateMarketState(marketState);
        return {
            ...pattern,
            type: params.pattern,
            params: {
                intensity: params.intensity,
                colorIntensity: params.colorIntensity,
                speed: params.speed,
                branchingFactor: params.branchingFactor
            }
        };
    }
}

export default TranslatorBridge; 