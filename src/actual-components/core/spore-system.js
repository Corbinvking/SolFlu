class SporeSystem {
    constructor() {
        this.activeSpores = new Set();
        this.potentialSpores = new Set();
        this.maturationStates = new Map();
        
        this.activationStates = {
            boosted: false,
            suppressed: false
        };

        this.debugMode = true;
    }

    // Register a point as a potential spore
    registerPotentialSpore(pointKey) {
        this.potentialSpores.add(pointKey);
        if (this.debugMode) {
            console.log(`Registered potential spore: ${pointKey}`);
        }
    }

    // Activate a spore point
    activateSpore(pointKey) {
        if (this.potentialSpores.has(pointKey)) {
            this.activeSpores.add(pointKey);
            this.potentialSpores.delete(pointKey);
            this.maturationStates.set(pointKey, {
                activatedAt: Date.now(),
                generation: 0
            });
            
            if (this.debugMode) {
                console.log(`Activated spore: ${pointKey}`);
            }
            return true;
        }
        return false;
    }

    // Check if a point is an active spore
    isActiveSpore(pointKey) {
        return this.activeSpores.has(pointKey);
    }

    // Get spore state
    getSporeState(pointKey) {
        if (this.activeSpores.has(pointKey)) {
            return {
                active: true,
                maturation: this.maturationStates.get(pointKey)
            };
        }
        return {
            active: false,
            potential: this.potentialSpores.has(pointKey)
        };
    }

    // Update activation states
    setActivationState(type, value) {
        if (type in this.activationStates) {
            this.activationStates[type] = value;
            if (this.debugMode) {
                console.log(`Set ${type} activation state to ${value}`);
            }
        }
    }

    // Get all active spores for growth
    getActiveSporesForGrowth() {
        return Array.from(this.activeSpores).map(key => ({
            key,
            maturation: this.maturationStates.get(key)
        }));
    }

    // Clean up inactive spores
    cleanupInactiveSpores(maxAge = 5000) {
        const now = Date.now();
        for (const [key, state] of this.maturationStates) {
            if (now - state.activatedAt > maxAge) {
                this.activeSpores.delete(key);
                this.maturationStates.delete(key);
                if (this.debugMode) {
                    console.log(`Cleaned up inactive spore: ${key}`);
                }
            }
        }
    }
}

export default SporeSystem; 