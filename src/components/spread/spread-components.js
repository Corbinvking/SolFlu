class UpdateQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.frameRate = 60;
        this.frameTime = 1000 / this.frameRate;
        this.handlers = {
            spread: data => console.log('Handling spread update:', data),
            route: data => console.log('Handling route update:', data)
        };
        this.results = [];
    }

    async addUpdate(update) {
        this.queue.push(update);
        if (!this.processing) {
            await this.processQueue();
        }
        return this.results;
    }

    async processQueue() {
        if (this.processing) return this.results;
        
        this.processing = true;
        this.results = [];
        const startTime = performance.now();

        while (this.queue.length > 0) {
            const update = this.queue.shift();
            const result = await this.applyUpdate(update);
            if (result !== null) {
                this.results.push(result);
            }

            // Maintain frame rate
            const elapsedTime = performance.now() - startTime;
            const remainingTime = this.frameTime - (elapsedTime % this.frameTime);
            if (remainingTime > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingTime));
            }
        }

        this.processing = false;
        return this.results;
    }

    async applyUpdate(update) {
        try {
            switch (update.type) {
                case 'spread':
                    const spreadResult = await this.handleSpreadUpdate(update.data);
                    this.handlers.spread(update.data);
                    return { type: 'spread', result: spreadResult };
                case 'route':
                    const routeResult = await this.handleRouteUpdate(update.data);
                    this.handlers.route(update.data);
                    return { type: 'route', result: routeResult };
                default:
                    console.warn('Unknown update type:', update.type);
                    return null;
            }
        } catch (error) {
            console.error('Error applying update:', error);
            return null;
        }
    }

    async handleSpreadUpdate(data) {
        // Implementation will be connected to visualization layer
        return data;
    }

    async handleRouteUpdate(data) {
        // Implementation will be connected to visualization layer
        return data;
    }

    setHandler(type, handler) {
        this.handlers[type] = handler;
    }

    clear() {
        this.queue = [];
        this.results = [];
        this.processing = false;
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

export {
    UpdateQueue,
    SpreadMechanism
}; 