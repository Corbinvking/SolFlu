/**
 * Market Growth Stages System
 * Handles the progression of a token from initial launch to maturity
 * Simulates realistic meme coin market behavior with appropriate scaling at each stage
 */

class MarketGrowthStages {
    constructor() {
        // Define growth stages with their characteristics
        this.STAGES = {
            LAUNCH: {
                name: 'LAUNCH',
                range: [2000, 10000],           // Market cap range in USD
                growthRate: 1.5,                // Exponential growth multiplier
                orderSizeRange: [5, 20],        // Order size range in USD
                orderFrequency: 2000,           // New order every 2 seconds
                spreadPercentage: 0.1,          // 10% spread
                depthLevels: 10,                // Order book depth
                volatilityRange: [0.5, 0.9],    // High volatility
                description: 'Initial launch phase with micro-orders and high volatility'
            },
            EARLY_GROWTH: {
                name: 'EARLY_GROWTH',
                range: [10000, 100000],
                growthRate: 1.3,
                orderSizeRange: [50, 500],
                orderFrequency: 1000,           // Increased frequency
                spreadPercentage: 0.05,         // 5% spread
                depthLevels: 20,
                volatilityRange: [0.3, 0.7],
                description: 'Early adoption phase with increasing order sizes'
            },
            VIRAL: {
                name: 'VIRAL',
                range: [100000, 1000000],
                growthRate: 1.2,
                orderSizeRange: [100, 2000],
                orderFrequency: 500,            // Peak trading frequency
                spreadPercentage: 0.03,         // 3% spread
                depthLevels: 30,
                volatilityRange: [0.4, 0.8],
                description: 'Viral growth phase with peak trading activity'
            },
            ESTABLISHMENT: {
                name: 'ESTABLISHMENT',
                range: [1000000, 10000000],
                growthRate: 1.1,
                orderSizeRange: [500, 5000],
                orderFrequency: 750,            // Stabilizing frequency
                spreadPercentage: 0.02,         // 2% spread
                depthLevels: 40,
                volatilityRange: [0.2, 0.5],
                description: 'Establishment phase with larger, more stable orders'
            },
            MATURATION: {
                name: 'MATURATION',
                range: [10000000, 100000000],
                growthRate: 1.05,
                orderSizeRange: [1000, 20000],
                orderFrequency: 1000,           // Moderate frequency
                spreadPercentage: 0.01,         // 1% spread
                depthLevels: 50,
                volatilityRange: [0.1, 0.3],
                description: 'Maturation phase with institutional-size orders'
            },
            PEAK: {
                name: 'PEAK',
                range: [100000000, 500000000],
                growthRate: 1.02,
                orderSizeRange: [5000, 100000],
                orderFrequency: 1500,           // Steady frequency
                spreadPercentage: 0.005,        // 0.5% spread
                depthLevels: 60,
                volatilityRange: [0.05, 0.2],
                description: 'Peak phase with maximum stability and depth'
            }
        };

        // Initialize at LAUNCH stage
        this.currentStage = 'LAUNCH';
        this.currentMarketCap = this.STAGES.LAUNCH.range[0];
        
        // Growth metrics
        this.metrics = {
            momentum: 0,           // Growth momentum (-1 to 1)
            volatility: 0.5,       // Current volatility
            growthRate: 1.5,       // Current growth rate
            lastUpdate: Date.now() // Last update timestamp
        };

        // Stage transition callback
        this.onStageChange = null;
    }

    /**
     * Set callback for stage transitions
     * @param {Function} callback Callback function
     */
    setStageChangeCallback(callback) {
        this.onStageChange = callback;
    }

    /**
     * Update current market cap
     * @param {number} newMarketCap New market cap value
     */
    setMarketCap(newMarketCap) {
        const oldStage = this.currentStage;
        this.currentMarketCap = newMarketCap;
        
        // Check for stage progression
        if (this.shouldAdvanceStage()) {
            const newStage = this.progressStage();
            if (newStage && this.onStageChange) {
                this.onStageChange(oldStage, newStage.name, newMarketCap);
            }
        }
    }

    /**
     * Calculate appropriate order size based on current stage and market cap
     * @returns {Object} Min and max order sizes
     */
    calculateOrderSize() {
        const stage = this.STAGES[this.currentStage];
        const progressInStage = (this.currentMarketCap - stage.range[0]) / (stage.range[1] - stage.range[0]);
        
        return {
            min: stage.orderSizeRange[0] * (1 + progressInStage),
            max: stage.orderSizeRange[1] * (1 + progressInStage)
        };
    }

    /**
     * Determine if market should progress to next stage
     * @returns {boolean} Whether stage should advance
     */
    shouldAdvanceStage() {
        const currentStageData = this.STAGES[this.currentStage];
        return this.currentMarketCap >= currentStageData.range[1];
    }

    /**
     * Get current stage characteristics
     * @returns {Object} Current stage data
     */
    getCurrentStageData() {
        return {
            ...this.STAGES[this.currentStage],
            currentMarketCap: this.currentMarketCap,
            metrics: this.metrics
        };
    }

    /**
     * Update market metrics based on recent activity
     * @param {Object} params Update parameters
     */
    updateMetrics({ volumeChange = 0, priceChange = 0, timeElapsed = 0 }) {
        const stage = this.STAGES[this.currentStage];
        
        // Update momentum based on recent changes
        this.metrics.momentum = Math.max(-1, Math.min(1, 
            (volumeChange * 0.3) + (priceChange * 0.7)
        ));

        // Update volatility within stage bounds
        const [minVol, maxVol] = stage.volatilityRange;
        this.metrics.volatility = Math.max(minVol, Math.min(maxVol,
            this.metrics.volatility * (1 + priceChange)
        ));

        // Update growth rate based on momentum
        this.metrics.growthRate = stage.growthRate * (1 + (this.metrics.momentum * 0.1));
        
        // Log updates if significant changes
        if (Math.abs(volumeChange) > 0.1 || Math.abs(priceChange) > 0.1) {
            console.log('Market Metrics Updated:', {
                stage: this.currentStage,
                marketCap: this.currentMarketCap,
                metrics: this.metrics
            });
        }
    }

    /**
     * Progress to next stage if conditions are met
     * @returns {Object|null} New stage data if advanced, null if not
     */
    progressStage() {
        const stages = Object.keys(this.STAGES);
        const currentIndex = stages.indexOf(this.currentStage);
        
        if (currentIndex < stages.length - 1 && this.shouldAdvanceStage()) {
            const oldStage = this.currentStage;
            this.currentStage = stages[currentIndex + 1];
            
            if (this.onStageChange) {
                this.onStageChange(oldStage, this.currentStage, this.currentMarketCap);
            }
            
            console.log(`Advanced to ${this.currentStage} stage at market cap $${this.currentMarketCap}`);
            return this.getCurrentStageData();
        }
        
        return null;
    }
}

export default MarketGrowthStages; 