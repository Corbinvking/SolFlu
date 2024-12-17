class GrowthStateManager {
    constructor() {
        this.states = {
            OUTBREAK: {
                duration: 2000,
                multiplier: 2.0,
                sporeActivation: true
            },
            SETTLEMENT: {
                duration: 1500,
                multiplier: 0.7,
                sporeActivation: false
            },
            DORMANT: {
                duration: 750,
                multiplier: 1.0,
                sporeActivation: true
            }
        };

        this.currentState = 'OUTBREAK';
        this.timeouts = {
            boost: null,
            suppress: null,
            cycle: null
        };

        this.cycleEnabled = false;
        this.stateQueue = ['OUTBREAK', 'SETTLEMENT', 'DORMANT'];
        this.currentQueueIndex = 0;
        this.debugMode = true;
    }

    startAutomatedCycle() {
        this.cycleEnabled = true;
        this.scheduleNextState();
        if (this.debugMode) {
            console.log('Started automated growth cycle');
        }
    }

    stopAutomatedCycle() {
        this.cycleEnabled = false;
        this.clearAllTimeouts();
        if (this.debugMode) {
            console.log('Stopped automated growth cycle');
        }
    }

    scheduleNextState() {
        if (!this.cycleEnabled) return;

        const nextState = this.stateQueue[this.currentQueueIndex];
        const duration = this.states[nextState].duration;

        this.clearTimeout('cycle');
        this.timeouts.cycle = setTimeout(() => {
            this.transition(nextState);
            this.currentQueueIndex = (this.currentQueueIndex + 1) % this.stateQueue.length;
            this.scheduleNextState();
        }, duration);

        if (this.debugMode) {
            console.log(`Scheduled next state: ${nextState} in ${duration}ms`);
        }
    }

    clearAllTimeouts() {
        Object.keys(this.timeouts).forEach(type => this.clearTimeout(type));
    }

    // Safe timeout clearing
    clearTimeout(type) {
        if (this.timeouts[type]) {
            clearTimeout(this.timeouts[type]);
            this.timeouts[type] = null;
        }
    }

    // State transition with logging
    transition(newState) {
        if (this.debugMode) {
            console.log(`State transition: ${this.currentState} -> ${newState}`);
        }
        
        this.currentState = newState;
        return this.states[newState];
    }

    // Get current state parameters
    getCurrentState() {
        return {
            ...this.states[this.currentState],
            name: this.currentState
        };
    }

    // Enhanced test method
    testTransition(from, to) {
        if (this.debugMode) {
            console.log(`Testing transition ${from} -> ${to}`);
        }
        
        const startState = this.states[from];
        const endState = this.states[to];
        
        return {
            valid: startState && endState,
            startMultiplier: startState?.multiplier,
            endMultiplier: endState?.multiplier,
            cycleEnabled: this.cycleEnabled
        };
    }
}

export default GrowthStateManager; 