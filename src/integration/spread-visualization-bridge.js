import SpreadPatternManager from '../utils/spread-pattern-manager';
import { generateSpreadPoints } from '../utils/spread-utils';

class SpreadVisualizationBridge {
    constructor(layerManager) {
        this.patternManager = new SpreadPatternManager();
        this.layerManager = layerManager;
        this.activeVisualizations = new Map();
        this.lastUpdate = performance.now();
    }

    updateMarketConditions(marketData) {
        this.patternManager.updateMarketConditions({
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
            const pattern = this.patternManager.createPattern(type, {
                x: position[0],
                y: position[1]
            });

            if (!pattern) {
                return null;
            }

            // Create visualization for the pattern
            const visualConfig = {
                minPoints: 25 + Math.floor(pattern.intensity * 15),
                maxPoints: 35 + Math.floor(pattern.intensity * 20),
                baseRadius: 0.8 * pattern.speed,
                weightFalloff: 0.4 * (1 - pattern.intensity),
                clusterProbability: 0.7 * pattern.branchingFactor
            };

            const spreadPoints = generateSpreadPoints(position, visualConfig);
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
            console.error('Error creating spread pattern:', error);
            return null;
        }
    }

    updateVisualization(pattern, forceUpdate = false) {
        const visual = this.activeVisualizations.get(pattern.id);
        if (!visual) return false;

        const newPosition = [pattern.position.x, pattern.position.y];
        const now = performance.now();
        
        // Only update visualization if position has changed significantly or forced
        const distance = Math.hypot(
            newPosition[0] - visual.lastPosition[0],
            newPosition[1] - visual.lastPosition[1]
        );

        const timeSinceLastUpdate = now - visual.lastUpdate;
        const shouldUpdate = forceUpdate || 
                           distance > 0.1 || 
                           timeSinceLastUpdate > 1000; // Update at least every second

        if (shouldUpdate) {
            const spreadPoints = generateSpreadPoints(newPosition, {
                minPoints: 25 + Math.floor(pattern.intensity * 15),
                maxPoints: 35 + Math.floor(pattern.intensity * 20),
                baseRadius: 0.8 * pattern.speed,
                weightFalloff: 0.4 * (1 - pattern.intensity),
                clusterProbability: 0.7 * pattern.branchingFactor
            });

            this.layerManager.updateLayer(`${pattern.id}-heat`, {
                data: spreadPoints,
                getWeight: d => d.weight * pattern.intensity,
                intensity: 1 + pattern.intensity * 2
            });

            this.layerManager.updateLayer(`${pattern.id}-point`, {
                data: [{ coordinates: newPosition }]
            });

            visual.lastPosition = newPosition;
            visual.lastUpdate = now;
            return true;
        }

        return false;
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
}

export default SpreadVisualizationBridge; 