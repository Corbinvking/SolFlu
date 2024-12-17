class Order {
    constructor(price, amount, side, makerId = null) {
        this.price = price;
        this.amount = amount;
        this.side = side; // 'buy' or 'sell'
        this.timestamp = Date.now();
        this.makerId = makerId || this.generateMakerId();
        this.age = '1m'; // Will be updated dynamically
    }

    generateMakerId() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    updateAge() {
        const now = Date.now();
        const diff = now - this.timestamp;
        if (diff < 60000) { // Less than 1 minute
            this.age = Math.ceil(diff / 1000) + 's';
        } else {
            this.age = Math.ceil(diff / 60000) + 'm';
        }
    }
}

class PriceLevel {
    constructor(price) {
        this.price = price;
        this.orders = new Map(); // makerId -> Order
        this.totalAmount = 0;
    }

    addOrder(order) {
        this.orders.set(order.makerId, order);
        this.totalAmount += order.amount;
    }

    removeOrder(makerId) {
        const order = this.orders.get(makerId);
        if (order) {
            this.totalAmount -= order.amount;
            this.orders.delete(makerId);
        }
        return this.orders.size === 0;
    }
}

class OrderBook {
    constructor(basePrice = 0.03) {
        this.buyLevels = new Map();  // price -> PriceLevel
        this.sellLevels = new Map(); // price -> PriceLevel
        this.currentPrice = basePrice;
        this.lastTradePrice = basePrice;
        this.recentTrades = [];
        this.maxLevels = 20; // Number of price levels to maintain
        this.priceStep = 0.0001; // Minimum price movement
        this.subscribers = new Set();
    }

    subscribe(callback) {
        this.subscribers.add(callback);
    }

    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    notifySubscribers(data) {
        this.subscribers.forEach(callback => callback(data));
    }

    addOrder(price, amount, side) {
        const order = new Order(price, amount, side);
        const levels = side === 'buy' ? this.buyLevels : this.sellLevels;
        
        if (!levels.has(price)) {
            levels.set(price, new PriceLevel(price));
        }
        
        levels.get(price).addOrder(order);
        this.maintainPriceLevels();
        this.checkForTrades();
        
        this.notifySubscribers(this.getMarketState());
        return order;
    }

    removeOrder(makerId, price, side) {
        const levels = side === 'buy' ? this.buyLevels : this.sellLevels;
        const level = levels.get(price);
        
        if (level && level.removeOrder(makerId)) {
            levels.delete(price);
        }
        
        this.maintainPriceLevels();
        this.notifySubscribers(this.getMarketState());
    }

    maintainPriceLevels() {
        // Ensure we keep only maxLevels above and below current price
        const sortedBuyPrices = Array.from(this.buyLevels.keys()).sort((a, b) => b - a);
        const sortedSellPrices = Array.from(this.sellLevels.keys()).sort((a, b) => a - b);
        
        while (sortedBuyPrices.length > this.maxLevels) {
            this.buyLevels.delete(sortedBuyPrices.pop());
        }
        
        while (sortedSellPrices.length > this.maxLevels) {
            this.sellLevels.delete(sortedSellPrices.pop());
        }
    }

    checkForTrades() {
        const bestBid = Math.max(...this.buyLevels.keys());
        const bestAsk = Math.min(...this.sellLevels.keys());
        
        if (bestBid >= bestAsk) {
            this.executeTrade(bestBid, bestAsk);
        }
    }

    executeTrade(bidPrice, askPrice) {
        const price = (bidPrice + askPrice) / 2;
        this.lastTradePrice = price;
        this.currentPrice = price;
        
        // Record the trade
        this.recentTrades.push({
            price,
            timestamp: Date.now()
        });
        
        // Keep only recent trades
        if (this.recentTrades.length > 100) {
            this.recentTrades.shift();
        }
    }

    generateRandomOrder() {
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const baseAmount = Math.random() * 100;
        const amount = Math.floor(baseAmount); // Whole numbers for cleaner display
        
        let price;
        if (side === 'buy') {
            // Generate price slightly below current price
            const spread = Math.random() * 0.0005; // Tighter spread
            price = Math.round((this.currentPrice - spread) * 10000) / 10000;
        } else {
            // Generate price slightly above current price
            const spread = Math.random() * 0.0005; // Tighter spread
            price = Math.round((this.currentPrice + spread) * 10000) / 10000;
        }
        
        return this.addOrder(price, amount, side);
    }

    generateWhaleOrder() {
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const amount = 1000 + Math.floor(Math.random() * 4000); // Whole numbers
        const priceImpact = (Math.random() * 0.001) * (side === 'buy' ? 1 : -1);
        const price = Math.round((this.currentPrice + priceImpact) * 10000) / 10000;
        
        return this.addOrder(price, amount, side);
    }

    getMarketState() {
        // Get all orders and sort them by price
        const buyOrders = Array.from(this.buyLevels.values())
            .map(level => Array.from(level.orders.values()))
            .flat()
            .sort((a, b) => {
                // Sort by price (descending) and then by age (oldest first)
                if (b.price !== a.price) return b.price - a.price;
                return a.timestamp - b.timestamp;
            });

        const sellOrders = Array.from(this.sellLevels.values())
            .map(level => Array.from(level.orders.values()))
            .flat()
            .sort((a, b) => {
                // Sort by price (ascending) and then by age (oldest first)
                if (a.price !== b.price) return a.price - b.price;
                return a.timestamp - b.timestamp;
            });

        // Update ages for all orders
        [...buyOrders, ...sellOrders].forEach(order => order.updateAge());

        // Calculate market metrics
        const volatility = this.calculateVolatility();
        const marketCap = this.calculateMarketCap();
        const trend = this.calculateTrend();

        return {
            buyOrders,
            sellOrders,
            currentPrice: this.currentPrice,
            lastTradePrice: this.lastTradePrice,
            marketCap,
            volatility,
            trend,
            timestamp: Date.now()
        };
    }

    calculateVolatility() {
        if (this.recentTrades.length < 2) return 0;
        
        const prices = this.recentTrades.map(t => t.price);
        const mean = prices.reduce((a, b) => a + b) / prices.length;
        const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
        return Math.sqrt(variance) / mean;
    }

    calculateMarketCap() {
        const totalBuyVolume = Array.from(this.buyLevels.values())
            .reduce((sum, level) => sum + level.totalAmount, 0);
        const totalSellVolume = Array.from(this.sellLevels.values())
            .reduce((sum, level) => sum + level.totalAmount, 0);
        
        return (totalBuyVolume + totalSellVolume) * this.currentPrice;
    }

    calculateTrend() {
        if (this.recentTrades.length < 2) return 0;
        
        const prices = this.recentTrades.map(t => t.price);
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        
        return (lastPrice - firstPrice) / firstPrice;
    }
}

class MarketSimulator {
    constructor() {
        this.orderBook = new OrderBook(0.03); // Starting price at $0.03
        this.running = false;
        this.lastWhaleEvent = Date.now();
        this.whaleEventInterval = 300000; // 5 minutes
        this.whaleEventVariance = 600000; // ±10 minutes
        this.orderInterval = null;
        this.whaleInterval = null;
        this.volatilityMultiplier = 1.0;
        this.volatilityTimeout = null;
    }

    start() {
        if (this.running) return;
        this.running = true;

        // Generate regular orders every 100-500ms for more active trading
        this.orderInterval = setInterval(() => {
            if (Math.random() < 0.7) { // 70% chance each interval
                this.orderBook.generateRandomOrder();
            }
            
            // Update all order ages
            this.updateOrderAges();
            
        }, 100 + Math.random() * 400);

        // Check for whale events
        this.whaleInterval = setInterval(() => {
            const now = Date.now();
            if (now - this.lastWhaleEvent > this.whaleEventInterval) {
                if (Math.random() < 0.3) { // 30% chance when interval is reached
                    this.orderBook.generateWhaleOrder();
                    this.lastWhaleEvent = now;
                    // Randomize next whale event interval
                    this.whaleEventInterval = 300000 + (Math.random() * this.whaleEventVariance - this.whaleEventVariance/2);
                }
            }
        }, 60000); // Check every minute

        // Initial orders
        for (let i = 0; i < 20; i++) {
            this.orderBook.generateRandomOrder();
        }
    }

    updateOrderAges() {
        // Update ages for all orders
        const updateLevelOrders = (level) => {
            level.orders.forEach(order => order.updateAge());
        };

        this.orderBook.buyLevels.forEach(updateLevelOrders);
        this.orderBook.sellLevels.forEach(updateLevelOrders);
    }

    stop() {
        this.running = false;
        if (this.orderInterval) clearInterval(this.orderInterval);
        if (this.whaleInterval) clearInterval(this.whaleInterval);
    }

    subscribe(callback) {
        this.orderBook.subscribe(callback);
    }

    unsubscribe(callback) {
        this.orderBook.unsubscribe(callback);
    }

    injectVolatility(multiplier) {
        // Clear any existing timeout
        if (this.volatilityTimeout) {
            clearTimeout(this.volatilityTimeout);
        }

        // Store the original multiplier if not already modified
        const originalMultiplier = this.volatilityMultiplier;
        this.volatilityMultiplier = multiplier;

        // Generate some immediate volatile orders
        for (let i = 0; i < 5; i++) {
            this.orderBook.generateWhaleOrder();
        }

        // Reset after 5 seconds
        this.volatilityTimeout = setTimeout(() => {
            this.volatilityMultiplier = originalMultiplier;
        }, 5000);
    }

    reset() {
        // Stop current simulation
        this.stop();
        
        // Create new order book with initial price
        this.orderBook = new OrderBook(0.03);
        
        // Reset volatility state
        this.volatilityMultiplier = 1.0;
        if (this.volatilityTimeout) {
            clearTimeout(this.volatilityTimeout);
        }
        
        // Reset whale event timing
        this.lastWhaleEvent = Date.now();
        
        // Restart simulation
        this.start();
    }

    getMarketState() {
        return this.orderBook.getMarketState();
    }
}

export default MarketSimulator; 