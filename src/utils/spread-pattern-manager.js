class SpreadPatternManager {
    constructor() {
        this.activePatterns = new Map();
        this.patternTemplates = this.initializePatternTemplates();
        this.marketConditions = {
            trend: 0,
            volatility: 0,
            strength: 0
        };
    }

    initializePatternTemplates() {
        return {
            exponential: {
                baseSpeed: 1.5,
                baseIntensity: 2.0,
                branchingFactor: 0.3,
                adaptationRate: 0.2,
                marketSensitivity: {
                    trend: 0.6,
                    volatility: 0.3,
                    strength: 0.4
                }
            },
            linear: {
                baseSpeed: 1.0,
                baseIntensity: 1.0,
                branchingFactor: 0.1,
                adaptationRate: 0.1,
                marketSensitivity: {
                    trend: 0.3,
                    volatility: 0.2,
                    strength: 0.3
                }
            },
            clustered: {
                baseSpeed: 0.8,
                baseIntensity: 1.5,
                branchingFactor: 0.4,
                adaptationRate: 0.15,
                marketSensitivity: {
                    trend: 0.4,
                    volatility: 0.5,
                    strength: 0.3
                }
            }
        };
    }

    updateMarketConditions(marketData) {
        this.marketConditions = {
            trend: marketData.trend,
            volatility: marketData.volatility,
            strength: marketData.strength
        };

        // Update active patterns based on new market conditions
        this.activePatterns.forEach((pattern, id) => {
            this.modifyPattern(pattern);
        });
    }

    createPattern(type, initialPosition) {
        const template = this.patternTemplates[type];
        if (!template) {
            throw new Error(`Unknown pattern type: ${type}`);
        }

        const pattern = {
            id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            position: initialPosition,
            speed: template.baseSpeed,
            intensity: template.baseIntensity,
            branchingFactor: template.branchingFactor,
            adaptationRate: template.adaptationRate,
            marketSensitivity: { ...template.marketSensitivity },
            age: 0,
            branches: [],
            active: true
        };

        // Apply initial market conditions
        this.modifyPattern(pattern);
        this.activePatterns.set(pattern.id, pattern);

        return pattern;
    }

    modifyPattern(pattern) {
        const template = this.patternTemplates[pattern.type];
        const sensitivity = pattern.marketSensitivity;

        // Modify speed based on market conditions
        pattern.speed = template.baseSpeed * (
            1 + 
            this.marketConditions.trend * sensitivity.trend +
            this.marketConditions.volatility * sensitivity.volatility
        );

        // Modify intensity based on market strength
        pattern.intensity = template.baseIntensity * (
            1 + this.marketConditions.strength * sensitivity.strength
        );

        // Adjust branching based on volatility
        pattern.branchingFactor = template.branchingFactor * (
            1 + this.marketConditions.volatility * 0.5
        );

        // Age-based modifications
        const ageFactor = Math.exp(-pattern.age * 0.1);
        pattern.intensity *= ageFactor;
        pattern.speed *= ageFactor;

        return pattern;
    }

    evolvePattern(pattern, deltaTime) {
        if (!pattern.active) return null;

        // Update age
        pattern.age += deltaTime;

        // Calculate new position based on pattern type and market conditions
        const movement = this.calculateMovement(pattern, deltaTime);
        pattern.position = {
            x: pattern.position.x + movement.x,
            y: pattern.position.y + movement.y
        };

        // Check for branching
        if (this.shouldBranch(pattern)) {
            this.createBranch(pattern);
        }

        // Check for pattern termination
        if (this.shouldTerminate(pattern)) {
            pattern.active = false;
            this.activePatterns.delete(pattern.id);
            return null;
        }

        return pattern;
    }

    calculateMovement(pattern, deltaTime) {
        const baseSpeed = pattern.speed * deltaTime;
        
        switch (pattern.type) {
            case 'exponential':
                return {
                    x: baseSpeed * (1 + Math.abs(this.marketConditions.trend)),
                    y: baseSpeed * this.marketConditions.volatility
                };
            
            case 'linear':
                return {
                    x: baseSpeed,
                    y: baseSpeed * 0.5 * Math.sin(pattern.age)
                };
            
            case 'clustered':
                return {
                    x: baseSpeed * Math.cos(pattern.age),
                    y: baseSpeed * Math.sin(pattern.age)
                };
            
            default:
                return { x: 0, y: 0 };
        }
    }

    shouldBranch(pattern) {
        const branchProbability = pattern.branchingFactor * (
            1 + this.marketConditions.volatility * 0.3 +
            this.marketConditions.strength * 0.4 +
            Math.abs(this.marketConditions.trend) * 0.3
        );
        
        // Increase base probability and reduce age penalty
        return Math.random() < branchProbability * Math.exp(-pattern.age * 0.1);
    }

    createBranch(parentPattern) {
        const branchType = this.selectBranchType(parentPattern);
        const branchPosition = { ...parentPattern.position };
        
        const branch = this.createPattern(branchType, branchPosition);
        branch.intensity *= 0.8; // Reduce intensity for branches
        
        parentPattern.branches.push(branch.id);
        return branch;
    }

    selectBranchType(parentPattern) {
        const marketStrength = this.marketConditions.strength;
        const marketTrend = this.marketConditions.trend;
        
        if (marketTrend > 0.3 && marketStrength > 0.5) {
            return 'exponential';
        } else if (Math.abs(marketTrend) < 0.2) {
            return 'linear';
        } else {
            return 'clustered';
        }
    }

    shouldTerminate(pattern) {
        const ageFactor = Math.exp(-pattern.age * 0.1);
        const marketFactor = 1 - Math.abs(this.marketConditions.trend);
        
        return (
            pattern.intensity < 0.1 ||
            ageFactor * marketFactor < 0.2 ||
            pattern.age > 10
        );
    }

    getActivePatterns() {
        return Array.from(this.activePatterns.values());
    }

    cleanup() {
        this.activePatterns.clear();
    }
}

export default SpreadPatternManager; 