const EventEmitter = require('events');
const { isEqual, cloneDeep } = require('lodash');

class StateSync extends EventEmitter {
    constructor() {
        super();
        this.currentState = {
            marketMetrics: {},
            virusState: {},
            pendingUpdates: new Set(),
            lastUpdate: Date.now()
        };
        this.stateHistory = [];
        this.maxHistoryLength = 100;
    }

    async initialize() {
        this.initialized = true;
        this.emit('initialized');
    }

    update(newData) {
        const diff = this.calculateStateDiff(this.currentState, newData);
        
        if (diff.hasChanges) {
            this.applyUpdates(diff);
            this.archiveState();
            this.emit('stateChanged', diff);
        }
        
        return diff;
    }

    calculateStateDiff(oldState, newData) {
        const diff = {
            hasChanges: false,
            marketMetrics: {},
            virusState: {},
            timestamp: Date.now(),
            changes: []
        };

        // Check market metrics changes
        if (newData.marketMetrics) {
            Object.keys(newData.marketMetrics).forEach(key => {
                if (!isEqual(oldState.marketMetrics[key], newData.marketMetrics[key])) {
                    diff.hasChanges = true;
                    diff.marketMetrics[key] = newData.marketMetrics[key];
                    diff.changes.push({
                        type: 'marketMetrics',
                        key,
                        oldValue: oldState.marketMetrics[key],
                        newValue: newData.marketMetrics[key]
                    });
                }
            });
        }

        // Check virus state changes
        if (newData.virusState) {
            Object.keys(newData.virusState).forEach(key => {
                if (!isEqual(oldState.virusState[key], newData.virusState[key])) {
                    diff.hasChanges = true;
                    diff.virusState[key] = newData.virusState[key];
                    diff.changes.push({
                        type: 'virusState',
                        key,
                        oldValue: oldState.virusState[key],
                        newValue: newData.virusState[key]
                    });
                }
            });
        }

        return diff;
    }

    applyUpdates(diff) {
        // Update market metrics
        Object.keys(diff.marketMetrics).forEach(key => {
            this.currentState.marketMetrics[key] = cloneDeep(diff.marketMetrics[key]);
        });

        // Update virus state
        Object.keys(diff.virusState).forEach(key => {
            this.currentState.virusState[key] = cloneDeep(diff.virusState[key]);
        });

        this.currentState.lastUpdate = diff.timestamp;
    }

    archiveState() {
        const stateSnapshot = {
            timestamp: Date.now(),
            state: cloneDeep(this.currentState)
        };

        this.stateHistory.push(stateSnapshot);

        // Maintain history length
        if (this.stateHistory.length > this.maxHistoryLength) {
            this.stateHistory.shift();
        }
    }

    getState() {
        return cloneDeep(this.currentState);
    }

    getHistory() {
        return cloneDeep(this.stateHistory);
    }

    rollbackToTimestamp(timestamp) {
        const historicalState = this.stateHistory.find(entry => entry.timestamp === timestamp);
        
        if (historicalState) {
            const diff = this.calculateStateDiff(this.currentState, historicalState.state);
            if (diff.hasChanges) {
                this.currentState = cloneDeep(historicalState.state);
                this.emit('stateRollback', {
                    timestamp,
                    changes: diff.changes
                });
            }
            return true;
        }
        
        return false;
    }

    validateState(state) {
        // Add validation logic based on your specific requirements
        const requiredKeys = ['marketMetrics', 'virusState'];
        return requiredKeys.every(key => key in state);
    }

    clearState() {
        this.currentState = {
            marketMetrics: {},
            virusState: {},
            pendingUpdates: new Set(),
            lastUpdate: Date.now()
        };
        this.stateHistory = [];
        this.emit('stateCleared');
    }
}

module.exports = StateSync; 