import MutationSystem from './mutation-system';
import TransmissionPatterns from './transmission-patterns';
import GrowthStateManager from './growth-state-manager';
import SporeSystem from './spore-system';

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
    constructor(gridSize = 0.005, sporeSystem) {
        this.points = new Map();
        this.edges = new Set();
        this.gridSize = gridSize;
        this.coverage = 0;
        this.sporeSystem = sporeSystem;
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
            } else if (this.sporeSystem) {
                this.trackEdgePoint(point, key);
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

    trackEdgePoint(point, key) {
        if (point.isEdge && this.sporeSystem) {
            this.sporeSystem.registerPotentialSpore(key);
        }
    }
}

class VirusStateMachine {
    constructor() {
        this.sporeSystem = new SporeSystem();
        this.growthStateManager = new GrowthStateManager();
        this.mutationSystem = new MutationSystem();
        this.transmissionPatterns = new TransmissionPatterns();

        this.territory = new Territory(0.005, this.sporeSystem);
        
        this.points = [];
        this.params = {
            intensity: 0.5,
            colorIntensity: 0.5,
            speed: 0.5,
            pattern: 'normal',
            marketCap: 380000,
            targetCoverage: 40,
            growthMultiplier: 1.0
        };
        this.center = [0, 0];
        this.maxPoints = 4000;
        this.baseSpreadRadius = 0.04;
        this.lastGrowthTime = Date.now();
        this.growthInterval = 8;
        this.growthTimeout = null;
        this.debugMode = true;

        // Add cycle control
        this.autoCycleEnabled = false;
    }

    // Add methods to control automated cycle
    startAutomatedCycle() {
        this.autoCycleEnabled = true;
        this.growthStateManager.startAutomatedCycle();
        console.log('Started automated virus growth cycle');
    }

    stopAutomatedCycle() {
        this.autoCycleEnabled = false;
        this.growthStateManager.stopAutomatedCycle();
        console.log('Stopped automated virus growth cycle');
    }

    // Modify update method to use growth state
    update(deltaTime) {
        // Update color intensities based on volatility
        this.points.forEach(point => {
            point.colorIntensity = this.params.colorIntensity;
        });

        const now = Date.now();
        if (now - this.lastGrowthTime >= this.growthInterval) {
            // Get current growth state
            const currentState = this.growthStateManager.getCurrentState();
            
            // Update growth multiplier from state
            this.params.growthMultiplier = currentState.multiplier;

            // Handle spore activation based on state
            if (currentState.sporeActivation) {
                this.activateNewSpores();
            }

            this.updateTerritory();
            this.lastGrowthTime = now;

            if (this.debugMode) {
                console.log('Growth update:', {
                    state: currentState.name,
                    multiplier: currentState.multiplier,
                    coverage: this.territory.coverage
                });
            }
        }
    }

    // Modify spore activation to be more aggressive
    activateNewSpores() {
        const potentialSpores = this.sporeSystem.getActiveSporesForGrowth();
        if (potentialSpores.length === 0) return;

        // Increased base probability for faster activation
        const baseSporeProbability = 0.7;  // Increased from 0.6
        const currentState = this.growthStateManager.getCurrentState();
        const coverage = this.territory.coverage;
        
        // More aggressive coverage bonus
        const coverageBonus = Math.max(0, 0.3 * (1 - coverage / 2000)); // Doubled coverage threshold
        const finalProbability = Math.min(0.9, baseSporeProbability + coverageBonus); // Increased max probability

        potentialSpores.forEach(({ key }) => {
            const point = this.territory.points.get(key);
            if (point && Math.random() < finalProbability) {
                point.intensity = 1.4;  // Increased intensity for faster growth
                point.generation = 0;
                if (this.debugMode) {
                    console.log(`Activated spore at ${key} with probability ${finalProbability}`);
                }
            }
        });
    }

    // Modify boost/suppress to work with state manager
    boostSpread(multiplier) {
        console.log('Manual boost triggered:', multiplier);
        // Stop automated cycle if running
        if (this.autoCycleEnabled) {
            this.stopAutomatedCycle();
        }
        
        this.growthStateManager.transition('OUTBREAK');
        this.params.growthMultiplier = multiplier;
        this.activateNewSpores();

        if (this.growthTimeout) {
            clearTimeout(this.growthTimeout);
        }
        this.growthTimeout = setTimeout(() => {
            this.params.growthMultiplier = 1.0;
            // Restart automated cycle if it was enabled
            if (this.autoCycleEnabled) {
                this.startAutomatedCycle();
            }
        }, 5000);
    }

    suppressSpread(multiplier) {
        console.log('Manual suppress triggered:', multiplier);
        // Stop automated cycle if running
        if (this.autoCycleEnabled) {
            this.stopAutomatedCycle();
        }

        this.growthStateManager.transition('SETTLEMENT');
        this.params.growthMultiplier = multiplier;
        
        if (this.growthTimeout) {
            clearTimeout(this.growthTimeout);
        }
        this.growthTimeout = setTimeout(() => {
            this.params.growthMultiplier = 1.0;
            // Restart automated cycle if it was enabled
            if (this.autoCycleEnabled) {
                this.startAutomatedCycle();
            }
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

        // Start automated growth cycle
        this.autoCycleEnabled = true;
        this.growthStateManager.startAutomatedCycle();
        
        console.log('Initial points created:', this.points.length);
        console.log('Automated growth cycle started');
    }

    updateTerritory() {
        // Double the base target coverage and scaling
        const scaledMarketCap = this.params.marketCap * 1000;
        const baseTargetCoverage = Math.max(200, Math.floor(scaledMarketCap / 150)); // Doubled minimum and scaling
        const currentState = this.growthStateManager.getCurrentState();
        const targetCoverage = Math.floor(baseTargetCoverage * this.params.growthMultiplier);

        // Get all edge points for potential growth
        const edgePoints = Array.from(this.territory.edges)
            .map(key => this.territory.points.get(key))
            .filter(point => point.isEdge);

        // More aggressive growth probability
        const baseProb = 0.35; // Increased from 0.25
        const coverageRatio = this.territory.coverage / targetCoverage;
        const stateMultiplier = this.params.growthMultiplier;
        
        // Modified growth probability curve for more consistent growth
        const growthProb = baseProb * stateMultiplier * (1 - Math.pow(coverageRatio, 1.3)); // Reduced power for faster growth

        // Growth phase with minimum probability
        if (growthProb > 0 || edgePoints.length < 100) {  // Increased minimum edge points threshold
            const effectiveProb = Math.max(growthProb, edgePoints.length < 100 ? 0.4 : 0); // Increased minimum probability
            
            edgePoints.forEach(point => {
                if (Math.random() < effectiveProb) {
                    const availablePositions = this.territory.getNeighborPositions(point.position);
                    if (availablePositions.length > 0) {
                        const newPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
                        const newPoint = new VirusPoint(
                            newPosition,
                            1.0,
                            this.params.colorIntensity
                        );
                        this.points.push(newPoint);
                        this.territory.addPoint(newPoint);
                    }
                }
            });
        }

        // More conservative recession for larger size
        if (coverageRatio > 1.3) {  // Increased threshold for larger maximum size
            const recessionProb = 0.04 * (coverageRatio - 1.3);  // Reduced recession rate
            edgePoints.forEach(point => {
                if (Math.random() < recessionProb) {
                    this.territory.removePoint(point.position);
                    this.points = this.points.filter(p => p !== point);
                }
            });
        }
    }

    getPoints() {
        return this.points.map(p => ({
            position: p.position,
            colorIntensity: p.colorIntensity * this.params.growthMultiplier, // Dynamic color intensity
            radius: 3
        }));
    }

    updateParams(params) {
        this.params = { ...this.params, ...params };
    }
}

export default VirusStateMachine; 