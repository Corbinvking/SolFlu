const HIGH_VOLATILITY_THRESHOLD = 0.75;

class UpdateQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.frameRate = 60;
        this.frameTime = 1000 / this.frameRate;
    }

    addUpdate(update) {
        this.queue.push(update);
        if (!this.processing) {
            this.processQueue();
        }
    }

    async processQueue() {
        this.processing = true;
        const startTime = performance.now();

        while (this.queue.length > 0) {
            const update = this.queue.shift();
            await this.applyUpdate(update);

            // Maintain frame rate
            const elapsedTime = performance.now() - startTime;
            const remainingTime = this.frameTime - (elapsedTime % this.frameTime);
            if (remainingTime > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingTime));
            }
        }

        this.processing = false;
    }

    async applyUpdate(update) {
        try {
            switch (update.type) {
                case 'spread':
                    await this.handleSpreadUpdate(update.data);
                    break;
                case 'route':
                    await this.handleRouteUpdate(update.data);
                    break;
                default:
                    console.warn('Unknown update type:', update.type);
            }
        } catch (error) {
            console.error('Error applying update:', error);
        }
    }

    async handleSpreadUpdate(data) {
        // Implementation will be connected to visualization layer
        console.log('Handling spread update:', data);
    }

    async handleRouteUpdate(data) {
        // Implementation will be connected to visualization layer
        console.log('Handling route update:', data);
    }
}

class SpreadMechanism {
    constructor() {
        this.lastUpdate = performance.now();
    }

    update(marketData) {
        const now = performance.now();
        const deltaTime = now - this.lastUpdate;
        this.lastUpdate = now;

        return {
            spreadRate: this.calculateSpreadRate(marketData, deltaTime),
            intensity: this.calculateIntensity(marketData),
            centers: this.updateCenters(marketData)
        };
    }

    calculateSpreadRate(marketData, deltaTime) {
        const baseRate = marketData.marketCap / 1000000; // Normalize market cap
        const volatilityFactor = 1 + marketData.volatility;
        return (baseRate * volatilityFactor * deltaTime) / 1000;
    }

    calculateIntensity(marketData) {
        return Math.min(1, marketData.volatility);
    }

    updateCenters(marketData) {
        return Array.from(marketData.infectionCenters).map(([id, center]) => ({
            id,
            ...center,
            intensity: this.calculateIntensity(marketData)
        }));
    }
}

class SpreadStateManager {
    constructor() {
        this.spreadMechanics = new SpreadMechanism();
        this.updateQueue = new UpdateQueue();
    }

    processMarketUpdate(marketData) {
        const spreadUpdates = this.spreadMechanics.update(marketData);
        
        this.updateQueue.addUpdate({
            type: 'spread',
            data: spreadUpdates,
            priority: this.calculatePriority(marketData)
        });

        // Process route updates if present
        if (marketData.routes && marketData.routes.size > 0) {
            this.updateQueue.addUpdate({
                type: 'route',
                data: {
                    routes: Array.from(marketData.routes),
                    volatility: marketData.volatility
                },
                priority: 'normal'
            });
        }
    }

    calculatePriority(marketData) {
        return marketData.volatility > HIGH_VOLATILITY_THRESHOLD ? 'high' : 'normal';
    }
}

module.exports = {
    SpreadStateManager,
    UpdateQueue,
    SpreadMechanism
}; 