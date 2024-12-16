import { UpdateQueue, SpreadMechanism } from './spread-components';
import SpreadVisualizationBridge from '../../integration/spread-visualization-bridge';
import SIRModelIntegration from '../../models/SIRModelIntegration';
import MutationSystem from '../../models/MutationSystem';

const HIGH_VOLATILITY_THRESHOLD = 0.75;
const INITIAL_PATTERNS = 2;
const ADDITIONAL_PATTERNS = 2;

class SpreadStateManager {
    constructor(layerManager) {
        this.spreadMechanics = new SpreadMechanism();
        this.updateQueue = new UpdateQueue();
        this.visualizationBridge = new SpreadVisualizationBridge(layerManager);
        this.sirModel = new SIRModelIntegration();
        this.mutationSystem = new MutationSystem();
        this.lastMarketData = null;
        this.lastUpdate = performance.now();
        this.initialPatternsCreated = 0;
        this.patternCount = 0;
        this.activePatterns = new Set();
    }

    async processMarketUpdate(marketData) {
        const now = performance.now();
        const deltaTime = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // Update SIR model with market data
        this.sirModel.updateParameters(marketData);
        const sirState = this.sirModel.evolve(deltaTime);
        const spreadFactors = this.sirModel.getSpreadFactors();

        // Process mutations for active patterns
        const activePatterns = this.visualizationBridge.getActivePatterns();
        for (const pattern of activePatterns) {
            const mutatedPattern = this.mutationSystem.attemptMutation(pattern, marketData);
            if (mutatedPattern !== pattern) {
                await this.updateQueue.addUpdate({
                    type: 'mutation',
                    data: {
                        patternId: pattern.id,
                        changes: mutatedPattern
                    },
                    priority: 'high'
                });
            }
        }

        // Determine if we should create new patterns
        const shouldCreatePatterns = 
            this.initialPatternsCreated < INITIAL_PATTERNS ||
            this.shouldCreateNewPattern(marketData, this.lastMarketData);

        const newPatternIds = [];
        const spreadUpdates = [];

        // Create initial patterns if needed
        if (this.initialPatternsCreated < INITIAL_PATTERNS) {
            for (let i = this.initialPatternsCreated; i < INITIAL_PATTERNS; i++) {
                const patternType = this.determinePatternType(marketData);
                const position = this.calculateNewPatternPosition(marketData, i);
                
                try {
                    const patternId = await this.visualizationBridge.createSpreadPattern(
                        patternType, 
                        position,
                        spreadFactors
                    );
                    
                    if (patternId) {
                        await this.updateQueue.addUpdate({
                            type: 'spread',
                            data: {
                                type: 'pattern_created',
                                patternId,
                                position
                            },
                            priority: 'high'
                        });

                        newPatternIds.push(patternId);
                        this.patternCount++;
                        this.activePatterns.add(patternId);
                        this.initialPatternsCreated++;
                    }
                } catch (error) {
                    console.error('Error creating initial pattern:', error);
                }
            }
        }

        // Create additional patterns if conditions are met
        if (shouldCreatePatterns && this.initialPatternsCreated >= INITIAL_PATTERNS) {
            const basePosition = this.calculateNewPatternPosition(marketData);
            const createdPatterns = [];
            
            for (let i = 0; i < ADDITIONAL_PATTERNS; i++) {
                const patternType = this.determinePatternType(marketData);
                const angle = (i / ADDITIONAL_PATTERNS) * Math.PI * 2;
                const position = this.adjustPositionByAngle(basePosition, angle);
                
                try {
                    const patternId = await this.visualizationBridge.createSpreadPattern(
                        patternType, 
                        position,
                        spreadFactors
                    );
                    
                    if (patternId) {
                        await this.updateQueue.addUpdate({
                            type: 'spread',
                            data: {
                                type: 'pattern_created',
                                patternId,
                                position
                            },
                            priority: 'high'
                        });

                        newPatternIds.push(patternId);
                        this.patternCount++;
                        this.activePatterns.add(patternId);
                        createdPatterns.push({ patternId, position });
                    }
                } catch (error) {
                    console.error('Error creating pattern:', error);
                }
            }

            // Retry logic for failed pattern creation
            if (createdPatterns.length < ADDITIONAL_PATTERNS) {
                const remainingCount = ADDITIONAL_PATTERNS - createdPatterns.length;
                for (let i = 0; i < remainingCount; i++) {
                    const patternType = this.determinePatternType(marketData);
                    const angle = ((createdPatterns.length + i) / ADDITIONAL_PATTERNS) * Math.PI * 2;
                    const position = this.adjustPositionByAngle(basePosition, angle);
                    
                    try {
                        const patternId = await this.visualizationBridge.createSpreadPattern(
                            patternType, 
                            position,
                            spreadFactors
                        );
                        
                        if (patternId) {
                            await this.updateQueue.addUpdate({
                                type: 'spread',
                                data: {
                                    type: 'pattern_created',
                                    patternId,
                                    position
                                },
                                priority: 'high'
                            });

                            newPatternIds.push(patternId);
                            this.patternCount++;
                            this.activePatterns.add(patternId);
                            createdPatterns.push({ patternId, position });
                        }
                    } catch (error) {
                        console.error('Error creating additional pattern:', error);
                    }
                }
            }
        }

        // Update existing patterns with new spread factors
        const existingPatterns = Array.from(this.activePatterns);
        for (const patternId of existingPatterns) {
            await this.updateQueue.addUpdate({
                type: 'spread',
                data: {
                    type: 'pattern_updated',
                    patternId,
                    spreadFactors
                },
                priority: 'normal'
            });
        }

        this.lastMarketData = { ...marketData };

        return {
            newPatternIds,
            spreadUpdates,
            sirState,
            mutations: this.mutationSystem.getActiveMutations()
        };
    }

    shouldCreateNewPattern(marketData, previousData) {
        if (!previousData) return false;

        const volatilityChange = Math.abs(marketData.volatility - previousData.volatility);
        const significantVolatilityChange = volatilityChange > 0.2;
        
        const marketCapChange = Math.abs(
            (marketData.marketCap - previousData.marketCap) / previousData.marketCap
        );
        const significantMarketMove = marketCapChange > 0.1;

        return significantVolatilityChange || significantMarketMove;
    }

    determinePatternType(marketData) {
        if (marketData.volatility > HIGH_VOLATILITY_THRESHOLD) {
            return 'exponential';
        } else if (marketData.volatility > 0.3) {
            return 'clustered';
        } else {
            return 'linear';
        }
    }

    calculateNewPatternPosition(marketData, index = null) {
        // Calculate base position based on market data
        const x = (marketData.marketCap / marketData.maxMarketCap) * 2 - 1;
        const y = marketData.volatility * 2 - 1;

        // If index is provided, distribute initial patterns evenly
        if (index !== null) {
            const angle = (index / INITIAL_PATTERNS) * Math.PI * 2;
            return this.adjustPositionByAngle([x, y], angle);
        }

        return [x, y];
    }

    adjustPositionByAngle(basePosition, angle) {
        const radius = 0.3; // Fixed radius for consistent spacing
        return [
            basePosition[0] + Math.cos(angle) * radius,
            basePosition[1] + Math.sin(angle) * radius
        ];
    }

    calculatePriority(marketData) {
        return marketData.volatility > HIGH_VOLATILITY_THRESHOLD ? 'high' : 'normal';
    }

    update(deltaTime) {
        const now = performance.now();
        if (!deltaTime) {
            deltaTime = (now - this.lastUpdate) / 1000;
        }
        this.lastUpdate = now;

        // Update SIR model
        if (this.lastMarketData) {
            this.sirModel.evolve(deltaTime);
        }

        // Update visualization
        const updatedPatterns = this.visualizationBridge.update(deltaTime);
        
        // Remove terminated patterns
        const terminatedPatterns = Array.from(this.activePatterns).filter(id => 
            !updatedPatterns.includes(id)
        );
        terminatedPatterns.forEach(id => {
            this.activePatterns.delete(id);
            this.patternCount--;
        });

        // Cleanup old mutations
        this.mutationSystem.cleanup();

        return updatedPatterns;
    }

    cleanup() {
        this.updateQueue.clear();
        this.visualizationBridge.cleanup();
        this.sirModel.reset();
        this.mutationSystem.cleanup();
        this.lastMarketData = null;
        this.initialPatternsCreated = 0;
        this.patternCount = 0;
        this.activePatterns.clear();
    }
}

export default SpreadStateManager; 