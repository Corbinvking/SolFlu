/**
 * Stage-Based Order Book
 * Manages order book state with respect to market growth stages
 * Provides depth and liquidity appropriate for each stage
 */

class StageBasedOrderBook {
    constructor(growthStages) {
        this.growthStages = growthStages;
        this.buyOrders = [];
        this.sellOrders = [];
        this.lastPrice = null;
        this.lastUpdateTime = Date.now();
        
        // Performance optimization: index orders by price level
        this.buyOrdersByPrice = new Map();
        this.sellOrdersByPrice = new Map();
    }

    /**
     * Add an order to the book
     * @param {Object} order Order to add
     */
    addOrder(order) {
        const orders = order.side === 'buy' ? this.buyOrders : this.sellOrders;
        const ordersByPrice = order.side === 'buy' ? this.buyOrdersByPrice : this.sellOrdersByPrice;
        
        orders.push(order);
        
        // Update price level index
        const priceKey = order.price.toFixed(8);
        if (!ordersByPrice.has(priceKey)) {
            ordersByPrice.set(priceKey, []);
        }
        ordersByPrice.get(priceKey).push(order);
        
        // Sort orders
        this.sortOrders();
        
        // Update last price if it's a match
        if (this.canMatch()) {
            this.lastPrice = this.getMidPrice();
        }
    }

    /**
     * Sort orders by price (desc for buys, asc for sells)
     */
    sortOrders() {
        this.buyOrders.sort((a, b) => b.price - a.price);
        this.sellOrders.sort((a, b) => a.price - b.price);
    }

    /**
     * Check if orders can be matched
     * @returns {boolean} Whether orders can be matched
     */
    canMatch() {
        if (this.buyOrders.length === 0 || this.sellOrders.length === 0) {
            return false;
        }
        return this.buyOrders[0].price >= this.sellOrders[0].price;
    }

    /**
     * Get the current mid price
     * @returns {number} Mid price
     */
    getMidPrice() {
        if (this.buyOrders.length === 0 || this.sellOrders.length === 0) {
            return this.lastPrice || 0;
        }
        return (this.buyOrders[0].price + this.sellOrders[0].price) / 2;
    }

    /**
     * Clean up old orders based on stage parameters
     */
    cleanupOldOrders() {
        const stageData = this.growthStages.getCurrentStageData();
        const now = Date.now();
        const maxAge = stageData.orderFrequency * 10; // Keep orders for 10x the order frequency
        
        const cleanup = (orders, ordersByPrice) => {
            const newOrders = orders.filter(order => {
                const shouldKeep = (now - order.timestamp) <= maxAge;
                if (!shouldKeep) {
                    // Remove from price level index
                    const priceKey = order.price.toFixed(8);
                    const ordersAtPrice = ordersByPrice.get(priceKey) || [];
                    const index = ordersAtPrice.indexOf(order);
                    if (index !== -1) {
                        ordersAtPrice.splice(index, 1);
                    }
                    if (ordersAtPrice.length === 0) {
                        ordersByPrice.delete(priceKey);
                    }
                }
                return shouldKeep;
            });
            return newOrders;
        };
        
        this.buyOrders = cleanup(this.buyOrders, this.buyOrdersByPrice);
        this.sellOrders = cleanup(this.sellOrders, this.sellOrdersByPrice);
    }

    /**
     * Get aggregated order book depth
     * @returns {Object} Order book depth data
     */
    getDepth() {
        const stageData = this.growthStages.getCurrentStageData();
        const depthLevels = stageData.depthLevels;
        
        const aggregateOrders = (orders, ascending = true) => {
            const depth = [];
            let currentTotal = 0;
            let lastPrice = null;
            let currentAmount = 0;
            
            for (const order of orders) {
                if (lastPrice !== null && lastPrice !== order.price) {
                    if (depth.length < depthLevels) {
                        depth.push({
                            price: lastPrice,
                            amount: currentAmount,
                            total: currentTotal
                        });
                    }
                    currentAmount = 0;
                }
                
                currentAmount += order.amount;
                currentTotal += order.amount;
                lastPrice = order.price;
            }
            
            // Add last level
            if (lastPrice !== null && depth.length < depthLevels) {
                depth.push({
                    price: lastPrice,
                    amount: currentAmount,
                    total: currentTotal
                });
            }
            
            return depth;
        };
        
        return {
            bids: aggregateOrders(this.buyOrders, false),
            asks: aggregateOrders(this.sellOrders, true),
            lastPrice: this.lastPrice,
            lastUpdate: Date.now()
        };
    }

    /**
     * Get current spread
     * @returns {number} Current spread percentage
     */
    getCurrentSpread() {
        if (this.buyOrders.length === 0 || this.sellOrders.length === 0) {
            return 0;
        }
        
        const bestBid = this.buyOrders[0].price;
        const bestAsk = this.sellOrders[0].price;
        const midPrice = (bestBid + bestAsk) / 2;
        
        return ((bestAsk - bestBid) / midPrice) * 100;
    }

    /**
     * Check if the order book needs rebalancing
     * @returns {boolean} Whether rebalancing is needed
     */
    needsRebalancing() {
        const stageData = this.growthStages.getCurrentStageData();
        const currentSpread = this.getCurrentSpread();
        
        // Check if spread is too wide
        if (currentSpread > (stageData.spreadPercentage * 100 * 2)) {
            return true;
        }
        
        // Check if we have enough depth
        if (this.buyOrders.length < stageData.depthLevels || 
            this.sellOrders.length < stageData.depthLevels) {
            return true;
        }
        
        return false;
    }

    calculateMarketCap() {
        const buyVolume = Array.from(this.buyLevels.values())
            .reduce((sum, level) => sum + level.totalAmount, 0);
        const sellVolume = Array.from(this.sellLevels.values())
            .reduce((sum, level) => sum + level.totalAmount, 0);
        
        // Get the current mid price
        const midPrice = this.getMidPrice();
        
        // Calculate total value using mid price and total volume
        const totalVolume = buyVolume + sellVolume;
        const marketCap = midPrice * totalVolume;

        // Ensure minimum market cap based on stage
        const stageData = this.growthStages.getCurrentStageData();
        const minMarketCap = stageData.range[0];
        
        // Log market cap calculation for debugging
        if (this.growthStages.debug) {
            console.log('Market Cap Calculation:', {
                buyVolume,
                sellVolume,
                midPrice,
                calculatedMarketCap: marketCap,
                minMarketCap,
                finalMarketCap: Math.max(marketCap, minMarketCap)
            });
        }

        return Math.max(marketCap, minMarketCap);
    }

    /**
     * Get the current mid price
     * @returns {number} Mid price
     */
    getMidPrice() {
        if (this.buyLevels.size === 0 || this.sellLevels.size === 0) {
            return this.lastPrice || this.initialPrice;
        }
        
        const bestBid = Math.max(...this.buyLevels.keys());
        const bestAsk = Math.min(...this.sellLevels.keys());
        return (bestBid + bestAsk) / 2;
    }

    /**
     * Check if the order book needs rebalancing
     * @returns {boolean} Whether rebalancing is needed
     */
    needsRebalancing() {
        const stageData = this.growthStages.getCurrentStageData();
        const currentSpread = this.getCurrentSpread();
        const currentMarketCap = this.calculateMarketCap();
        
        // Log rebalancing check for debugging
        if (this.growthStages.debug) {
            console.log('Rebalancing Check:', {
                currentSpread,
                targetSpread: stageData.spreadPercentage * 100,
                currentMarketCap,
                stageRange: stageData.range,
                needsRebalancing: currentSpread > (stageData.spreadPercentage * 100 * 2) ||
                    this.buyLevels.length < stageData.depthLevels ||
                    this.sellLevels.length < stageData.depthLevels
            });
        }
        
        // Check if spread is too wide
        if (currentSpread > (stageData.spreadPercentage * 100 * 2)) {
            return true;
        }
        
        // Check if we have enough depth
        if (this.buyLevels.size < stageData.depthLevels || 
            this.sellLevels.size < stageData.depthLevels) {
            return true;
        }
        
        return false;
    }
}

export default StageBasedOrderBook; 