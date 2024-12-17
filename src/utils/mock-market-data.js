class MockCryptoMarket {
    constructor(initialPrice = 100, initialMarketCap = 1000000) {
        this.price = initialPrice;
        this.marketCap = initialMarketCap;
        this.volatility = 0.5;
        this.trend = 0;
        this.subscribers = new Set();
        this.updateInterval = null;
        this.lastEvent = 'normal';
        this.lastEventTimestamp = Date.now();
        this.eventDuration = 5000; // Duration of event effects in ms
        this.sequence = 0;
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

    validateState() {
        // Ensure market cap stays within reasonable bounds
        this.marketCap = Math.max(100000, Math.min(10000000000, this.marketCap));
        
        // Ensure volatility stays within bounds
        this.volatility = Math.max(0.1, Math.min(1.0, this.volatility));
        
        // Ensure trend stays within bounds
        this.trend = Math.max(-0.5, Math.min(0.5, this.trend));
        
        // Log significant changes
        if (this.volatility > 0.8) {
            console.log('High volatility detected:', this.volatility);
        }
        if (Math.abs(this.trend) > 0.3) {
            console.log('Significant trend detected:', this.trend);
        }
    }

    notifySubscribers() {
        // Check if event has expired
        const currentTime = Date.now();
        if (this.lastEvent !== 'normal' && 
            currentTime - this.lastEventTimestamp > this.eventDuration) {
            this.lastEvent = 'normal';
            console.log('Market event expired, returning to normal state');
        }

        const data = {
            price: this.price,
            marketCap: this.marketCap,
            volatility: this.volatility,
            trend: this.trend,
            timestamp: currentTime,
            eventType: this.lastEvent,
            sequence: this.sequence++,
            metrics: {
                priceChange: this.calculatePriceChange(),
                trendStrength: Math.abs(this.trend),
                marketState: this.determineMarketState()
            }
        };

        this.subscribers.forEach(callback => callback(data));
    }

    calculatePriceChange() {
        return ((this.price / this.previousPrice) - 1) * 100;
    }

    determineMarketState() {
        if (this.volatility > 0.8) return 'highly_volatile';
        if (this.volatility < 0.2) return 'stable';
        if (this.trend > 0.3) return 'bullish';
        if (this.trend < -0.3) return 'bearish';
        return 'neutral';
    }

    updateMarket() {
        this.previousPrice = this.price;

        // Update trend (mean-reverting random walk)
        this.trend = this.trend * 0.95 + (Math.random() - 0.5) * 0.1;

        // Update volatility (mean-reverting)
        const targetVol = 0.5 + this.trend;
        this.volatility = this.volatility * 0.95 + targetVol * 0.05;

        // Calculate price change based on volatility and trend
        const priceChange = (
            this.trend + 
            (Math.random() - 0.5) * this.volatility
        ) * 0.1;

        // Update price and market cap
        this.price *= (1 + priceChange);
        this.marketCap *= (1 + priceChange);

        // Random market events (5% chance)
        if (Math.random() < 0.05 && this.lastEvent === 'normal') {
            const eventMagnitude = (Math.random() - 0.5) * 0.2;
            this.price *= (1 + eventMagnitude);
            this.marketCap *= (1 + eventMagnitude);
            this.volatility = Math.min(1.0, this.volatility * 1.5);
            
            // Classify random event
            if (eventMagnitude > 0.1) {
                this.lastEvent = 'random_boom';
            } else if (eventMagnitude < -0.1) {
                this.lastEvent = 'random_crash';
            }
            this.lastEventTimestamp = Date.now();
        }

        // Validate and adjust state
        this.validateState();
    }

    triggerEvent(type) {
        const currentTime = Date.now();
        this.lastEventTimestamp = currentTime;
        this.lastEvent = type;

        switch (type) {
            case 'crash':
                this.price *= 0.8;
                this.marketCap *= 0.8;
                this.volatility = Math.min(1.0, this.volatility * 2);
                this.trend = -0.3;
                break;
                
            case 'boom':
                this.price *= 1.2;
                this.marketCap *= 1.2;
                this.volatility = Math.min(1.0, this.volatility * 1.5);
                this.trend = 0.3;
                break;
                
            case 'recovery':
                this.trend = 0.1;
                this.volatility *= 0.8;
                // Gradual recovery of market cap
                this.marketCap *= 1.05;
                break;
                
            default:
                console.warn('Unknown event type:', type);
                return;
        }

        console.log(`Market event triggered: ${type}`);
        this.validateState();
        this.notifySubscribers();
    }

    getState() {
        return {
            price: this.price,
            marketCap: this.marketCap,
            volatility: this.volatility,
            trend: this.trend,
            eventType: this.lastEvent,
            timestamp: Date.now(),
            sequence: this.sequence
        };
    }
}

export default MockCryptoMarket; 