class TransmissionPatterns {
    constructor() {
        this.patterns = {
            normal: {
                angleVariation: Math.PI * 2,
                distanceMultiplier: 1.0,
                spreadChanceMultiplier: 1.0,
                intensityDecay: 0.95
            },
            explosive: {
                angleVariation: Math.PI * 2,
                distanceMultiplier: 2.0,
                spreadChanceMultiplier: 1.5,
                intensityDecay: 0.9
            },
            contracting: {
                angleVariation: Math.PI / 2,
                distanceMultiplier: 0.5,
                spreadChanceMultiplier: 0.7,
                intensityDecay: 0.98
            },
            balanced: {
                angleVariation: Math.PI * 1.5,
                distanceMultiplier: 1.2,
                spreadChanceMultiplier: 1.2,
                intensityDecay: 0.97
            },
            directional: {
                angleVariation: Math.PI / 4,
                distanceMultiplier: 1.5,
                spreadChanceMultiplier: 1.3,
                intensityDecay: 0.93
            }
        };
        
        this.currentPattern = 'normal';
        this.transitionProgress = 0;
        this.transitionDuration = 1.0; // seconds
    }

    // Get transmission parameters for current pattern
    getCurrentParameters() {
        return this.patterns[this.currentPattern];
    }

    // Calculate spread position based on pattern
    calculateSpreadPosition(origin, baseDistance) {
        const pattern = this.patterns[this.currentPattern];
        
        // Calculate angle based on pattern
        const angle = (Math.random() - 0.5) * pattern.angleVariation;
        
        // Calculate actual distance
        const distance = baseDistance * pattern.distanceMultiplier * (0.8 + Math.random() * 0.4);
        
        return {
            x: origin[0] + Math.cos(angle) * distance,
            y: origin[1] + Math.sin(angle) * distance,
            angle: angle
        };
    }

    // Update pattern based on market conditions
    updatePattern(marketState, deltaTime) {
        let targetPattern = 'normal';

        // Determine pattern based on market conditions
        if (marketState.eventType === 'boom') {
            targetPattern = 'explosive';
        } else if (marketState.eventType === 'crash') {
            targetPattern = 'contracting';
        } else if (marketState.eventType === 'recovery') {
            targetPattern = 'balanced';
        } else if (Math.abs(marketState.trend) > 0.7) {
            targetPattern = 'directional';
        }

        // If pattern needs to change, start transition
        if (targetPattern !== this.currentPattern) {
            this.startPatternTransition(targetPattern);
        }

        // Update transition if in progress
        if (this.transitionProgress < 1.0) {
            this.transitionProgress = Math.min(1.0, 
                this.transitionProgress + (deltaTime / this.transitionDuration)
            );
        }
    }

    // Start transition to new pattern
    startPatternTransition(newPattern) {
        this.currentPattern = newPattern;
        this.transitionProgress = 0;
    }

    // Calculate spread chance based on current pattern
    calculateSpreadChance(baseChance) {
        return baseChance * this.patterns[this.currentPattern].spreadChanceMultiplier;
    }

    // Calculate intensity decay based on current pattern
    calculateIntensityDecay(baseIntensity) {
        return baseIntensity * this.patterns[this.currentPattern].intensityDecay;
    }

    // Get transition completion percentage
    getTransitionProgress() {
        return this.transitionProgress;
    }
}

export default TransmissionPatterns; 