import PerformanceMonitor from './performance-monitor';
import MessageQueue from './message-queue';

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
        if (this.buyLevels.size === 0 || this.sellLevels.size === 0) return;
        
        const bestBid = Math.max(...this.buyLevels.keys());
        const bestAsk = Math.min(...this.sellLevels.keys());
        
        // Execute trades when orders cross or match
        if (bestBid >= bestAsk) {
            this.executeTrade(bestBid, bestAsk);
        } else {
            // Update current price to mid-market when no trades
            this.currentPrice = (bestBid + bestAsk) / 2;
        }

        // Notify subscribers of price update
        this.notifySubscribers(this.getMarketState());
    }

    executeTrade(bidPrice, askPrice) {
        const price = (bidPrice + askPrice) / 2;
        this.lastTradePrice = price;
        this.currentPrice = price;
        
        // Match and remove orders that crossed
        const buyLevel = this.buyLevels.get(bidPrice);
        const sellLevel = this.sellLevels.get(askPrice);
        
        if (buyLevel && sellLevel) {
            const buyOrders = Array.from(buyLevel.orders.values());
            const sellOrders = Array.from(sellLevel.orders.values());
            
            // Match orders and remove them
            const matchSize = Math.min(buyOrders[0].amount, sellOrders[0].amount);
            this.removeOrder(buyOrders[0].makerId, bidPrice, 'buy');
            this.removeOrder(sellOrders[0].makerId, askPrice, 'sell');
        }
        
        // Record the trade
        this.recentTrades.push({
            price,
            timestamp: Date.now()
        });
        
        // Keep only recent trades
        while (this.recentTrades.length > 100) {
            this.recentTrades.shift();
        }
    }

    generateRandomOrder() {
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const baseAmount = Math.random() * 1000;
        const amount = Math.floor(baseAmount);
        
        // Generate price relative to current best bid/ask
        let price;
        if (side === 'buy') {
            const bestBid = this.buyLevels.size > 0 ? Math.max(...this.buyLevels.keys()) : this.currentPrice;
            const spread = Math.random() * 0.0005;
            price = Math.round((bestBid - spread) * 10000) / 10000;
        } else {
            const bestAsk = this.sellLevels.size > 0 ? Math.min(...this.sellLevels.keys()) : this.currentPrice;
            const spread = Math.random() * 0.0005;
            price = Math.round((bestAsk + spread) * 10000) / 10000;
        }
        
        return this.addOrder(price, amount, side);
    }

    generateWhaleOrder() {
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const amount = 5000 + Math.floor(Math.random() * 10000);
        
        // Generate aggressive whale orders that are more likely to execute
        let price;
        if (side === 'buy') {
            const bestAsk = this.sellLevels.size > 0 ? Math.min(...this.sellLevels.keys()) : this.currentPrice;
            price = Math.round((bestAsk + 0.0002) * 10000) / 10000; // Aggressive buy above ask
        } else {
            const bestBid = this.buyLevels.size > 0 ? Math.max(...this.buyLevels.keys()) : this.currentPrice;
            price = Math.round((bestBid - 0.0002) * 10000) / 10000; // Aggressive sell below bid
        }
        
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
        
        const baseMarketCap = 1000;
        const marketCap = baseMarketCap + (totalBuyVolume + totalSellVolume) * this.currentPrice;
        console.log('Market Cap Calculation:', {
            buyVolume: totalBuyVolume,
            sellVolume: totalSellVolume,
            price: this.currentPrice,
            marketCap: marketCap
        });
        return marketCap;
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
        this.orderBook = new OrderBook(0.03);
        this.running = false;
        this.lastWhaleEvent = Date.now();
        this.whaleEventInterval = 300000;
        this.whaleEventVariance = 600000;
        this.volatilityMultiplier = 1.0;
        this.volatilityTimeout = null;
        this.lastOrderTime = Date.now();
        this.orderGenerationRate = 16; // Increased frequency to ~60fps
        this.performanceMonitor = new PerformanceMonitor();
        this.messageQueue = new MessageQueue();
        
        // Set up message handlers
        this.messageQueue.subscribe('order', this.handleOrderMessage.bind(this));
        this.messageQueue.subscribe('whale', this.handleWhaleMessage.bind(this));
        this.messageQueue.subscribe('cleanup', this.handleCleanupMessage.bind(this));
    }

    handleOrderMessage(orderData) {
        return Promise.resolve(
            this.performanceMonitor.measureOperation(
                () => this.orderBook.generateRandomOrder(),
                'orderProcessing'
            )
        ).then(result => {
            console.log('Order processed:', {
                buyLevels: this.orderBook.buyLevels.size,
                sellLevels: this.orderBook.sellLevels.size,
                marketCap: this.orderBook.calculateMarketCap(),
                queueSize: this.messageQueue.getMetrics().queueLength
            });
            return result;
        });
    }

    handleWhaleMessage(whaleData) {
        return Promise.resolve(
            this.performanceMonitor.measureOperation(
                () => this.orderBook.generateWhaleOrder(),
                'orderProcessing'
            )
        );
    }

    handleCleanupMessage() {
        return Promise.resolve(
            this.performanceMonitor.measureOperation(
                () => {
                    this.cleanupOldOrders();
                    this.updateOrderAges();
                },
                'stateUpdates'
            )
        );
    }

    start() {
        if (this.running) return;
        this.running = true;

        // Generate initial orders
        for (let i = 0; i < 50; i++) {
            this.messageQueue.enqueue('order', {}, 2);
        }

        // Continuous order generation using requestAnimationFrame
        const generateOrders = () => {
            if (!this.running) return;

            const frameStart = performance.now();
            const now = Date.now();
            const timeSinceLastOrder = now - this.lastOrderTime;

            // Generate orders based on time elapsed
            if (timeSinceLastOrder >= this.orderGenerationRate) {
                const ordersToGenerate = Math.floor(Math.random() * 3) + 1;
                for (let i = 0; i < ordersToGenerate; i++) {
                    this.messageQueue.enqueue('order', {}, 2);
                }
                this.lastOrderTime = now;
            }

            // Check for whale events
            if (now - this.lastWhaleEvent > this.whaleEventInterval) {
                if (Math.random() < 0.4) {
                    this.messageQueue.enqueue('whale', {}, 3);
                    this.lastWhaleEvent = now;
                    this.whaleEventInterval = 300000 + (Math.random() * this.whaleEventVariance - this.whaleEventVariance/2);
                }
            }

            // Queue cleanup operations
            this.messageQueue.enqueue('cleanup', {}, 1);

            // Measure frame time
            const frameDuration = performance.now() - frameStart;
            this.performanceMonitor.addMetric('frameTime', frameDuration);

            // Continue the animation loop
            requestAnimationFrame(generateOrders);
        };

        // Start the animation loop
        requestAnimationFrame(generateOrders);
    }

    getPerformanceMetrics() {
        return this.performanceMonitor.getMetricsSummary();
    }

    enablePerformanceDebug() {
        this.performanceMonitor.enableDebug();
    }

    disablePerformanceDebug() {
        this.performanceMonitor.disableDebug();
    }

    cleanupOldOrders() {
        const now = Date.now();
        const maxAge = 60000; // 1 minute max age for orders

        const cleanupLevel = (level) => {
            Array.from(level.orders.entries()).forEach(([makerId, order]) => {
                if (now - order.timestamp > maxAge) {
                    level.removeOrder(makerId);
                }
            });
        };

        // Cleanup old orders from both buy and sell sides
        this.orderBook.buyLevels.forEach(cleanupLevel);
        this.orderBook.sellLevels.forEach(cleanupLevel);
    }

    stop() {
        this.running = false;
    }

    updateOrderAges() {
        // Update ages for all orders
        const updateLevelOrders = (level) => {
            level.orders.forEach(order => order.updateAge());
        };

        this.orderBook.buyLevels.forEach(updateLevelOrders);
        this.orderBook.sellLevels.forEach(updateLevelOrders);
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