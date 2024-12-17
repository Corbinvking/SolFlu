import MutationSystem from './mutation-system';
import TransmissionPatterns from './transmission-patterns';

class VirusPoint {
    constructor(position, intensity = 1.0, colorIntensity = 1.0) {
        this.position = position;
        this.intensity = intensity;
        this.colorIntensity = colorIntensity;
        this.age = 0;
        this.active = true;
        this.mutated = false;
        this.baseIntensity = intensity;
        this.generation = 0;
        this.isEdge = true;
    }
}

class Territory {
    constructor(gridSize = 0.01) {
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
            // Remove from edges if surrounded
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
        const neighbors = [
            [x + this.gridSize, y],
            [x - this.gridSize, y],
            [x, y + this.gridSize],
            [x, y - this.gridSize]
        ];
        return neighbors.every(pos => this.points.has(this.getGridKey(pos)));
    }

    getNeighborPositions(position) {
        const [x, y] = position;
        return [
            [x + this.gridSize, y],
            [x - this.gridSize, y],
            [x, y + this.gridSize],
            [x, y - this.gridSize],
            [x + this.gridSize, y + this.gridSize],
            [x - this.gridSize, y - this.gridSize],
            [x + this.gridSize, y - this.gridSize],
            [x - this.gridSize, y + this.gridSize]
        ].filter(pos => !this.points.has(this.getGridKey(pos)));
    }

    removePoint(position) {
        const key = this.getGridKey(position);
        if (this.points.has(key)) {
            this.coverage--;
            this.edges.delete(key);
            this.points.delete(key);
            
            // Check neighbors to update edges
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
        this.territory = new Territory(0.01); // Grid size of 0.01 degrees
        this.params = {
            intensity: 0.5,
            colorIntensity: 0.5,
            speed: 0.5,
            branchingFactor: 0.3,
            pattern: 'normal',
            marketCap: 380000,
            targetCoverage: 100 // Target number of grid cells to cover
        };
        this.center = [0, 0];
        this.maxPoints = 2000;
        this.baseSpreadRadius = 0.02;
        this.spreadRadius = this.baseSpreadRadius;
        this.minActivePoints = 20;
        this.growthMultiplier = 2.0;
        this.intensityFloor = 0.3;
        this.decayRate = 0.1;
        this.boostTimeout = null;
        this.originalParams = null;

        // Initialize subsystems
        this.mutationSystem = new MutationSystem();
        this.transmissionPatterns = new TransmissionPatterns();
    }

    initialize(center, params) {
        this.center = center;
        this.params = { ...this.params, ...params };
        const initialPoint = new VirusPoint(center, Math.max(1.0, this.params.intensity), this.params.colorIntensity);
        this.points = [initialPoint];
        this.territory.addPoint(initialPoint);
        
        // Reset subsystems
        this.mutationSystem.reset();
        this.transmissionPatterns.startPatternTransition(this.params.pattern);
    }

    update(deltaTime) {
        // Update mutation system with current parameters
        this.mutationSystem.updateMarketInfluence({
            marketCap: this.params.marketCap,
            volatility: this.params.colorIntensity,
            trend: (this.params.branchingFactor - 0.3) / 0.2
        });

        // Update transmission patterns
        this.transmissionPatterns.updatePattern({
            eventType: this.params.pattern,
            trend: (this.params.branchingFactor - 0.3) / 0.2
        }, deltaTime);

        // Calculate target coverage based on market cap
        this.params.targetCoverage = Math.floor(this.params.marketCap / 1000);

        // Handle territory growth or reduction
        if (this.territory.coverage < this.params.targetCoverage) {
            this.growTerritory(deltaTime);
        } else if (this.territory.coverage > this.params.targetCoverage) {
            this.shrinkTerritory(deltaTime);
        }

        // Update point intensities
        this.updatePointIntensities(deltaTime);

        // Ensure minimum active points
        if (this.points.length < this.minActivePoints) {
            this.regeneratePoints();
        }
    }

    growTerritory(deltaTime) {
        const growthPoints = Array.from(this.territory.edges).map(key => this.territory.points.get(key));
        const baseSpreadChance = this.params.speed * deltaTime * this.growthMultiplier;
        const spreadChance = this.transmissionPatterns.calculateSpreadChance(baseSpreadChance);

        growthPoints.forEach(point => {
            if (Math.random() < spreadChance) {
                const availablePositions = this.territory.getNeighborPositions(point.position);
                if (availablePositions.length > 0) {
                    const newPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
                    const newPoint = new VirusPoint(
                        newPosition,
                        point.intensity * 0.95,
                        this.params.colorIntensity
                    );
                    newPoint.generation = point.generation + 1;
                    this.points.push(newPoint);
                    this.territory.addPoint(newPoint);
                }
            }
        });
    }

    shrinkTerritory(deltaTime) {
        const removalRate = this.decayRate * deltaTime;
        const edgePoints = Array.from(this.territory.edges);
        const pointsToRemove = Math.ceil(edgePoints.length * removalRate);

        for (let i = 0; i < pointsToRemove && this.territory.coverage > this.params.targetCoverage; i++) {
            const randomIndex = Math.floor(Math.random() * edgePoints.length);
            const key = edgePoints[randomIndex];
            const point = this.territory.points.get(key);
            
            if (point && !this.isNearCenter(point.position)) {
                this.territory.removePoint(point.position);
                this.points = this.points.filter(p => p !== point);
                edgePoints.splice(randomIndex, 1);
            }
        }
    }

    isNearCenter(position) {
        const dx = position[0] - this.center[0];
        const dy = position[1] - this.center[1];
        return Math.sqrt(dx * dx + dy * dy) < this.baseSpreadRadius;
    }

    updatePointIntensities(deltaTime) {
        const minIntensity = Math.max(this.intensityFloor, this.params.intensity * 0.5);
        
        this.points.forEach(point => {
            point.age += deltaTime;
            point.colorIntensity = this.params.colorIntensity;
            
            if (point.intensity < minIntensity) {
                point.intensity = minIntensity;
            }

            if (this.params.intensity > point.baseIntensity) {
                point.intensity *= (1 + deltaTime * this.params.intensity);
                point.baseIntensity = this.params.intensity;
            }
        });
    }

    regeneratePoints() {
        while (this.points.length < this.minActivePoints) {
            const basePoint = this.points[0] || new VirusPoint(this.center, Math.max(1.0, this.params.intensity), this.params.colorIntensity);
            const { x, y } = this.transmissionPatterns.calculateSpreadPosition(
                basePoint.position,
                this.spreadRadius
            );
            const newPoint = new VirusPoint([x, y], Math.max(this.params.intensity, basePoint.intensity), this.params.colorIntensity);
            this.points.push(newPoint);
            this.territory.addPoint(newPoint);
        }
    }

    getPoints() {
        return this.points.map(p => ({
            position: p.position,
            intensity: p.intensity,
            colorIntensity: p.colorIntensity
        }));
    }

    updateParams(params) {
        this.params = { ...this.params, ...params };
        
        // Update transmission patterns
        this.transmissionPatterns.updatePattern({
            eventType: this.params.pattern,
            trend: (this.params.branchingFactor - 0.3) / 0.2
        }, 0);

        // Update spread radius based on pattern
        const currentPattern = this.transmissionPatterns.getCurrentParameters();
        this.spreadRadius = Math.max(
            this.baseSpreadRadius,
            this.baseSpreadRadius * currentPattern.distanceMultiplier * (1 + this.params.intensity)
        );
    }

    boostSpread(multiplier) {
        // Store original params if not already stored
        if (!this.originalParams) {
            this.originalParams = { ...this.params };
        }

        // Clear any existing timeout
        if (this.boostTimeout) {
            clearTimeout(this.boostTimeout);
        }

        // Apply boost
        this.params.intensity *= multiplier;
        this.params.speed *= multiplier;
        this.growthMultiplier *= multiplier;

        // Restore original values after 5 seconds
        this.boostTimeout = setTimeout(() => {
            if (this.originalParams) {
                this.params.intensity = this.originalParams.intensity;
                this.params.speed = this.originalParams.speed;
                this.growthMultiplier = 2.0;
                this.originalParams = null;
            }
        }, 5000);
    }

    suppressSpread(multiplier) {
        // Store original params if not already stored
        if (!this.originalParams) {
            this.originalParams = { ...this.params };
        }

        // Clear any existing timeout
        if (this.boostTimeout) {
            clearTimeout(this.boostTimeout);
        }

        // Apply suppression
        this.params.intensity *= multiplier;
        this.params.speed *= multiplier;
        this.growthMultiplier *= multiplier;

        // Restore original values after 5 seconds
        this.boostTimeout = setTimeout(() => {
            if (this.originalParams) {
                this.params.intensity = this.originalParams.intensity;
                this.params.speed = this.originalParams.speed;
                this.growthMultiplier = 2.0;
                this.originalParams = null;
            }
        }, 5000);
    }
}

export default VirusStateMachine; 