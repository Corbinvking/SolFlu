/**
 * Order Verification Utility
 * Provides logging and verification for order generation without impacting performance
 */

class OrderVerification {
    constructor() {
        this.orderLog = [];
        this.isEnabled = false;
        this.maxLogSize = 1000; // Prevent memory issues
        this.lastStage = null;
        this.lastStageChangeTime = Date.now();
    }

    enable() {
        this.isEnabled = true;
        this.orderLog = [];
        this.lastStage = null;
        this.lastStageChangeTime = Date.now();
    }

    disable() {
        this.isEnabled = false;
        this.orderLog = [];
        this.lastStage = null;
    }

    logOrder(order, stageData, marketCap) {
        if (!this.isEnabled) return;

        // Track stage transitions
        if (this.lastStage === null) {
            this.lastStage = stageData.name;
        } else if (this.lastStage !== stageData.name) {
            const transitionTime = Date.now();
            this.orderLog.push({
                timestamp: transitionTime,
                isTransition: true,
                from: this.lastStage,
                to: stageData.name,
                duration: transitionTime - this.lastStageChangeTime,
                marketCap: marketCap
            });
            this.lastStage = stageData.name;
            this.lastStageChangeTime = transitionTime;
        }

        // Maintain max log size
        if (this.orderLog.length >= this.maxLogSize) {
            // Keep some history for transitions
            const transitions = this.orderLog.filter(entry => entry.isTransition);
            const recentOrders = this.orderLog.slice(-Math.floor(this.maxLogSize * 0.9));
            this.orderLog = [...transitions, ...recentOrders];
        }

        const logEntry = {
            timestamp: Date.now(),
            order: {
                size: order.amount,
                price: order.price,
                type: order.type,
                side: order.side
            },
            stage: {
                name: stageData.name,
                expectedSizeRange: stageData.orderSizeRange,
                currentMarketCap: marketCap
            },
            verification: {
                withinRange: this.verifyOrderSize(order.amount, stageData),
                sizeToMarketCapRatio: order.amount / marketCap
            }
        };

        this.orderLog.push(logEntry);
    }

    verifyOrderSize(size, stageData) {
        const [min, max] = stageData.orderSizeRange;
        return size >= min && size <= max * 3; // 3x max for whale orders
    }

    getAnalytics() {
        if (!this.isEnabled || this.orderLog.length === 0) {
            return null;
        }

        const analytics = {
            totalOrders: 0,
            averageSize: 0,
            sizeDistribution: {
                belowRange: 0,
                withinRange: 0,
                aboveRange: 0
            },
            orderTypes: {
                MICRO: 0,
                NORMAL: 0,
                WHALE: 0
            },
            stageTransitions: []
        };

        this.orderLog.forEach(entry => {
            if (entry.isTransition) {
                analytics.stageTransitions.push({
                    from: entry.from,
                    to: entry.to,
                    duration: entry.duration,
                    marketCap: entry.marketCap
                });
                return;
            }

            analytics.totalOrders++;
            analytics.averageSize += entry.order.size;
            
            // Track range compliance
            if (entry.verification.withinRange) {
                analytics.sizeDistribution.withinRange++;
            } else if (entry.order.size < entry.stage.expectedSizeRange[0]) {
                analytics.sizeDistribution.belowRange++;
            } else {
                analytics.sizeDistribution.aboveRange++;
            }

            // Track order types
            analytics.orderTypes[entry.order.type]++;
        });

        if (analytics.totalOrders > 0) {
            analytics.averageSize /= analytics.totalOrders;
        }

        return analytics;
    }

    getRecentOrders(count = 10) {
        if (!this.isEnabled) return [];
        return this.orderLog
            .filter(entry => !entry.isTransition)
            .slice(-count);
    }

    clear() {
        this.orderLog = [];
        this.lastStage = null;
        this.lastStageChangeTime = Date.now();
    }
}

// Create singleton instance
const orderVerification = new OrderVerification();
export default orderVerification; 