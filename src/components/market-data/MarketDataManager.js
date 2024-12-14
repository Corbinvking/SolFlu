const { EventEmitter } = require('events');

class MarketDataManager extends EventEmitter {
    constructor() {
        super();
        this.socket = null;
        this.state = {
            marketCap: 0,
            volatility: 0,
            routes: new Set(),
            infectionCenters: new Map()
        };
        
        this.initialize();
    }

    initialize() {
        try {
            this.socket = new WebSocket('ws://localhost:8003/simulation');
            
            this.socket.onopen = () => {
                console.log('Connected to simulation websocket');
                this.emit('connected');
            };
            
            this.socket.onmessage = (event) => {
                this.handleMarketUpdate(JSON.parse(event.data));
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };
            
            this.socket.onclose = () => {
                console.log('Disconnected from simulation');
                this.emit('disconnected');
                // Attempt to reconnect after 5 seconds
                setTimeout(() => this.initialize(), 5000);
            };
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            this.emit('error', error);
        }
    }

    handleMarketUpdate(data) {
        const diff = this.calculateStateDiff(this.state, data);
        
        // Update internal state
        this.state = {
            ...this.state,
            marketCap: data.marketCap,
            volatility: data.volatility,
            routes: new Set(data.routes),
            infectionCenters: new Map(data.infectionCenters)
        };

        // Emit state changes
        if (diff.marketCapChanged) {
            this.emit('marketCapUpdate', this.state.marketCap);
        }
        if (diff.volatilityChanged) {
            this.emit('volatilityUpdate', this.state.volatility);
        }
        if (diff.newRoutes.size > 0) {
            this.emit('routesUpdate', diff.newRoutes);
        }
        if (diff.updatedCenters.size > 0) {
            this.emit('centersUpdate', diff.updatedCenters);
        }

        // Emit complete update
        this.emit('stateUpdate', this.state);
    }

    calculateStateDiff(oldState, newState) {
        return {
            marketCapChanged: oldState.marketCap !== newState.marketCap,
            volatilityChanged: oldState.volatility !== newState.volatility,
            newRoutes: this.findNewRoutes(newState.routes),
            updatedCenters: this.findUpdatedCenters(newState.infectionCenters)
        };
    }

    findNewRoutes(newRoutes) {
        return new Set(
            [...newRoutes].filter(route => !this.state.routes.has(route))
        );
    }

    findUpdatedCenters(newCenters) {
        const updates = new Map();
        newCenters.forEach((value, key) => {
            const oldValue = this.state.infectionCenters.get(key);
            if (!oldValue || JSON.stringify(oldValue) !== JSON.stringify(value)) {
                updates.set(key, value);
            }
        });
        return updates;
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

module.exports = MarketDataManager; 