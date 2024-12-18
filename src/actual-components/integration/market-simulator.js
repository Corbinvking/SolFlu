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
        this.orderBook = new OrderBook();
        this.running = false;
        this.lastUpdate = Date.now();
        this.updateInterval = 100; // Update every 100ms
        this.performanceMonitor = new PerformanceMonitor();
        this.messageQueue = new MessageQueue();
        
        // Initialize with some orders
        for (let i = 0; i < 20; i++) {
            this.orderBook.generateRandomOrder();
        }
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.update();
    }

    stop() {
        this.running = false;
    }

    update() {
        if (!this.running) return;

        const now = Date.now();
        const deltaTime = now - this.lastUpdate;

        if (deltaTime >= this.updateInterval) {
            // Measure the entire update operation
            this.performanceMonitor.measureOperation(() => {
                // Generate new orders
                const orderCount = Math.floor(Math.random() * 3) + 1; // 1-3 orders per update
                for (let i = 0; i < orderCount; i++) {
                    if (Math.random() < 0.1) { // 10% chance for whale order
                        this.orderBook.generateWhaleOrder();
                    } else {
                        this.orderBook.generateRandomOrder();
                    }
                }

                // Remove some old orders
                this.cleanupOldOrders();

                // Update market metrics
                const marketState = this.getMarketState();
                this.performanceMonitor.updateMarketMetrics({
                    marketCap: this.orderBook.calculateMarketCap(),
                    volatility: this.orderBook.calculateVolatility()
                });

                // Update queue size metric
                this.performanceMonitor.setQueueSize(this.messageQueue.size());

                this.lastUpdate = now;
            }, 'stateUpdates');
        }

        // Measure frame time
        const frameStart = performance.now();
        requestAnimationFrame(() => {
            const frameDuration = performance.now() - frameStart;
            this.performanceMonitor.addMetric('frameTime', frameDuration);
            this.update();
        });
    }

    cleanupOldOrders() {
        this.performanceMonitor.measureOperation(() => {
            const state = this.orderBook.getMarketState();
            const now = Date.now();
            const maxAge = 30000; // 30 seconds

            [...state.buyOrders, ...state.sellOrders].forEach(order => {
                if (now - order.timestamp > maxAge) {
                    this.orderBook.removeOrder(order.makerId, order.price, order.side);
                }
            });
        }, 'orderProcessing');
    }

    getMarketState() {
        return this.performanceMonitor.measureOperation(() => {
            return this.orderBook.getMarketState();
        }, 'stateUpdates');
    }

    subscribe(callback) {
        this.orderBook.subscribe(callback);
    }

    unsubscribe(callback) {
        this.orderBook.unsubscribe(callback);
    }

    reset() {
        this.stop();
        this.orderBook = new OrderBook();
        this.start();
    }

    injectVolatility(multiplier) {
        // Generate multiple whale orders to create volatility
        for (let i = 0; i < 5; i++) {
            this.orderBook.generateWhaleOrder();
        }
    }

    getPerformanceMetrics() {
        return this.performanceMonitor.getPerformanceReport();
    }

    enablePerformanceDebug() {
        this.performanceMonitor.enableDebug();
        console.log('Performance debugging enabled');
    }

    disablePerformanceDebug() {
        this.performanceMonitor.disableDebug();
        console.log('Performance debugging disabled');
    }

    notifySubscribers() {
        const state = this.getMarketState();
        this.messageQueue.enqueue('marketUpdate', state, 2); // High priority for market updates
    }
}

export default MarketSimulator; 