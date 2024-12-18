import MarketGrowthStages from '../market-growth-stages';
import StageBasedOrderGenerator from '../stage-based-order-generator';
import orderVerification from '../utils/order-verification';

describe('Order Verification System', () => {
    let growthStages;
    let orderGenerator;

    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        growthStages = new MarketGrowthStages();
        orderGenerator = new StageBasedOrderGenerator(growthStages);
        orderVerification.clear();
        orderGenerator.setVerification(true);

        // Set up stage transition callback
        growthStages.setStageChangeCallback((oldStage, newStage, marketCap) => {
            orderVerification.logOrder({
                id: 'transition',
                type: 'SYSTEM',
                side: 'none',
                price: 0,
                amount: 0,
                timestamp: Date.now(),
                stage: newStage
            }, {
                name: newStage,
                orderSizeRange: growthStages.STAGES[newStage].orderSizeRange,
            }, marketCap);
        });
    });

    afterEach(() => {
        orderGenerator.setVerification(false);
        orderVerification.clear();
        process.env.NODE_ENV = 'development';
    });

    test('generates orders within size range for LAUNCH stage', () => {
        // Generate 50 orders in LAUNCH stage
        const currentPrice = 100;
        let orders = [];
        
        for (let i = 0; i < 50; i++) {
            const batch = orderGenerator.generateOrderBatch(currentPrice);
            orders = orders.concat(batch);
        }

        const analytics = orderGenerator.getOrderAnalytics();
        
        // Verify order counts
        expect(analytics.totalOrders).toBeGreaterThan(0);
        expect(analytics.sizeDistribution.belowRange).toBe(0);
        
        // Verify order type distribution
        expect(analytics.orderTypes.MICRO).toBeGreaterThan(0);
        expect(analytics.orderTypes.NORMAL).toBeGreaterThan(0);
        expect(analytics.orderTypes.WHALE).toBeGreaterThanOrEqual(0);

        // Get recent orders for detailed verification
        const recentOrders = orderGenerator.getRecentOrders(10);
        recentOrders.forEach(entry => {
            const { order, stage, verification } = entry;
            
            // Verify order size relative to stage
            if (order.type === 'WHALE') {
                expect(order.size).toBeLessThanOrEqual(stage.expectedSizeRange[1] * 3);
            } else {
                expect(order.size).toBeLessThanOrEqual(stage.expectedSizeRange[1]);
            }
            expect(order.size).toBeGreaterThanOrEqual(stage.expectedSizeRange[0]);
            
            // Verify market cap ratio is reasonable
            expect(verification.sizeToMarketCapRatio).toBeLessThan(0.1); // Order size should be less than 10% of market cap
        });
    });

    test('handles stage transitions correctly', async () => {
        // Start at LAUNCH stage
        expect(growthStages.currentStage).toBe('LAUNCH');
        
        // Generate some orders in LAUNCH stage
        for (let i = 0; i < 10; i++) {
            orderGenerator.generateOrderBatch(100);
        }
        
        // Force market cap increase to trigger stage transition
        growthStages.setMarketCap(15000); // Should trigger EARLY_GROWTH
        
        // Generate orders in new stage
        for (let i = 0; i < 20; i++) {
            orderGenerator.generateOrderBatch(200);
        }

        const analytics = orderGenerator.getOrderAnalytics();
        
        // Verify stage transition was recorded
        expect(analytics.stageTransitions.length).toBeGreaterThan(0);
        expect(analytics.stageTransitions[0].from).toBe('LAUNCH');
        expect(analytics.stageTransitions[0].to).toBe('EARLY_GROWTH');
        
        // Verify order sizes adjusted for new stage
        const recentOrders = orderGenerator.getRecentOrders(5);
        recentOrders.forEach(entry => {
            expect(entry.stage.name).toBe('EARLY_GROWTH');
            expect(entry.order.size).toBeGreaterThanOrEqual(50); // EARLY_GROWTH minimum
        });
    });

    test('maintains performance with verification enabled', () => {
        const startTime = Date.now();
        const currentPrice = 100;
        
        // Generate 1000 orders
        for (let i = 0; i < 1000; i++) {
            orderGenerator.generateOrderBatch(currentPrice);
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Verification should not add significant overhead
        // 1000 orders should process in less than 1 second
        expect(duration).toBeLessThan(1000);
        
        // Verify log size is capped
        const analytics = orderGenerator.getOrderAnalytics();
        expect(analytics.totalOrders).toBeLessThanOrEqual(1000);
    });

    test('verifies order type distribution', () => {
        const currentPrice = 100;
        
        // Generate 200 orders to get better distribution
        for (let i = 0; i < 200; i++) {
            orderGenerator.generateOrderBatch(currentPrice);
        }
        
        const analytics = orderGenerator.getOrderAnalytics();
        
        // Verify LAUNCH stage distribution
        // MICRO: 70%, NORMAL: 25%, WHALE: 5%
        const totalOrders = analytics.totalOrders;
        const microRatio = analytics.orderTypes.MICRO / totalOrders;
        const normalRatio = analytics.orderTypes.NORMAL / totalOrders;
        const whaleRatio = analytics.orderTypes.WHALE / totalOrders;
        
        // Allow for some random variation (±10%)
        expect(microRatio).toBeGreaterThan(0.6);   // Should be close to 0.7
        expect(normalRatio).toBeGreaterThan(0.15); // Should be close to 0.25
        expect(whaleRatio).toBeLessThan(0.1);      // Should be close to 0.05
    });
}); 