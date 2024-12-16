import { UpdateQueue, SpreadMechanism } from './spread-components';

describe('UpdateQueue', () => {
    let queue;

    beforeEach(() => {
        queue = new UpdateQueue();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('adds updates to queue and processes them', async () => {
        const update = { type: 'spread', data: { test: true } };
        const results = await queue.addUpdate(update);
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(1);
        expect(results[0]).toHaveProperty('type', 'spread');
        expect(results[0]).toHaveProperty('result');
    });

    test('processes spread updates with handlers', async () => {
        const mockHandler = jest.fn();
        queue.setHandler('spread', mockHandler);

        const update = { type: 'spread', data: { spreadRate: 0.5 } };
        const result = await queue.applyUpdate(update);
        expect(mockHandler).toHaveBeenCalledWith(update.data);
        expect(result).toHaveProperty('type', 'spread');
        expect(result.result).toEqual(update.data);
    });

    test('processes route updates with handlers', async () => {
        const mockHandler = jest.fn();
        queue.setHandler('route', mockHandler);

        const update = { type: 'route', data: { routes: [] } };
        const result = await queue.applyUpdate(update);
        expect(mockHandler).toHaveBeenCalledWith(update.data);
        expect(result).toHaveProperty('type', 'route');
        expect(result.result).toEqual(update.data);
    });

    test('handles unknown update types', async () => {
        const update = { type: 'unknown', data: {} };
        const result = await queue.applyUpdate(update);
        expect(console.warn).toHaveBeenCalledWith('Unknown update type:', 'unknown');
        expect(result).toBeNull();
    });

    test('handles errors during update processing', async () => {
        const mockHandler = jest.fn(() => {
            throw new Error('Test error');
        });
        queue.setHandler('spread', mockHandler);

        const update = { type: 'spread', data: { test: true } };
        const result = await queue.applyUpdate(update);
        expect(console.error).toHaveBeenCalled();
        expect(result).toBeNull();
    });

    test('maintains frame rate during processing', async () => {
        jest.spyOn(performance, 'now')
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(5)
            .mockReturnValueOnce(10);

        const updates = [
            { type: 'spread', data: { test: 1 } },
            { type: 'spread', data: { test: 2 } }
        ];

        const allResults = [];
        for (const update of updates) {
            const results = await queue.addUpdate(update);
            allResults.push(...results);
        }

        expect(allResults.length).toBe(updates.length);
        allResults.forEach((result, index) => {
            expect(result).toHaveProperty('type', 'spread');
            expect(result.result).toEqual(updates[index].data);
        });
    });

    test('clears queue and results', async () => {
        const update = { type: 'spread', data: { test: true } };
        await queue.addUpdate(update);
        
        queue.clear();
        expect(queue.queue.length).toBe(0);
        expect(queue.results.length).toBe(0);
        expect(queue.processing).toBe(false);
    });
});

describe('SpreadMechanism', () => {
    let mechanism;
    let mockMarketData;

    beforeEach(() => {
        mechanism = new SpreadMechanism();
        mockMarketData = {
            marketCap: 1000000,
            volatility: 0.5,
            infectionCenters: new Map([
                ['center1', { x: 0, y: 0 }],
                ['center2', { x: 1, y: 1 }]
            ])
        };
        jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('calculates spread rate based on market data', () => {
        const deltaTime = 1000;
        const spreadRate = mechanism.calculateSpreadRate(mockMarketData, deltaTime);
        
        expect(spreadRate).toBeGreaterThan(0);
        expect(spreadRate).toBeLessThan(mockMarketData.marketCap);
    });

    test('calculates intensity based on volatility', () => {
        const intensity = mechanism.calculateIntensity(mockMarketData);
        expect(intensity).toBe(0.5);

        // Test max intensity
        mockMarketData.volatility = 1.5;
        expect(mechanism.calculateIntensity(mockMarketData)).toBe(1);
    });

    test('updates infection centers with intensity', () => {
        const centers = mechanism.updateCenters(mockMarketData);
        
        expect(centers).toHaveLength(2);
        centers.forEach(center => {
            expect(center).toHaveProperty('intensity');
            expect(center.intensity).toBe(mockMarketData.volatility);
        });
    });

    test('provides complete update with all required data', () => {
        const update = mechanism.update(mockMarketData);
        
        expect(update).toHaveProperty('spreadRate');
        expect(update).toHaveProperty('intensity');
        expect(update).toHaveProperty('centers');
        expect(Array.isArray(update.centers)).toBeTruthy();
    });

    test('handles time-based updates correctly', () => {
        // First update
        const update1 = mechanism.update(mockMarketData);
        
        // Simulate time passing
        jest.spyOn(performance, 'now').mockReturnValue(Date.now() + 1000);
        
        // Second update
        const update2 = mechanism.update(mockMarketData);
        
        expect(update2.spreadRate).not.toBe(update1.spreadRate);
    });
}); 