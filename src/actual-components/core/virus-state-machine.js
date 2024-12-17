import MutationSystem from './mutation-system';
import TransmissionPatterns from './transmission-patterns';

class VirusPoint {
    constructor(position, intensity = 1.0, colorIntensity = 1.0) {
        this.position = position;
        this.intensity = intensity;
        this.colorIntensity = colorIntensity;
        this.age = 0;
        this.active = true;
        this.baseIntensity = intensity;
        this.generation = 0;
        this.isEdge = true;
    }
}

class Territory {
    constructor(gridSize = 0.005) {
        this.points = new Map();
        this.edges = new Set();
        this.gridSize = gridSize;
        this.coverage = 0;
    }

    getGridKey(position) {
        const x = Math.floor(position[0] / this.gridSize);
        const y = Math.floor(position[1] / this.gridSize);
        return `${x},${y}`;
    }

    addPoint(point) {
        const key = this.getGridKey(point.position);
        if (!this.points.has(key)) {
            this.coverage++;
            this.edges.add(key);
            if (this.isPointSurrounded(point.position)) {
                this.edges.delete(key);
                point.isEdge = false;
            }
        }
        this.points.set(key, point);
        return key;
    }

    isPointSurrounded(position) {
        const [x, y] = position;
        return [
            [x + this.gridSize, y],
            [x - this.gridSize, y],
            [x, y + this.gridSize],
            [x, y - this.gridSize]
        ].every(pos => this.points.has(this.getGridKey(pos)));
    }

    getNeighborPositions(position) {
        const [x, y] = position;
        return [
            [x + this.gridSize, y],
            [x - this.gridSize, y],
            [x, y + this.gridSize],
            [x, y - this.gridSize]
        ].filter(pos => !this.points.has(this.getGridKey(pos)));
    }

    removePoint(position) {
        const key = this.getGridKey(position);
        if (this.points.has(key)) {
            this.coverage--;
            this.edges.delete(key);
            this.points.delete(key);
            
            const neighbors = this.getNeighborPositions(position);
            neighbors.forEach(pos => {
                const neighborKey = this.getGridKey(pos);
                if (this.points.has(neighborKey)) {
                    const point = this.points.get(neighborKey);
                    if (!this.isPointSurrounded(pos)) {
                        this.edges.add(neighborKey);
                        point.isEdge = true;
                    }
                }
            });
        }
    }
}

class VirusStateMachine {
    constructor() {
        this.points = [];
        this.territory = new Territory(0.005);
        this.params = {
            intensity: 0.5,
            colorIntensity: 0.5,
            speed: 0.5,
            pattern: 'normal',
            marketCap: 380000,
            targetCoverage: 20,
            growthMultiplier: 1.0
        };
        this.center = [0, 0];
        this.maxPoints = 2000;
        this.baseSpreadRadius = 0.02;
        this.lastGrowthTime = Date.now();
        this.growthInterval = 16;
        this.growthTimeout = null;

        // Initialize subsystems
        this.mutationSystem = new MutationSystem();
        this.transmissionPatterns = new TransmissionPatterns();
    }

    boostSpread(multiplier) {
        console.log('Boosting spread rate:', multiplier);
        this.params.growthMultiplier = multiplier;
        
        // Reset multiplier after 5 seconds
        if (this.growthTimeout) {
            clearTimeout(this.growthTimeout);
        }
        this.growthTimeout = setTimeout(() => {
            this.params.growthMultiplier = 1.0;
        }, 5000);
    }

    suppressSpread(multiplier) {
        console.log('Suppressing spread rate:', multiplier);
        this.params.growthMultiplier = multiplier;
        
        // Reset multiplier after 5 seconds
        if (this.growthTimeout) {
            clearTimeout(this.growthTimeout);
        }
        this.growthTimeout = setTimeout(() => {
            this.params.growthMultiplier = 1.0;
        }, 5000);
    }

    initialize(center, params) {
        console.log('Initializing virus with center:', center);
        this.center = center;
        this.params = { ...this.params, ...params };
        
        // Create initial cluster of points
        const initialPoint = new VirusPoint(center, 1.0, this.params.colorIntensity);
        this.points = [initialPoint];
        this.territory.addPoint(initialPoint);

        // Add a few points around the center
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const offset = this.territory.gridSize;
            const position = [
                center[0] + Math.cos(angle) * offset,
                center[1] + Math.sin(angle) * offset
            ];
            const point = new VirusPoint(position, 1.0, this.params.colorIntensity);
            this.points.push(point);
            this.territory.addPoint(point);
        }

        console.log('Initial points created:', this.points.length);
    }

    update(deltaTime) {
        // Update color intensities based on volatility
        this.points.forEach(point => {
            point.colorIntensity = this.params.colorIntensity;
        });

        const now = Date.now();
        if (now - this.lastGrowthTime >= this.growthInterval) {
            this.updateTerritory();
            this.lastGrowthTime = now;
        }
    }

    updateTerritory() {
        // Use logarithmic scaling for market cap to prevent hitting a hard limit
        const scaledMarketCap = Math.log10(Math.max(100, this.params.marketCap)) * 1000;
        const baseTargetCoverage = Math.max(20, Math.floor(scaledMarketCap));
        const targetCoverage = Math.floor(baseTargetCoverage * this.params.growthMultiplier);

        console.log('Virus Growth Check:', {
            currentMarketCap: this.params.marketCap,
            scaledMarketCap,
            baseTargetCoverage,
            targetCoverage,
            growthMultiplier: this.params.growthMultiplier,
            currentCoverage: this.territory.coverage,
            currentPoints: this.points.length,
            edgePoints: this.territory.edges.size
        });

        if (this.territory.coverage < targetCoverage) {
            // Get all edge points for potential growth
            const edgePoints = Array.from(this.territory.edges)
                .map(key => this.territory.points.get(key))
                .filter(point => point.isEdge);

            let growthCount = 0;
            // Dynamic growth probability based on how far we are from target
            const coverageRatio = this.territory.coverage / targetCoverage;
            const baseGrowthProbability = 0.3 * (1 - coverageRatio);
            const adjustedProbability = baseGrowthProbability * this.params.growthMultiplier;

            // Try to grow from each edge point with dynamic probability
            edgePoints.forEach(point => {
                if (Math.random() < adjustedProbability) {
                    const availablePositions = this.territory.getNeighborPositions(point.position);
                    if (availablePositions.length > 0) {
                        const newPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
                        const newPoint = new VirusPoint(newPosition, 1.0, this.params.colorIntensity);
                        this.points.push(newPoint);
                        this.territory.addPoint(newPoint);
                        growthCount++;
                    }
                }
            });

            console.log('Growth Result:', {
                attemptedFrom: edgePoints.length,
                newPointsAdded: growthCount,
                totalPoints: this.points.length,
                coverageRatio,
                baseGrowthProbability,
                adjustedProbability
            });
        } else if (this.territory.coverage > targetCoverage) {
            // Remove points from the edges when shrinking
            const edgePoints = Array.from(this.territory.edges)
                .map(key => this.territory.points.get(key))
                .filter(point => point.isEdge);

            // More gradual shrinking based on how far we are over target
            const shrinkRatio = (this.territory.coverage - targetCoverage) / targetCoverage;
            const pointsToRemove = Math.min(
                10,
                Math.floor(edgePoints.length * shrinkRatio * 0.1)
            );

            for (let i = 0; i < pointsToRemove && edgePoints.length > 0; i++) {
                const pointToRemove = edgePoints[Math.floor(Math.random() * edgePoints.length)];
                this.territory.removePoint(pointToRemove.position);
                this.points = this.points.filter(p => p !== pointToRemove);
            }

            console.log('Shrink Result:', {
                shrinkRatio,
                pointsRemoved: pointsToRemove,
                remainingPoints: this.points.length
            });
        }
    }

    getPoints() {
        return this.points.map(p => ({
            position: p.position,
            colorIntensity: p.colorIntensity
        }));
    }

    updateParams(params) {
        this.params = { ...this.params, ...params };
    }
}

export default VirusStateMachine; 