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
        this.growthInterval = 100;
        this.growthTimeout = null;
        this.debugMode = true;

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
        console.log('Initializing virus at center:', center, 'with params:', params);
        
        // Create initial infection point
        const initialPoint = new VirusPoint(center, 1.0, 1.0);
        this.points = [initialPoint];
        this.territory = new Territory(0.005);
        this.territory.addPoint(initialPoint);

        // Add some surrounding points for better visibility
        const radius = 0.01;  // Smaller initial radius
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const offset = [
                Math.cos(angle) * radius,
                Math.sin(angle) * radius
            ];
            const position = [center[0] + offset[0], center[1] + offset[1]];
            const point = new VirusPoint(position, 0.8, 1.0);
            this.points.push(point);
            this.territory.addPoint(point);
        }

        console.log('Initial virus points created:', this.points.length);
        
        this.params = { ...this.params, ...params };
        this.active = true;
        this.lastGrowthTime = Date.now();
    }

    update(deltaTime) {
        if (this.debugMode) {
            console.log('Virus Update:', {
                deltaTime,
                currentPoints: this.points.length,
                timeSinceLastGrowth: Date.now() - this.lastGrowthTime
            });
        }

        // Update color intensities based on volatility
        this.points.forEach(point => {
            point.colorIntensity = Math.min(1.0, this.params.colorIntensity * 2);
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

        if (this.debugMode) {
            console.log('Growth Check:', {
                currentCoverage: this.territory.coverage,
                targetCoverage,
                growthMultiplier: this.params.growthMultiplier,
                edgePoints: this.territory.edges.size
            });
        }

        if (this.territory.coverage < targetCoverage) {
            // Get all edge points for potential growth
            const edgePoints = Array.from(this.territory.edges)
                .map(key => this.territory.points.get(key))
                .filter(point => point.isEdge);

            // Ensure we have at least some growth
            const minGrowthPoints = Math.max(1, Math.floor(edgePoints.length * 0.1));
            let growthCount = 0;

            // Try to grow from each edge point
            edgePoints.forEach(point => {
                if (growthCount < minGrowthPoints || Math.random() < 0.3 * this.params.growthMultiplier) {
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

            if (this.debugMode) {
                console.log('Growth Result:', {
                    newPointsAdded: growthCount,
                    totalPoints: this.points.length
                });
            }
        }
    }

    getPoints() {
        // Ensure we return points in the correct format for the ScatterplotLayer
        return this.points.map(point => ({
            position: Array.isArray(point.position) ? point.position : point,
            colorIntensity: point.colorIntensity || 1.0,
            radius: 10 * (point.intensity || 1.0)
        }));
    }

    updateParams(params) {
        this.params = { ...this.params, ...params };
        if (this.debugMode) {
            console.log('Updated params:', this.params);
        }
    }
}

export default VirusStateMachine; 