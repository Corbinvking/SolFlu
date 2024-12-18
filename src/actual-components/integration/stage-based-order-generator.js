/**
 * Stage-Based Order Generator
 * Generates orders appropriate for each market growth stage
 * Works with MarketGrowthStages to create realistic order flow
 */

import orderVerification from './utils/order-verification';

class StageBasedOrderGenerator {
    constructor(growthStages) {
        this.growthStages = growthStages;
        this.lastOrderTime = 0;
        this.orderIdCounter = 0;

        // Order type distribution (changes with stages)
        this.orderTypes = {
            MICRO: {    // Small retail orders
                weight: 0.6,
                sizeMultiplier: 0.3
            },
            NORMAL: {   // Normal retail orders
                weight: 0.3,
                sizeMultiplier: 1.0
            },
            WHALE: {    // Large/institutional orders
                weight: 0.1,
                sizeMultiplier: 3.0
            }
        };
    }

    /**
     * Generate a unique order ID
     * @returns {string} Unique order identifier
     */
    generateOrderId() {
        const timestamp = Date.now().toString(36);
        const counter = (this.orderIdCounter++).toString(36).padStart(4, '0');
        return `${timestamp}-${counter}`;
    }

    /**
     * Calculate price based on current stage and direction
     * @param {string} side Buy or sell
     * @param {number} currentPrice Current market price
     * @returns {number} Calculated order price
     */
    calculateOrderPrice(side, currentPrice) {
        const stageData = this.growthStages.getCurrentStageData();
        const { spreadPercentage, volatilityRange } = stageData;
        
        // Base spread calculation
        const baseSpread = currentPrice * spreadPercentage;
        
        // Add volatility influence
        const volatilityImpact = currentPrice * 
            (this.growthStages.metrics.volatility * Math.random() * 0.1);
        
        // Calculate final spread
        const spread = baseSpread + volatilityImpact;
        
        // Apply spread based on side
        if (side === 'buy') {
            return currentPrice - (spread * (0.5 + Math.random()));
        } else {
            return currentPrice + (spread * (0.5 + Math.random()));
        }
    }

    /**
     * Determine order type based on current stage
     * @returns {string} Order type (MICRO, NORMAL, or WHALE)
     */
    determineOrderType() {
        const stageData = this.growthStages.getCurrentStageData();
        const rand = Math.random();
        
        // Adjust weights based on stage
        let adjustedWeights = { ...this.orderTypes };
        
        // More whales in later stages
        if (stageData.name === 'MATURATION' || stageData.name === 'PEAK') {
            adjustedWeights.WHALE.weight = 0.2;
            adjustedWeights.NORMAL.weight = 0.4;
            adjustedWeights.MICRO.weight = 0.4;
        }
        
        // More micro orders in early stages
        if (stageData.name === 'LAUNCH' || stageData.name === 'EARLY_GROWTH') {
            adjustedWeights.WHALE.weight = 0.05;
            adjustedWeights.NORMAL.weight = 0.25;
            adjustedWeights.MICRO.weight = 0.7;
        }

        // Normalize weights
        const totalWeight = Object.values(adjustedWeights).reduce((sum, type) => sum + type.weight, 0);
        let cumulative = 0;
        
        for (const [type, data] of Object.entries(adjustedWeights)) {
            const normalizedWeight = data.weight / totalWeight;
            cumulative += normalizedWeight;
            if (rand <= cumulative) return type;
        }
        
        return 'NORMAL'; // Fallback
    }

    /**
     * Generate a new order based on current market stage
     * @param {number} currentPrice Current market price
     * @returns {Object} Generated order
     */
    generateOrder(currentPrice) {
        const stageData = this.growthStages.getCurrentStageData();
        const orderType = this.determineOrderType();
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        
        // Calculate order size
        const { min, max } = this.growthStages.calculateOrderSize();
        
        // Ensure minimum size based on order type
        let baseSize;
        switch(orderType) {
            case 'MICRO':
                baseSize = min + (Math.random() * (max - min) * 0.3);
                break;
            case 'NORMAL':
                baseSize = min + (Math.random() * (max - min));
                break;
            case 'WHALE':
                baseSize = max + (Math.random() * max * 2); // Whales can go up to 3x max
                break;
            default:
                baseSize = min + (Math.random() * (max - min));
        }
        
        // Ensure we never go below minimum
        const finalSize = Math.max(min, baseSize);
        
        // Calculate price with stage-appropriate spread
        const price = this.calculateOrderPrice(side, currentPrice);
        
        const order = {
            id: this.generateOrderId(),
            type: orderType,
            side: side,
            price: Number(price.toFixed(8)),
            amount: Number(finalSize.toFixed(2)),
            timestamp: Date.now(),
            stage: stageData.name
        };

        // Log order for verification
        orderVerification.logOrder(
            order,
            stageData,
            this.growthStages.currentMarketCap
        );

        return order;
    }

    /**
     * Check if it's time to generate new orders based on stage frequency
     * @returns {boolean} Whether to generate new orders
     */
    shouldGenerateOrder() {
        // In test environment, always generate orders
        if (process.env.NODE_ENV === 'test') {
            return true;
        }

        const now = Date.now();
        const stageData = this.growthStages.getCurrentStageData();
        const timeSinceLastOrder = now - this.lastOrderTime;
        
        // Always allow first order
        if (this.lastOrderTime === 0) {
            this.lastOrderTime = now;
            return true;
        }
        
        // Check if enough time has passed based on stage frequency
        if (timeSinceLastOrder >= stageData.orderFrequency) {
            this.lastOrderTime = now;
            return true;
        }
        
        return false;
    }

    /**
     * Generate a batch of orders appropriate for current stage
     * @param {number} currentPrice Current market price
     * @returns {Array} Array of generated orders
     */
    generateOrderBatch(currentPrice) {
        if (!this.shouldGenerateOrder()) {
            return [];
        }

        const stageData = this.growthStages.getCurrentStageData();
        const batchSize = Math.floor(Math.random() * 3) + 1; // 1-3 orders per batch
        const orders = [];

        for (let i = 0; i < batchSize; i++) {
            orders.push(this.generateOrder(currentPrice));
        }

        return orders;
    }

    /**
     * Enable or disable order verification
     * @param {boolean} enabled Whether to enable verification
     */
    setVerification(enabled) {
        if (enabled) {
            orderVerification.enable();
        } else {
            orderVerification.disable();
        }
    }

    /**
     * Get order verification analytics
     * @returns {Object} Order analytics data
     */
    getOrderAnalytics() {
        return orderVerification.getAnalytics();
    }

    /**
     * Get recent orders for verification
     * @param {number} count Number of recent orders to retrieve
     * @returns {Array} Recent orders
     */
    getRecentOrders(count) {
        return orderVerification.getRecentOrders(count);
    }
}

export default StageBasedOrderGenerator; 