class SIRModelIntegration {
    constructor() {
        this.parameters = {
            beta: 0.3,    // Base transmission rate
            gamma: 0.1,   // Base recovery rate
            R0: 3.0,      // Basic reproduction number
            marketInfluence: {
                transmission: 0.4,  // Market influence on transmission
                recovery: 0.2,      // Market influence on recovery
                mutation: 0.3       // Market influence on mutation probability
            }
        };
        
        this.state = {
            susceptible: 1.0,
            infected: 0.0,
            recovered: 0.0,
            mutationProbability: 0.0
        };
    }
    
    updateParameters(marketData) {
        // Update transmission rate based on market volatility and trend
        const volatilityEffect = marketData.volatility * this.parameters.marketInfluence.transmission;
        const trendEffect = Math.abs(marketData.trend) * 0.2;
        this.parameters.beta = Math.max(0.1, Math.min(0.9,
            this.parameters.beta * (1 + volatilityEffect + trendEffect)
        ));
        
        // Update recovery rate based on market strength
        const strengthEffect = marketData.strength * this.parameters.marketInfluence.recovery;
        this.parameters.gamma = Math.max(0.05, Math.min(0.3,
            this.parameters.gamma * (1 + strengthEffect)
        ));
        
        // Update R0 based on new parameters
        this.parameters.R0 = this.parameters.beta / this.parameters.gamma;
        
        // Calculate mutation probability
        this.state.mutationProbability = Math.min(1.0,
            marketData.volatility * this.parameters.marketInfluence.mutation +
            Math.abs(marketData.trend) * 0.2
        );
    }
    
    evolve(deltaTime) {
        // SIR model differential equations
        const dS = -this.parameters.beta * this.state.susceptible * this.state.infected;
        const dI = this.parameters.beta * this.state.susceptible * this.state.infected - 
                  this.parameters.gamma * this.state.infected;
        const dR = this.parameters.gamma * this.state.infected;
        
        // Update state
        this.state.susceptible = Math.max(0, Math.min(1, 
            this.state.susceptible + dS * deltaTime
        ));
        this.state.infected = Math.max(0, Math.min(1,
            this.state.infected + dI * deltaTime
        ));
        this.state.recovered = Math.max(0, Math.min(1,
            this.state.recovered + dR * deltaTime
        ));
        
        return {
            ...this.state,
            R0: this.parameters.R0,
            transmissionRate: this.parameters.beta,
            recoveryRate: this.parameters.gamma
        };
    }
    
    getSpreadFactors() {
        return {
            intensity: this.state.infected * (1 + this.parameters.R0 / 4),
            speed: this.parameters.beta * (1 + this.state.mutationProbability),
            range: Math.sqrt(this.parameters.R0) * (1 + this.state.infected)
        };
    }
    
    reset() {
        this.state = {
            susceptible: 1.0,
            infected: 0.0,
            recovered: 0.0,
            mutationProbability: 0.0
        };
        
        this.parameters = {
            beta: 0.3,
            gamma: 0.1,
            R0: 3.0,
            marketInfluence: {
                transmission: 0.4,
                recovery: 0.2,
                mutation: 0.3
            }
        };
    }
}

export default SIRModelIntegration; 