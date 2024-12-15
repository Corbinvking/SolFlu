class MarketResponseSystem {
    constructor() {
        // Response rules for different market conditions
        this.responseRules = new Map();
        
        // Currently active responses
        this.activeResponses = new Set();
        
        // Response history for analysis
        this.responseHistory = [];
        
        // Market state thresholds
        this.thresholds = {
            volatility: {
                high: 0.7,
                medium: 0.4,
                low: 0.2
            },
            trend: {
                strong_positive: 0.3,
                positive: 0.1,
                negative: -0.1,
                strong_negative: -0.3
            },
            volume: {
                high: 0.8,
                medium: 0.5,
                low: 0.2
            }
        };

        this.initializeResponseRules();
    }

    initializeResponseRules() {
        // Market crash response
        this.responseRules.set('crash', {
            condition: (marketState) => {
                return marketState.trend < this.thresholds.trend.strong_negative ||
                       (marketState.trend < this.thresholds.trend.negative && 
                        marketState.volatility > this.thresholds.volatility.high);
            },
            effects: {
                mutationRate: 2.0,
                resistanceFactor: 0.7,
                spreadRate: 0.5,
                recoveryRate: 1.5
            },
            duration: 1000 * 60 * 5 // 5 minutes
        });

        // High volatility response
        this.responseRules.set('high_volatility', {
            condition: (marketState) => {
                return marketState.volatility > this.thresholds.volatility.medium ||
                       Math.abs(marketState.trend) > this.thresholds.trend.positive;
            },
            effects: {
                mutationRate: 1.8,
                resistanceFactor: 0.8,
                spreadRate: 0.7,
                recoveryRate: 1.3
            },
            duration: 1000 * 60 * 3 // 3 minutes
        });

        // Strong growth response
        this.responseRules.set('strong_growth', {
            condition: (marketState) => {
                return marketState.trend >= 0.2 &&
                       marketState.volatility < 0.4;
            },
            effects: {
                mutationRate: 1.2,
                resistanceFactor: 1.3,
                spreadRate: 1.5,
                recoveryRate: 0.8
            },
            duration: 1000 * 60 * 4 // 4 minutes
        });

        // Market stabilization response
        this.responseRules.set('stabilization', {
            condition: (marketState) => {
                return marketState.volatility <= 0.2 &&
                       Math.abs(marketState.trend) < 0.2;
            },
            effects: {
                mutationRate: 0.8,
                resistanceFactor: 1.0,
                spreadRate: 1.0,
                recoveryRate: 1.0
            },
            duration: 1000 * 60 * 2 // 2 minutes
        });
    }

    processMarketUpdate(marketState) {
        const timestamp = Date.now();
        const activeResponses = new Set();

        // Check each rule against current market state
        for (const [ruleId, rule] of this.responseRules) {
            if (rule.condition(marketState)) {
                activeResponses.add({
                    id: ruleId,
                    startTime: timestamp,
                    effects: rule.effects,
                    duration: rule.duration
                });
            }
        }

        // Update active responses
        this.updateActiveResponses(activeResponses, timestamp);

        // Calculate combined effects
        const combinedEffects = this.calculateCombinedEffects();

        // Record response history
        this.recordResponseHistory(marketState, combinedEffects, timestamp);

        return combinedEffects;
    }

    updateActiveResponses(newResponses, timestamp) {
        // Remove expired responses
        const activeResponses = Array.from(this.activeResponses)
            .filter(response => {
                const age = timestamp - response.startTime;
                return age < response.duration;
            });

        // Determine market state type
        const newResponseTypes = new Set(Array.from(newResponses).map(r => r.id));
        
        // Clear ALL existing responses when transitioning to stabilization
        if (newResponseTypes.has('stabilization')) {
            activeResponses.length = 0;
            // Only add stabilization response
            const stabilizationResponse = Array.from(newResponses)
                .find(r => r.id === 'stabilization');
            if (stabilizationResponse) {
                activeResponses.push(stabilizationResponse);
            }
            this.activeResponses = new Set(activeResponses);
            return;
        }

        // Add new responses, ensuring no conflicting states
        newResponses.forEach(newResponse => {
            // Don't add volatile responses if we're in stabilization
            if ((newResponse.id === 'crash' || newResponse.id === 'high_volatility') &&
                activeResponses.some(r => r.id === 'stabilization')) {
                return;
            }
            
            const existingIndex = activeResponses.findIndex(r => r.id === newResponse.id);
            if (existingIndex >= 0) {
                activeResponses[existingIndex] = newResponse;
            } else {
                activeResponses.push(newResponse);
            }
        });

        this.activeResponses = new Set(activeResponses);
    }

    calculateCombinedEffects() {
        if (this.activeResponses.size === 0) {
            return {
                mutationRate: 1.0,
                resistanceFactor: 1.0,
                spreadRate: 1.0,
                recoveryRate: 1.0
            };
        }

        // Combine all active effects
        const combined = Array.from(this.activeResponses).reduce((acc, response) => {
            const effects = response.effects;
            return {
                mutationRate: acc.mutationRate * effects.mutationRate,
                resistanceFactor: acc.resistanceFactor * effects.resistanceFactor,
                spreadRate: acc.spreadRate * effects.spreadRate,
                recoveryRate: acc.recoveryRate * effects.recoveryRate
            };
        }, {
            mutationRate: 1.0,
            resistanceFactor: 1.0,
            spreadRate: 1.0,
            recoveryRate: 1.0
        });

        // Apply limits to prevent extreme values
        return {
            mutationRate: Math.min(3.0, Math.max(0.2, combined.mutationRate)),
            resistanceFactor: Math.min(2.0, Math.max(0.3, combined.resistanceFactor)),
            spreadRate: Math.min(2.0, Math.max(0.2, combined.spreadRate)),
            recoveryRate: Math.min(2.0, Math.max(0.5, combined.recoveryRate))
        };
    }

    recordResponseHistory(marketState, effects, timestamp) {
        this.responseHistory.push({
            timestamp,
            marketState: { ...marketState },
            activeResponses: Array.from(this.activeResponses).map(r => r.id),
            effects: { ...effects }
        });

        // Keep only recent history
        if (this.responseHistory.length > 100) {
            this.responseHistory.shift();
        }
    }

    getActiveResponses() {
        return Array.from(this.activeResponses);
    }

    getResponseHistory() {
        return this.responseHistory;
    }

    clearHistory() {
        this.responseHistory = [];
        this.activeResponses.clear();
    }
}

export default MarketResponseSystem; 