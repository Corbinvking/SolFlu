class MutationSystem {
    constructor() {
        this.mutations = {
            speed: 1.0,
            intensity: 1.0,
            resistance: 1.0
        };
        this.mutationChance = 0.1; // Base chance for mutation
        this.mutationStrength = 0.2; // How strong mutations are
        this.marketInfluence = 1.0; // Market influence on mutations
    }

    // Update mutation factors based on market conditions
    updateMarketInfluence(marketState) {
        // Higher volatility increases mutation chance
        this.mutationChance = 0.1 + (marketState.volatility * 0.2);
        
        // Market trend affects mutation strength
        this.mutationStrength = 0.2 + (Math.abs(marketState.trend) * 0.3);
        
        // Market cap affects overall influence
        this.marketInfluence = Math.log(marketState.marketCap) / Math.log(1000000);
    }

    // Apply mutations based on current conditions
    mutate(deltaTime) {
        if (Math.random() < this.mutationChance * deltaTime) {
            // Determine which attribute to mutate
            const attributes = Object.keys(this.mutations);
            const attribute = attributes[Math.floor(Math.random() * attributes.length)];
            
            // Calculate mutation amount
            const mutationAmount = (Math.random() - 0.5) * 
                                 this.mutationStrength * 
                                 this.marketInfluence;
            
            // Apply mutation
            this.mutations[attribute] = Math.max(0.1,
                Math.min(2.0, this.mutations[attribute] + mutationAmount)
            );

            return {
                type: attribute,
                value: this.mutations[attribute],
                strength: Math.abs(mutationAmount)
            };
        }
        return null;
    }

    // Get current mutation factors
    getMutationFactors() {
        return { ...this.mutations };
    }

    // Apply mutation effects to virus parameters
    applyMutations(params) {
        return {
            speed: params.speed * this.mutations.speed,
            intensity: params.intensity * this.mutations.intensity,
            branchingFactor: params.branchingFactor * 
                           (this.mutations.resistance + this.mutations.speed) / 2
        };
    }

    // Reset mutations to default state
    reset() {
        this.mutations = {
            speed: 1.0,
            intensity: 1.0,
            resistance: 1.0
        };
        this.mutationChance = 0.1;
        this.mutationStrength = 0.2;
        this.marketInfluence = 1.0;
    }
}

export default MutationSystem; 