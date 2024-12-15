import MarketResponseSystem from './market-response-system';

class VirusStateMachine {
    constructor() {
        // Core state storage
        this.stablePoints = new Map();  // Points that are established
        this.growthFrontier = new Map(); // Points actively growing
        this.growthHistory = new Map();  // Successful growth patterns

        // Market state tracking with enhanced metrics
        this.marketState = {
            trend: 0,
            strength: 0,
            volatility: 0,
            momentum: 0,
            volume: 0,
            sentiment: 0
        };

        // Thresholds for market conditions
        this.thresholds = {
            trend: {
                strong_positive: 0.3,
                positive: 0.1,
                negative: -0.1,
                strong_negative: -0.3
            },
            volatility: {
                high: 0.7,
                medium: 0.4,
                low: 0.2
            }
        };

        // Growth parameters with market influence
        this.growthParams = {
            baseGrowthRate: 0.05,
            maxPoints: 2000,
            minWeight: 0.3,
            decayRate: 0.02,
            mutationRate: 0.01,
            adaptationRate: 0.03
        };

        // Pattern recognition
        this.patterns = {
            exponential: { weight: 0, threshold: 0.7 },
            linear: { weight: 0, threshold: 0.3 },
            clustered: { weight: 0, threshold: 0.5 }
        };

        // Market adaptation metrics
        this.adaptation = {
            resistanceFactor: 1.0,
            recoveryRate: 0.02,
            mutationProbability: 0.01
        };

        // Initialize market response system
        this.marketResponseSystem = new MarketResponseSystem();
    }

    initializeFromCenters(centers) {
        this.stablePoints.clear();
        this.growthFrontier.clear();
        this.growthHistory.clear();

        // Initialize with center points
        centers.forEach(center => {
            const key = `${center.lng},${center.lat}`;
            const point = {
                position: { lng: center.lng, lat: center.lat },
                weight: 1.0,
                generation: 0,
                direction: null,
                isSource: true
            };

            this.stablePoints.set(key, point);
            this.growthFrontier.set(key, point);
        });

        return this.getAllPoints();
    }

    updateMarketState(marketData) {
        const previousStrength = this.marketState.strength;
        
        // Enhanced market state tracking
        this.marketState = {
            trend: (marketData.marketCap - (this.lastMarketCap || marketData.marketCap)) / 
                   (this.lastMarketCap || marketData.marketCap),
            strength: Math.min(1, marketData.marketCap / 1000000),
            volatility: marketData.volatility,
            momentum: this.calculateMomentum(marketData),
            volume: this.normalizeVolume(marketData.volume),
            sentiment: this.calculateSentiment(marketData)
        };

        this.lastMarketCap = marketData.marketCap;

        // Get market response effects
        const responseEffects = this.marketResponseSystem.processMarketUpdate({
            trend: this.marketState.trend,
            volatility: this.marketState.volatility,
            volume: this.marketState.volume
        });

        // Store current values before applying effects
        const currentGrowthRate = this.growthParams.baseGrowthRate;
        const currentMutationRate = this.growthParams.mutationRate;
        const currentAdaptationRate = this.growthParams.adaptationRate;

        // Apply response effects to growth parameters with limits
        const marketImpact = Math.min(0.7, Math.abs(this.marketState.trend) + this.marketState.volatility);
        this.growthParams.baseGrowthRate = Math.max(0.01, 
            currentGrowthRate * (responseEffects.spreadRate * (1 - marketImpact))); // Dynamic reduction based on market impact
        this.growthParams.mutationRate = Math.max(0.005, 
            currentMutationRate * responseEffects.mutationRate);
        this.growthParams.adaptationRate = Math.max(0.01, 
            currentAdaptationRate * responseEffects.recoveryRate);

        // Additional growth rate adjustment for extreme market conditions
        if (this.marketState.trend < -0.3 || this.marketState.volatility > 0.7) {
            this.growthParams.baseGrowthRate *= 0.6; // Even more aggressive reduction
        }

        // Final adjustment for extreme volatility
        if (this.marketState.volatility > 0.9) {
            this.growthParams.baseGrowthRate *= 0.9; // Additional reduction for extreme volatility
        }

        // Apply response effects to adaptation metrics with limits
        this.adaptation.resistanceFactor = Math.max(0.2, 
            this.adaptation.resistanceFactor * responseEffects.resistanceFactor);
        this.adaptation.mutationProbability = Math.max(0.005, 
            this.adaptation.mutationProbability * responseEffects.mutationRate);
        this.adaptation.recoveryRate = Math.max(0.01, 
            this.adaptation.recoveryRate * responseEffects.recoveryRate);

        // Update growth parameters based on market conditions
        this.updateGrowthParameters();
        
        // Handle market conditions
        if (this.marketState.trend < 0) {
            this.handleMarketDecline();
        } else {
            this.handleMarketGrowth();
        }

        // Update adaptation metrics
        this.updateAdaptationMetrics();
        
        return this.marketState;
    }

    calculateMomentum(marketData) {
        // Calculate market momentum using recent price changes
        const recentChanges = marketData.recentPrices || [];
        if (recentChanges.length < 2) return 0;
        
        const momentum = recentChanges.reduce((acc, price, i) => {
            if (i === 0) return acc;
            return acc + (price - recentChanges[i-1]);
        }, 0) / (recentChanges.length - 1);
        
        return Math.tanh(momentum); // Normalize to [-1, 1]
    }

    normalizeVolume(volume) {
        // Normalize volume to [0, 1] range
        const maxVolume = 1000000; // Adjust based on your scale
        return Math.min(1, volume / maxVolume);
    }

    calculateSentiment(marketData) {
        // Calculate market sentiment [-1, 1]
        const sentiment = (
            this.marketState.trend * 0.4 +
            this.marketState.momentum * 0.3 +
            (this.marketState.strength - 0.5) * 0.3
        );
        return Math.tanh(sentiment);
    }

    updateGrowthParameters() {
        // Dynamic growth parameter adjustment
        this.growthParams.baseGrowthRate = 0.05 * (1 + this.marketState.strength);
        this.growthParams.mutationRate = 0.01 * (1 + Math.abs(this.marketState.volatility));
        this.growthParams.adaptationRate = 0.03 * (1 + Math.abs(this.marketState.momentum));
        
        // Update pattern weights based on market conditions
        this.updatePatternWeights();
    }

    updatePatternWeights() {
        // Adjust pattern weights based on market conditions
        this.patterns.exponential.weight = Math.max(0, this.marketState.trend);
        this.patterns.linear.weight = 1 - Math.abs(this.marketState.trend);
        this.patterns.clustered.weight = Math.abs(this.marketState.volatility);
    }

    updateAdaptationMetrics() {
        // Update virus adaptation metrics based on market conditions
        this.adaptation.resistanceFactor *= (1 + this.marketState.strength * 0.1);
        this.adaptation.recoveryRate = 0.02 * (1 + Math.abs(this.marketState.sentiment));
        this.adaptation.mutationProbability = 0.01 * (1 + this.marketState.volatility);
    }

    handleMarketGrowth() {
        // Enhanced growth behavior during positive market conditions
        const growthBoost = Math.max(0, this.marketState.trend) * 0.2;
        this.growthParams.baseGrowthRate += growthBoost;
        
        // Increase adaptation rate during growth
        this.adaptation.resistanceFactor *= (1 + growthBoost);
    }

    handleMarketDecline() {
        // Enhanced decline behavior
        const removalRate = Math.min(0.3, Math.abs(this.marketState.trend));
        const frontierPoints = Array.from(this.growthFrontier.keys());
        
        // Calculate points to remove based on market conditions
        const pointsToRemove = Math.floor(frontierPoints.length * removalRate);
        
        // Remove points strategically based on market conditions
        this.removeStrategicPoints(pointsToRemove, frontierPoints);
        
        // Increase mutation probability during market stress
        this.adaptation.mutationProbability *= (1 + Math.abs(this.marketState.trend));
    }

    removeStrategicPoints(pointsToRemove, frontierPoints) {
        // Strategic point removal based on market conditions
        for (let i = 0; i < pointsToRemove; i++) {
            const randomIndex = Math.floor(Math.random() * frontierPoints.length);
            const key = frontierPoints[randomIndex];
            
            const point = this.growthFrontier.get(key);
            if (!point.isSource && this.shouldRemovePoint(point)) {
                this.growthFrontier.delete(key);
                this.stablePoints.delete(key);
            }
            
            frontierPoints.splice(randomIndex, 1);
        }
    }

    shouldRemovePoint(point) {
        // Enhanced point removal logic based on market conditions
        const removalChance = 0.5 * (
            1 + Math.abs(this.marketState.trend) +
            this.marketState.volatility * 0.3
        );
        
        return Math.random() < removalChance;
    }

    evolve(progress) {
        if (this.growthFrontier.size === 0) {
            // Reinitialize from stable source points if frontier is empty
            this.stablePoints.forEach((point, key) => {
                if (point.isSource) {
                    this.growthFrontier.set(key, point);
                }
            });
        }

        const newPoints = new Map();
        const pointsToStabilize = new Set();

        // Grow from frontier points
        this.growthFrontier.forEach((point, key) => {
            if (this.shouldGrow(point)) {
                const newGrowthPoints = this.growFromPoint(point, progress);
                
                // Add new points
                newGrowthPoints.forEach(newPoint => {
                    const newKey = `${newPoint.position.lng},${newPoint.position.lat}`;
                    if (!this.stablePoints.has(newKey) && 
                        !this.growthFrontier.has(newKey) && 
                        !newPoints.has(newKey)) {
                        newPoints.set(newKey, newPoint);
                    }
                });

                // Stabilize current point
                if (!point.isSource) {
                    pointsToStabilize.add(key);
                }
            }
        });

        // Update state
        newPoints.forEach((point, key) => {
            this.growthFrontier.set(key, point);
            this.stablePoints.set(key, point);
        });

        pointsToStabilize.forEach(key => {
            this.growthFrontier.delete(key);
        });

        return this.getAllPoints();
    }

    shouldGrow(point) {
        const growthChance = this.growthParams.baseGrowthRate * 
            (1 + this.marketState.strength) * 
            (1 - (point.generation * this.growthParams.decayRate));
        
        return Math.random() < growthChance;
    }

    growFromPoint(point, progress) {
        const newPoints = [];
        const baseAngle = this.getGrowthDirection(point, progress);
        
        // Main growth point
        const newPoint = this.createNewPoint(point, baseAngle);
        if (newPoint) newPoints.push(newPoint);

        // Branch based on market conditions
        if (this.shouldBranch(point)) {
            const branchAngle1 = baseAngle + Math.PI / 3;
            const branchAngle2 = baseAngle - Math.PI / 3;
            
            const branch1 = this.createNewPoint(point, branchAngle1);
            const branch2 = this.createNewPoint(point, branchAngle2);
            
            if (branch1) newPoints.push(branch1);
            if (branch2) newPoints.push(branch2);
        }

        return newPoints;
    }

    getGrowthDirection(point, progress) {
        const key = `${Math.floor(point.position.lng * 1000)},${Math.floor(point.position.lat * 1000)}`;
        const historicalDirection = this.growthHistory.get(key);
        
        if (historicalDirection && Math.random() < 0.8) {
            // Follow historical direction with market-influenced variation
            const variation = (Math.random() - 0.5) * Math.PI / (3 + this.marketState.strength * 4);
            return historicalDirection + variation;
        } else if (point.direction !== null) {
            // Continue current direction with variation
            const variation = (Math.random() - 0.5) * Math.PI / (2 + this.marketState.strength * 3);
            return point.direction + variation;
        } else {
            // New direction with market influence
            const baseAngle = progress * Math.PI * 2;
            const variation = (Math.random() - 0.5) * Math.PI * (1 - this.marketState.strength * 0.5);
            return baseAngle + variation;
        }
    }

    createNewPoint(sourcePoint, angle) {
        const spreadDistance = 0.005 * (1 + this.marketState.strength * 0.5);
        
        const newLng = sourcePoint.position.lng + Math.cos(angle) * spreadDistance;
        const newLat = sourcePoint.position.lat + Math.sin(angle) * spreadDistance;
        
        // Record successful growth direction
        const sourceKey = `${Math.floor(sourcePoint.position.lng * 1000)},${Math.floor(sourcePoint.position.lat * 1000)}`;
        this.growthHistory.set(sourceKey, angle);

        return {
            position: { lng: newLng, lat: newLat },
            weight: sourcePoint.weight * 0.95,
            generation: sourcePoint.generation + 1,
            direction: angle,
            isSource: false
        };
    }

    shouldBranch(point) {
        const branchChance = 0.2 * 
            (1 + this.marketState.strength) * 
            (1 + this.marketState.volatility * 0.5) * 
            Math.max(0.2, 1 - (point.generation * 0.1));
        
        return Math.random() < branchChance;
    }

    getAllPoints() {
        return Array.from(this.stablePoints.values()).map(point => ({
            lng: point.position.lng,
            lat: point.position.lat,
            weight: point.weight * (point.isSource ? 1.0 : Math.max(this.growthParams.minWeight, 
                1 - (point.generation * this.growthParams.decayRate)))
        }));
    }

    getMarketResponses() {
        return {
            active: this.marketResponseSystem.getActiveResponses(),
            history: this.marketResponseSystem.getResponseHistory()
        };
    }

    clearMarketResponses() {
        this.marketResponseSystem.clearHistory();
    }
}

export default VirusStateMachine; 