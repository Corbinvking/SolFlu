import MarketGrowthStages from '../market-growth-stages';
import StageBasedOrderGenerator from '../stage-based-order-generator';
import StageBasedOrderBook from '../stage-based-order-book';

describe('Stage-Based Market System', () => {
    let growthStages;
    let orderGenerator;
    let orderBook;

    beforeEach(() => {
        growthStages = new MarketGrowthStages();
        orderGenerator = new StageBasedOrderGenerator(growthStages);
        orderBook = new StageBasedOrderBook(growthStages);
    });

    describe('MarketGrowthStages', () => {
        test('initializes at LAUNCH stage', () => {
            const stageData = growthStages.getCurrentStageData();
            expect(stageData.name).toBe('LAUNCH');
        });

        test('calculates appropriate order sizes for stage', () => {
            const orderSize = growthStages.calculateOrderSize();
            expect(orderSize.min).toBeGreaterThan(0);
            expect(orderSize.max).toBeGreaterThan(orderSize.min);
            expect(orderSize.max).toBeLessThanOrEqual(growthStages.STAGES.LAUNCH.orderSizeRange[1]);
        });

        test('progresses through stages correctly', () => {
            // Simulate market cap growth
            growthStages.currentMarketCap = 15000; // Should move to EARLY_GROWTH
            const newStage = growthStages.progressStage();
            expect(newStage.name).toBe('EARLY_GROWTH');
        });

        test('updates metrics appropriately', () => {
            growthStages.updateMetrics({
                volumeChange: 0.2,
                priceChange: 0.1,
                timeElapsed: 1000
            });
            expect(growthStages.metrics.momentum).toBeDefined();
            expect(growthStages.metrics.volatility).toBeGreaterThan(0);
            expect(growthStages.metrics.growthRate).toBeGreaterThan(1);
        });
    });

    describe('StageBasedOrderGenerator', () => {
        test('generates valid order IDs', () => {
            const orderId = orderGenerator.generateOrderId();
            expect(typeof orderId).toBe('string');
            expect(orderId).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
        });

        test('calculates appropriate prices', () => {
            const currentPrice = 100;
            const buyPrice = orderGenerator.calculateOrderPrice('buy', currentPrice);
            const sellPrice = orderGenerator.calculateOrderPrice('sell', currentPrice);
            
            expect(buyPrice).toBeLessThan(currentPrice);
            expect(sellPrice).toBeGreaterThan(currentPrice);
        });

        test('generates orders with correct structure', () => {
            const order = orderGenerator.generateOrder(100);
            
            expect(order).toHaveProperty('id');
            expect(order).toHaveProperty('type');
            expect(order).toHaveProperty('side');
            expect(order).toHaveProperty('price');
            expect(order).toHaveProperty('amount');
            expect(order).toHaveProperty('timestamp');
            expect(order).toHaveProperty('stage');
            
            expect(['MICRO', 'NORMAL', 'WHALE']).toContain(order.type);
            expect(['buy', 'sell']).toContain(order.side);
        });

        test('respects order generation frequency', () => {
            // Mock Date.now to control timing
            const originalDateNow = Date.now;
            const mockNow = jest.fn();
            let currentTime = 1000;
            mockNow.mockImplementation(() => currentTime);
            global.Date.now = mockNow;

            const firstCheck = orderGenerator.shouldGenerateOrder();
            
            // Advance time by less than the frequency
            currentTime += 100;
            const tooSoonCheck = orderGenerator.shouldGenerateOrder();
            
            // Advance time by more than the frequency
            currentTime += 2000;
            const timePassedCheck = orderGenerator.shouldGenerateOrder();

            // Restore original Date.now
            global.Date.now = originalDateNow;
            
            expect(firstCheck).toBe(true);
            expect(tooSoonCheck).toBe(false);
            expect(timePassedCheck).toBe(true);
        });

        test('generates appropriate batch sizes', () => {
            const batch = orderGenerator.generateOrderBatch(100);
            expect(Array.isArray(batch)).toBe(true);
            expect(batch.length).toBeLessThanOrEqual(3);
            expect(batch.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('StageBasedOrderBook', () => {
        test('maintains sorted order books', () => {
            const buyOrder1 = orderGenerator.generateOrder(100);
            const buyOrder2 = orderGenerator.generateOrder(100);
            buyOrder1.side = 'buy';
            buyOrder2.side = 'buy';
            
            orderBook.addOrder(buyOrder1);
            orderBook.addOrder(buyOrder2);
            
            expect(orderBook.buyOrders.length).toBe(2);
            if (orderBook.buyOrders[0].price < orderBook.buyOrders[1].price) {
                expect(true).toBe(false); // Buy orders should be sorted desc
            }
        });

        test('calculates spread correctly', () => {
            const buyOrder = orderGenerator.generateOrder(100);
            const sellOrder = orderGenerator.generateOrder(100);
            buyOrder.side = 'buy';
            sellOrder.side = 'sell';
            
            orderBook.addOrder(buyOrder);
            orderBook.addOrder(sellOrder);
            
            const spread = orderBook.getCurrentSpread();
            expect(typeof spread).toBe('number');
            expect(spread).toBeGreaterThanOrEqual(0);
        });

        test('aggregates depth data correctly', () => {
            // Add some test orders
            for (let i = 0; i < 5; i++) {
                const order = orderGenerator.generateOrder(100);
                orderBook.addOrder(order);
            }
            
            const depth = orderBook.getDepth();
            expect(depth).toHaveProperty('bids');
            expect(depth).toHaveProperty('asks');
            expect(depth).toHaveProperty('lastPrice');
            expect(depth).toHaveProperty('lastUpdate');
            
            // Check depth levels respect stage settings
            const stageData = growthStages.getCurrentStageData();
            expect(depth.bids.length).toBeLessThanOrEqual(stageData.depthLevels);
            expect(depth.asks.length).toBeLessThanOrEqual(stageData.depthLevels);
        });

        test('cleans up old orders', () => {
            const order = orderGenerator.generateOrder(100);
            order.timestamp = Date.now() - 1000000; // Old order
            orderBook.addOrder(order);
            
            const initialCount = orderBook.buyOrders.length + orderBook.sellOrders.length;
            orderBook.cleanupOldOrders();
            const finalCount = orderBook.buyOrders.length + orderBook.sellOrders.length;
            
            expect(finalCount).toBeLessThan(initialCount);
        });

        test('detects need for rebalancing', () => {
            // Add orders with wide spread
            const buyOrder = orderGenerator.generateOrder(100);
            const sellOrder = orderGenerator.generateOrder(100);
            buyOrder.side = 'buy';
            buyOrder.price = 90;
            sellOrder.side = 'sell';
            sellOrder.price = 110;
            
            orderBook.addOrder(buyOrder);
            orderBook.addOrder(sellOrder);
            
            const needsRebalancing = orderBook.needsRebalancing();
            expect(typeof needsRebalancing).toBe('boolean');
        });
    });

    describe('Integration Tests', () => {
        test('full order lifecycle', () => {
            // Generate orders at current price
            const currentPrice = 100;
            const buyOrder = {
                id: 'test-buy-1',
                side: 'buy',
                price: 95,
                amount: 10,
                timestamp: Date.now()
            };
            
            const sellOrder = {
                id: 'test-sell-1',
                side: 'sell',
                price: 105,
                amount: 15,
                timestamp: Date.now()
            };
            
            // Add orders to book
            orderBook.addOrder(buyOrder);
            orderBook.addOrder(sellOrder);
            
            // Verify order book state
            expect(orderBook.buyOrders.length + orderBook.sellOrders.length).toBe(2);
            
            // Check depth data
            const depth = orderBook.getDepth();
            expect(depth.bids.length + depth.asks.length).toBeGreaterThan(0);
            
            // Verify stage-appropriate spreads
            const spread = orderBook.getCurrentSpread();
            const stageData = growthStages.getCurrentStageData();
            expect(spread).toBeGreaterThanOrEqual(0);
            
            // Clean up and verify
            orderBook.cleanupOldOrders();
            expect(orderBook.buyOrders.length + orderBook.sellOrders.length).toBe(2);
        });

        test('stage progression affects order generation', () => {
            // Get orders in LAUNCH stage with a fixed price
            const launchOrders = [orderGenerator.generateOrder(100)];
            const launchTotal = launchOrders.reduce((sum, order) => sum + order.amount, 0);
            
            // Progress to EARLY_GROWTH
            growthStages.currentMarketCap = 15000;
            growthStages.progressStage();
            
            // Get orders in EARLY_GROWTH stage with the same price
            const growthOrders = [orderGenerator.generateOrder(100)];
            const growthTotal = growthOrders.reduce((sum, order) => sum + order.amount, 0);
            
            // Verify order characteristics differ between stages
            expect(launchTotal).not.toBe(growthTotal);
            
            // Additional verification
            const launchStageData = growthStages.STAGES.LAUNCH;
            const earlyGrowthStageData = growthStages.STAGES.EARLY_GROWTH;
            
            expect(launchOrders[0].amount).toBeLessThanOrEqual(launchStageData.orderSizeRange[1]);
            expect(growthOrders[0].amount).toBeGreaterThanOrEqual(earlyGrowthStageData.orderSizeRange[0]);
        });
    });
}); 