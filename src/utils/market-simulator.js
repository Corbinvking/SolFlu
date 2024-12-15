class MarketSimulator {
    constructor(config = {}) {
        // Initial market state
        this.state = {
            marketCap: config.initialMarketCap || 2000, // Start with $2k market cap
            price: config.initialPrice || 0.0001,       // Very low initial price
            supply: config.initialSupply || 20000000,   // 20M initial supply
            volume24h: 0,
            holders: 10,                                // Start with 10 holders
            lastUpdate: Date.now(),
            
            // Market phase tracking
            phase: 'initial',                          // initial, early_growth, stabilization
            phaseStartTime: Date.now(),
            phaseDuration: 1000 * 60 * 60 * 24,       // 24 hours per phase
            
            // Growth factors
            organicGrowthRate: 0.001,                 // 0.1% base growth rate
            volatilityFactor: 0.15,                   // 15% initial volatility
            marketSentiment: 0.6,                     // 60% positive sentiment
            
            // Momentum tracking
            priceHistory: [],
            volumeHistory: [],
            momentumScore: 0
        };

        // Market behavior configuration
        this.config = {
            maxDailyGrowth: 3.0,           // 300% max daily growth
            maxDailyLoss: 0.5,             // 50% max daily loss
            volumeVolatility: 0.2,         // 20% volume volatility
            sentimentChangeRate: 0.1,      // 10% sentiment change rate
            momentumInfluence: 0.3,        // 30% momentum influence
            holderGrowthRate: 0.05,        // 5% holder growth rate
            maxHolders: 1000000,           // 1M max holders
            historyLength: 100,            // Keep last 100 data points
            updateInterval: 1000           // 1 second updates
        };

        // Event tracking
        this.events = [];
        this.lastEventTime = Date.now();
        this.eventProbability = 0.01;      // 1% chance of event per update
    }

    // Calculate realistic market metrics
    calculateMetrics(deltaTime) {
        const metrics = {
            marketCap: this.state.marketCap,
            price: this.state.price,
            volume24h: this.state.volume24h,
            holders: this.state.holders,
            phase: this.state.phase
        };

        // Phase-based adjustments
        const phaseElapsed = (Date.now() - this.state.phaseStartTime) / this.state.phaseDuration;
        if (phaseElapsed >= 1) {
            this.advancePhase();
        }

        // Calculate organic growth
        const baseGrowth = this.calculateOrganicGrowth(deltaTime);
        const volatility = this.calculateVolatility();
        const momentum = this.calculateMomentum();
        const sentiment = this.state.marketSentiment;

        // Combine factors for final growth rate
        const growthRate = (baseGrowth + 
            (volatility * (Math.random() - 0.5)) + 
            (momentum * this.config.momentumInfluence)) * 
            (sentiment > 0.5 ? sentiment : 1 - sentiment);

        // Apply growth with limits
        const maxGrowth = this.config.maxDailyGrowth * (deltaTime / (24 * 60 * 60 * 1000));
        const maxLoss = this.config.maxDailyLoss * (deltaTime / (24 * 60 * 60 * 1000));
        const limitedGrowth = Math.max(-maxLoss, Math.min(maxGrowth, growthRate));

        // Update market cap and price
        metrics.marketCap *= (1 + limitedGrowth);
        metrics.price = metrics.marketCap / this.state.supply;

        // Update volume
        metrics.volume24h = this.calculateVolume(metrics.marketCap, deltaTime);

        // Update holders
        metrics.holders = this.updateHolders(deltaTime);

        return metrics;
    }

    calculateOrganicGrowth(deltaTime) {
        const baseGrowth = this.state.organicGrowthRate * (deltaTime / (24 * 60 * 60 * 1000));
        
        // Phase-based growth adjustments
        switch (this.state.phase) {
            case 'initial':
                return baseGrowth * 2;  // Double growth in initial phase
            case 'early_growth':
                return baseGrowth * 1.5;  // 50% boost in early growth
            case 'stabilization':
                return baseGrowth;  // Normal growth in stabilization
            default:
                return baseGrowth;
        }
    }

    calculateVolatility() {
        // Phase-based volatility adjustments
        let phaseVolatility = this.state.volatilityFactor;
        switch (this.state.phase) {
            case 'initial':
                phaseVolatility *= 2;  // Higher volatility in initial phase
                break;
            case 'early_growth':
                phaseVolatility *= 1.5;  // Moderate volatility in early growth
                break;
            case 'stabilization':
                phaseVolatility *= 0.8;  // Lower volatility in stabilization
                break;
        }
        return phaseVolatility;
    }

    calculateMomentum() {
        if (this.state.priceHistory.length < 2) return 0;
        
        // Calculate short-term and long-term momentum
        const shortTerm = this.calculateAverageReturn(5);  // 5-period momentum
        const longTerm = this.calculateAverageReturn(20);  // 20-period momentum
        
        return (shortTerm * 0.7 + longTerm * 0.3);  // Weighted average
    }

    calculateAverageReturn(periods) {
        const relevantHistory = this.state.priceHistory.slice(-periods);
        if (relevantHistory.length < 2) return 0;
        
        let totalReturn = 0;
        for (let i = 1; i < relevantHistory.length; i++) {
            totalReturn += (relevantHistory[i] - relevantHistory[i-1]) / relevantHistory[i-1];
        }
        return totalReturn / (relevantHistory.length - 1);
    }

    calculateVolume(marketCap, deltaTime) {
        // Base volume as percentage of market cap
        const baseVolume = marketCap * 0.1;  // 10% of market cap as base volume
        
        // Add volatility to volume
        const volumeNoise = (Math.random() - 0.5) * this.config.volumeVolatility;
        
        // Phase-based volume adjustments
        let phaseMultiplier = 1;
        switch (this.state.phase) {
            case 'initial':
                phaseMultiplier = 0.5;  // Lower volume in initial phase
                break;
            case 'early_growth':
                phaseMultiplier = 1.2;  // Higher volume in early growth
                break;
            case 'stabilization':
                phaseMultiplier = 1;    // Normal volume in stabilization
                break;
        }
        
        return baseVolume * (1 + volumeNoise) * phaseMultiplier;
    }

    updateHolders(deltaTime) {
        const growthRate = this.config.holderGrowthRate * (deltaTime / (24 * 60 * 60 * 1000));
        const newHolders = Math.floor(this.state.holders * (1 + growthRate));
        return Math.min(newHolders, this.config.maxHolders);
    }

    advancePhase() {
        switch (this.state.phase) {
            case 'initial':
                this.state.phase = 'early_growth';
                this.state.organicGrowthRate *= 1.5;
                this.state.volatilityFactor *= 0.8;
                break;
            case 'early_growth':
                this.state.phase = 'stabilization';
                this.state.organicGrowthRate *= 0.7;
                this.state.volatilityFactor *= 0.6;
                break;
        }
        this.state.phaseStartTime = Date.now();
    }

    update() {
        const now = Date.now();
        const deltaTime = now - this.state.lastUpdate;
        
        // Calculate new metrics
        const newMetrics = this.calculateMetrics(deltaTime);
        
        // Update state
        this.state.marketCap = newMetrics.marketCap;
        this.state.price = newMetrics.price;
        this.state.volume24h = newMetrics.volume24h;
        this.state.holders = newMetrics.holders;
        this.state.lastUpdate = now;

        // Update history
        this.state.priceHistory.push(this.state.price);
        this.state.volumeHistory.push(this.state.volume24h);
        if (this.state.priceHistory.length > this.config.historyLength) {
            this.state.priceHistory.shift();
            this.state.volumeHistory.shift();
        }

        // Generate random market events
        if (Math.random() < this.eventProbability) {
            this.generateMarketEvent();
        }

        return {
            marketCap: this.state.marketCap,
            price: this.state.price,
            volume24h: this.state.volume24h,
            holders: this.state.holders,
            phase: this.state.phase,
            events: this.events.slice(-5)  // Return last 5 events
        };
    }

    generateMarketEvent() {
        const eventTypes = [
            { type: 'whale_buy', impact: 0.1, probability: 0.3 },
            { type: 'whale_sell', impact: -0.08, probability: 0.3 },
            { type: 'news', impact: 0.05, probability: 0.2 },
            { type: 'fud', impact: -0.03, probability: 0.2 }
        ];

        const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        this.events.push({
            type: event.type,
            timestamp: Date.now(),
            impact: event.impact
        });

        // Apply event impact
        this.state.marketCap *= (1 + event.impact);
        this.state.marketSentiment = Math.max(0, Math.min(1, 
            this.state.marketSentiment + (event.impact * 0.5)));

        // Keep only recent events
        if (this.events.length > 10) this.events.shift();
    }

    start() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => this.update(), this.config.updateInterval);
    }

    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

export default MarketSimulator; 