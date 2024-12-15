class MockCryptoMarket {
    constructor(initialPrice = 100, initialMarketCap = 1000000) {
        this.price = initialPrice;
        this.marketCap = initialMarketCap;
        this.volatility = 0.5;
        this.trend = 0;
        this.subscribers = new Set();
        this.updateInterval = null;
    }

    start() {
        if (this.updateInterval) return;
        
        this.updateInterval = setInterval(() => {
            this.updateMarket();
            this.notifySubscribers();
        }, 1000);
    }

    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    notifySubscribers() {
        const data = {
            price: this.price,
            marketCap: this.marketCap,
            volatility: this.volatility,
            timestamp: Date.now()
        };

        this.subscribers.forEach(callback => callback(data));
    }

    updateMarket() {
        // Update trend (mean-reverting random walk)
        this.trend = this.trend * 0.95 + (Math.random() - 0.5) * 0.1;

        // Update volatility (mean-reverting)
        const targetVol = 0.5 + this.trend;
        this.volatility = this.volatility * 0.95 + targetVol * 0.05;
        this.volatility = Math.max(0.1, Math.min(1.0, this.volatility));

        // Calculate price change based on volatility and trend
        const priceChange = (
            this.trend + 
            (Math.random() - 0.5) * this.volatility
        ) * 0.1;

        // Update price
        this.price *= (1 + priceChange);
        
        // Update market cap based on price change
        this.marketCap *= (1 + priceChange);

        // Simulate sudden market events (5% chance)
        if (Math.random() < 0.05) {
            const eventMagnitude = (Math.random() - 0.5) * 0.2;
            this.price *= (1 + eventMagnitude);
            this.marketCap *= (1 + eventMagnitude);
            this.volatility = Math.min(1.0, this.volatility * 1.5);
        }
    }

    // Helper method to simulate market events
    triggerEvent(type) {
        switch (type) {
            case 'crash':
                this.price *= 0.8;
                this.marketCap *= 0.8;
                this.volatility = Math.min(1.0, this.volatility * 2);
                break;
            case 'boom':
                this.price *= 1.2;
                this.marketCap *= 1.2;
                this.volatility = Math.min(1.0, this.volatility * 1.5);
                break;
            case 'recovery':
                this.trend = 0.1;
                this.volatility *= 0.8;
                break;
        }
        this.notifySubscribers();
    }
}

export default MockCryptoMarket; 