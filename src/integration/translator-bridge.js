class TranslatorBridge {
    constructor() {
        this.rules = {
            marketCapToIntensity: (marketCap) => {
                // Normalize market cap between 0 and 1
                const normalized = Math.log(marketCap) / Math.log(1000000);
                return Math.max(0.1, Math.min(1.0, normalized));
            },
            volatilityToSpeed: (volatility) => {
                // Direct mapping with some scaling
                return Math.max(0.2, Math.min(1.0, volatility * 1.5));
            },
            trendToBranchingFactor: (trend) => {
                // Convert -1 to 1 trend to 0.1-0.5 branching factor
                return 0.1 + ((trend + 1) / 2) * 0.4;
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

        return {
            intensity: this.rules.marketCapToIntensity(marketCap),
            speed: this.rules.volatilityToSpeed(volatility),
            branchingFactor: this.rules.trendToBranchingFactor(trend),
            pattern: this.rules.eventToPattern(eventType)
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
                speed: params.speed,
                branchingFactor: params.branchingFactor
            }
        };
    }
}

export default TranslatorBridge; 