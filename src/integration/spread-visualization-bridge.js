import SpreadPatternManager from '../utils/spread-pattern-manager';
import { generateSpreadPoints } from '../utils/spread-utils';
import VirusStateMachine from '../utils/virus-state-machine';

class SpreadVisualizationBridge {
    constructor(layerManager) {
        this.patternManager = new SpreadPatternManager();
        this.layerManager = layerManager;
        this.activeVisualizations = new Map();
        this.lastUpdate = performance.now();
        this.virusStateMachine = new VirusStateMachine();
    }

    updateMarketConditions(marketData) {
        // Update pattern manager
        this.patternManager.updateMarketConditions({
            trend: (marketData.marketCap - marketData.previousMarketCap) / marketData.previousMarketCap,
            volatility: marketData.volatility,
            strength: marketData.marketCap / marketData.maxMarketCap
        });

        // Update virus state machine
        this.virusStateMachine.updateMarketState({
            trend: (marketData.marketCap - marketData.previousMarketCap) / marketData.previousMarketCap,
            volatility: marketData.volatility,
            strength: marketData.marketCap / marketData.maxMarketCap
        });

        // Update all active patterns
        const patterns = this.patternManager.getActivePatterns();
        patterns.forEach(pattern => {
            this.updateVisualization(pattern, true); // Force update on market condition change
        });

        return patterns.length;
    }

    async createSpreadPattern(type, position, config = {}) {
        try {
            console.log('SpreadVisualizationBridge: Creating pattern with config:', { type, position, config });
            
            // Create pattern with modified template based on config
            const template = this.patternManager.patternTemplates[type];
            if (!template) {
                throw new Error(`Unknown pattern type: ${type}`);
            }

            // Apply configuration to template
            const modifiedTemplate = {
                ...template,
                baseSpeed: config.speed !== undefined ? config.speed : template.baseSpeed,
                baseIntensity: config.intensity !== undefined ? config.intensity : template.baseIntensity,
                branchingFactor: config.branchingFactor !== undefined ? config.branchingFactor : template.branchingFactor
            };

            // Initialize virus state machine with pattern
            this.virusStateMachine.initializeFromCenters([{
                lng: position[0],
                lat: position[1],
                intensity: modifiedTemplate.baseIntensity,
                speed: modifiedTemplate.baseSpeed,
                branchingFactor: modifiedTemplate.branchingFactor
            }]);

            // Create pattern with modified template
            const pattern = this.patternManager.createPattern(type, {
                x: position[0],
                y: position[1]
            }, modifiedTemplate);

            if (!pattern) {
                console.error('SpreadVisualizationBridge: Failed to create pattern');
                return null;
            }

            // Create visualization for the pattern
            const points = this.virusStateMachine.getAllPoints();
            const spreadPoints = points.map(p => ({
                coordinates: [p.lng, p.lat],
                weight: p.weight
            }));

            const animationController = await this.layerManager.addVirusSpread(
                pattern.id,
                {
                    source: { coordinates: position },
                    spread: spreadPoints
                },
                {
                    intensity: pattern.intensity,
                    speed: pattern.speed
                }
            );

            if (!animationController) {
                console.error('SpreadVisualizationBridge: Failed to create animation controller');
                return null;
            }

            this.activeVisualizations.set(pattern.id, {
                pattern,
                animationController,
                lastPosition: position,
                lastUpdate: performance.now()
            });

            return pattern.id;
        } catch (error) {
            console.error('SpreadVisualizationBridge: Error creating spread pattern:', error);
            return null;
        }
    }

    updateVisualization(pattern, forceUpdate = false) {
        const visual = this.activeVisualizations.get(pattern.id);
        if (!visual) {
            console.log('SpreadVisualizationBridge: No visualization found for pattern:', pattern.id);
            return false;
        }

        const now = performance.now();
        const deltaTime = (now - visual.lastUpdate) / 1000;
        
        // Evolve virus state
        this.virusStateMachine.evolve(deltaTime);
        const points = this.virusStateMachine.getAllPoints();
        
        // Update visualization with new points
        const spreadPoints = points.map(p => ({
            coordinates: [p.lng, p.lat],
            weight: p.weight * pattern.intensity
        }));

        this.layerManager.updateLayer(`${pattern.id}-heat`, {
            data: spreadPoints,
            getWeight: d => d.weight,
            intensity: 1 + pattern.intensity * 2,
            radiusPixels: 30 * pattern.speed
        });

        // Update center point
        const centerPoint = {
            coordinates: [pattern.position.x, pattern.position.y]
        };
        this.layerManager.updateLayer(`${pattern.id}-point`, {
            data: [centerPoint]
        });

        visual.lastUpdate = now;
        return true;
    }

    evolvePatterns(deltaTime) {
        const patterns = this.patternManager.getActivePatterns();
        const updates = [];
        const terminatedPatterns = [];

        patterns.forEach(pattern => {
            const evolvedPattern = this.patternManager.evolvePattern(pattern, deltaTime);
            if (evolvedPattern) {
                const updated = this.updateVisualization(evolvedPattern);
                if (updated) {
                    updates.push(evolvedPattern.id);
                }
            } else {
                terminatedPatterns.push(pattern.id);
            }
        });

        // Clean up terminated patterns
        terminatedPatterns.forEach(id => {
            const visual = this.activeVisualizations.get(id);
            if (visual) {
                visual.animationController.stop();
                this.activeVisualizations.delete(id);
                
                // Remove layers
                this.layerManager.updateLayer(`${id}-heat`, { remove: true });
                this.layerManager.updateLayer(`${id}-point`, { remove: true });
            }
        });

        return updates;
    }

    update() {
        const now = performance.now();
        const deltaTime = (now - this.lastUpdate) / 1000; // Convert to seconds
        this.lastUpdate = now;

        return this.evolvePatterns(deltaTime);
    }

    cleanup() {
        this.activeVisualizations.forEach((visual) => {
            visual.animationController.stop();
            
            // Remove layers
            const id = visual.pattern.id;
            this.layerManager.updateLayer(`${id}-heat`, { remove: true });
            this.layerManager.updateLayer(`${id}-point`, { remove: true });
        });
        this.activeVisualizations.clear();
        this.patternManager.cleanup();
    }

    updatePatternParameters(patternId, params) {
        console.log('SpreadVisualizationBridge: Updating pattern parameters:', { patternId, params });
        
        const visual = this.activeVisualizations.get(patternId);
        if (!visual) {
            console.warn('SpreadVisualizationBridge: No visualization found for pattern:', patternId);
            return false;
        }

        const pattern = visual.pattern;
        
        // Update pattern properties
        pattern.speed = params.speed;
        pattern.intensity = params.intensity;
        pattern.branchingFactor = params.branchingFactor;

        // Update animation speed
        const animation = this.layerManager.activeAnimations.get(patternId);
        if (animation) {
            animation.speed = pattern.speed;
            animation.intensity = pattern.intensity;
        }

        // Force an immediate visualization update with new spread points
        const newPosition = [pattern.position.x, pattern.position.y];
        const visualConfig = {
            minPoints: 25 + Math.floor(pattern.intensity * 15),
            maxPoints: 35 + Math.floor(pattern.intensity * 20),
            baseRadius: 0.8 * pattern.speed,
            weightFalloff: 0.4 * (1 - pattern.intensity),
            clusterProbability: 0.7 * pattern.branchingFactor
        };

        const spreadPoints = generateSpreadPoints(newPosition, visualConfig);
        
        // Update layers with new configuration
        this.layerManager.updateLayer(`${pattern.id}-heat`, {
            data: spreadPoints,
            getWeight: d => d.weight * pattern.intensity,
            intensity: 1 + pattern.intensity * 2,
            radiusPixels: 30 * pattern.speed
        });

        this.layerManager.updateLayer(`${pattern.id}-point`, {
            data: [{ coordinates: newPosition }],
            getRadius: 20 * pattern.speed
        });

        return true;
    }

    removePattern(patternId) {
        console.log('SpreadVisualizationBridge: Removing pattern:', patternId);
        
        const visual = this.activeVisualizations.get(patternId);
        if (!visual) {
            console.warn('SpreadVisualizationBridge: No visualization found for pattern:', patternId);
            return false;
        }

        // Stop animation and remove visualization
        visual.animationController.stop();
        this.activeVisualizations.delete(patternId);
        
        // Remove layers
        this.layerManager.updateLayer(`${patternId}-heat`, { remove: true });
        this.layerManager.updateLayer(`${patternId}-point`, { remove: true });

        // Remove from pattern manager
        this.patternManager.removePattern(patternId);

        return true;
    }

    getVirusPoints() {
        if (!this.virusStateMachine) {
            return [];
        }
        return this.virusStateMachine.getAllPoints();
    }
}

export default SpreadVisualizationBridge; 