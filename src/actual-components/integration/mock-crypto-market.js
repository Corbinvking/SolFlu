class MockCryptoMarket {
    constructor() {
        this.marketCap = 380000;  // Initial market cap
        this.volatility = 0.3;    // Initial volatility (0-1)
        this.trend = 0;           // -1 to 1, representing market trend
        this.subscribers = [];     // Event subscribers
        this.lastEvent = 'normal'; // Current market event type
        this.timeSinceLastEvent = 0;
        this.eventDuration = 0;
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        // Immediately notify with current state
        callback(this.getMarketState());
    }

    unsubscribe(callback) {
        this.subscribers = this.subscribers.filter(cb => cb !== callback);
    }

    getMarketState() {
        return {
            marketCap: this.marketCap,
            volatility: this.volatility,
            trend: this.trend,
            timestamp: Date.now(),
            eventType: this.lastEvent
        };
    }

    notifySubscribers() {
        const marketState = this.getMarketState();
        this.subscribers.forEach(cb => cb(marketState));
    }

    triggerEvent(eventType) {
        this.lastEvent = eventType;
        this.eventDuration = 5; // 5 seconds event duration

        switch (eventType) {
            case 'boom':
                this.volatility = 0.8;
                this.trend = 1;
                break;
            case 'crash':
                this.volatility = 0.9;
                this.trend = -1;
                break;
            case 'recovery':
                this.volatility = 0.4;
                this.trend = 0.5;
                break;
            default:
                this.volatility = 0.3;
                this.trend = 0;
        }

        this.notifySubscribers();
    }

    update(deltaTime) {
        // Update event duration
        if (this.eventDuration > 0) {
            this.eventDuration -= deltaTime;
            if (this.eventDuration <= 0) {
                this.lastEvent = 'normal';
                this.volatility = 0.3;
                this.trend = 0;
            }
        }

        // Update market cap based on trend and volatility
        const change = (Math.random() - 0.5) * this.volatility * 10000 + (this.trend * 5000);
        this.marketCap = Math.max(100000, this.marketCap + change);

        // Random event generation
        this.timeSinceLastEvent += deltaTime;
        if (this.timeSinceLastEvent > 10 && Math.random() < 0.1) { // 10% chance every 10 seconds
            this.timeSinceLastEvent = 0;
            const events = ['boom', 'crash', 'recovery'];
            this.triggerEvent(events[Math.floor(Math.random() * events.length)]);
        }

        this.notifySubscribers();
        return this.getMarketState();
    }
}

export default MockCryptoMarket; 