class MutationSystem {
    constructor() {
        this.mutations = new Map();
        this.parameters = {
            baseMutationRate: 0.1,
            marketSensitivity: {
                volatility: 0.5,
                trend: 0.3,
                strength: 0.2
            },
            mutationTypes: {
                speedBoost: {
                    probability: 0.3,
                    effect: (pattern) => ({
                        ...pattern,
                        speed: pattern.speed * 1.5
                    })
                },
                intensityBoost: {
                    probability: 0.3,
                    effect: (pattern) => ({
                        ...pattern,
                        intensity: pattern.intensity * 1.4
                    })
                },
                rangeExtension: {
                    probability: 0.2,
                    effect: (pattern) => ({
                        ...pattern,
                        range: pattern.range * 1.3
                    })
                },
                hybridization: {
                    probability: 0.2,
                    effect: (pattern) => ({
                        ...pattern,
                        speed: pattern.speed * 1.2,
                        intensity: pattern.intensity * 1.2,
                        range: pattern.range * 1.1
                    })
                }
            }
        };
    }
    
    calculateMutationProbability(marketData) {
        const { volatility, trend, strength } = marketData;
        const { marketSensitivity } = this.parameters;
        
        return Math.min(1.0, this.parameters.baseMutationRate + 
            volatility * marketSensitivity.volatility +
            Math.abs(trend) * marketSensitivity.trend +
            (1 - strength) * marketSensitivity.strength
        );
    }
    
    selectMutationType(marketData) {
        const types = Object.entries(this.parameters.mutationTypes);
        const totalProbability = types.reduce((sum, [_, type]) => sum + type.probability, 0);
        
        let random = Math.random() * totalProbability;
        for (const [name, type] of types) {
            random -= type.probability;
            if (random <= 0) return name;
        }
        
        return types[0][0]; // Fallback to first type
    }
    
    attemptMutation(pattern, marketData) {
        const mutationProbability = this.calculateMutationProbability(marketData);
        
        if (Math.random() < mutationProbability) {
            const mutationType = this.selectMutationType(marketData);
            const mutation = this.parameters.mutationTypes[mutationType];
            
            const mutatedPattern = mutation.effect(pattern);
            
            // Record mutation
            const mutationId = `${pattern.id}_${Date.now()}`;
            this.mutations.set(mutationId, {
                originalPattern: pattern.id,
                type: mutationType,
                timestamp: Date.now(),
                changes: {
                    speed: mutatedPattern.speed / pattern.speed,
                    intensity: mutatedPattern.intensity / pattern.intensity,
                    range: mutatedPattern.range / pattern.range
                }
            });
            
            return {
                ...mutatedPattern,
                mutations: [...(pattern.mutations || []), mutationId]
            };
        }
        
        return pattern;
    }
    
    getMutationHistory(patternId) {
        return Array.from(this.mutations.values())
            .filter(m => m.originalPattern === patternId)
            .sort((a, b) => a.timestamp - b.timestamp);
    }
    
    getActiveMutations() {
        const now = Date.now();
        const activeThreshold = 5 * 60 * 1000; // 5 minutes
        
        return Array.from(this.mutations.values())
            .filter(m => now - m.timestamp < activeThreshold);
    }
    
    cleanup() {
        const now = Date.now();
        const cleanupThreshold = 10 * 60 * 1000; // 10 minutes
        
        for (const [id, mutation] of this.mutations.entries()) {
            if (now - mutation.timestamp > cleanupThreshold) {
                this.mutations.delete(id);
            }
        }
    }
}

export default MutationSystem; 