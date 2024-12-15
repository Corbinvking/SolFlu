class VirusStateMachine {
    constructor() {
        // Core state storage
        this.stablePoints = new Map();  // Points that are established
        this.growthFrontier = new Map(); // Points actively growing
        this.growthHistory = new Map();  // Successful growth patterns

        // Market state tracking
        this.marketState = {
            trend: 0,
            strength: 0,
            volatility: 0
        };

        // Growth parameters
        this.growthParams = {
            baseGrowthRate: 0.05,
            maxPoints: 2000,
            minWeight: 0.3,
            decayRate: 0.02
        };
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
        
        // Update market state
        this.marketState = {
            trend: (marketData.marketCap - (this.lastMarketCap || marketData.marketCap)) / 
                   (this.lastMarketCap || marketData.marketCap),
            strength: Math.min(1, marketData.marketCap / 1000000),
            volatility: marketData.volatility
        };

        this.lastMarketCap = marketData.marketCap;

        // Handle market decline
        if (this.marketState.trend < 0) {
            this.handleMarketDecline();
        }

        // Adjust growth parameters based on market
        this.growthParams.baseGrowthRate = 0.05 * (1 + this.marketState.strength);
        
        return this.marketState;
    }

    handleMarketDecline() {
        // Remove points from the frontier based on market decline
        const removalRate = Math.min(0.3, Math.abs(this.marketState.trend));
        const frontierPoints = Array.from(this.growthFrontier.keys());
        
        const pointsToRemove = Math.floor(frontierPoints.length * removalRate);
        for (let i = 0; i < pointsToRemove; i++) {
            const randomIndex = Math.floor(Math.random() * frontierPoints.length);
            const key = frontierPoints[randomIndex];
            
            // Don't remove source points
            if (!this.growthFrontier.get(key).isSource) {
                this.growthFrontier.delete(key);
                this.stablePoints.delete(key);
            }
            
            frontierPoints.splice(randomIndex, 1);
        }
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
}

export default VirusStateMachine; 