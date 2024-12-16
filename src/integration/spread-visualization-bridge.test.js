import SpreadVisualizationBridge from './spread-visualization-bridge';

// Mock LayerManager
class MockLayerManager {
    constructor() {
        this.layers = new Map();
        this.updates = [];
    }

    addVirusSpread(id, data, config) {
        this.layers.set(id, { data, config });
        return {
            stop: jest.fn(),
            setDuration: jest.fn(),
            setOnFrame: jest.fn()
        };
    }

    updateLayer(id, updates) {
        this.updates.push({ id, updates });
    }
}

describe('SpreadVisualizationBridge', () => {
    let bridge;
    let layerManager;

    beforeEach(() => {
        layerManager = new MockLayerManager();
        bridge = new SpreadVisualizationBridge(layerManager);
        jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Pattern Creation and Visualization', () => {
        test('creates pattern with visualization', () => {
            const position = [0, 0];
            const patternId = bridge.createSpreadPattern('exponential', position);

            expect(patternId).toBeDefined();
            expect(layerManager.layers.has(patternId)).toBeTruthy();

            const layerData = layerManager.layers.get(patternId);
            expect(layerData.data.source.coordinates).toEqual(position);
            expect(layerData.data.spread).toBeDefined();
            expect(layerData.data.spread.length).toBeGreaterThan(0);
        });

        test('updates pattern visualization on market changes', () => {
            const position = [0, 0];
            const patternId = bridge.createSpreadPattern('exponential', position);

            bridge.updateMarketConditions({
                marketCap: 1200,
                previousMarketCap: 1000,
                volatility: 0.5,
                maxMarketCap: 2000
            });

            const updates = layerManager.updates.filter(u => u.id.startsWith(patternId));
            expect(updates.length).toBeGreaterThan(0);
        });
    });

    describe('Pattern Evolution', () => {
        test('evolves patterns over time', () => {
            const position = [0, 0];
            const patternId = bridge.createSpreadPattern('exponential', position);

            // Clear initial updates
            layerManager.updates = [];

            // Simulate time passing
            performance.now.mockReturnValue(Date.now() + 1000);
            bridge.update();

            const updates = layerManager.updates.filter(u => u.id.startsWith(patternId));
            expect(updates.length).toBeGreaterThan(0);
        });

        test('handles pattern termination', () => {
            const position = [0, 0];
            const patternId = bridge.createSpreadPattern('exponential', position);

            // Force pattern to age rapidly
            const pattern = bridge.patternManager.getActivePatterns()[0];
            pattern.age = 11; // Exceeds max age
            pattern.intensity = 0.05; // Below minimum intensity

            // Update to trigger termination
            bridge.update();

            // Check pattern was removed
            expect(bridge.patternManager.getActivePatterns().length).toBe(0);
            expect(bridge.activeVisualizations.has(patternId)).toBeFalsy();
        });
    });

    describe('Market Integration', () => {
        test('patterns respond to market volatility', () => {
            const position = [0, 0];
            bridge.createSpreadPattern('exponential', position);

            // Record initial state
            const initialPatterns = bridge.patternManager.getActivePatterns();
            const initialSpeed = initialPatterns[0].speed;

            // Update with high volatility market
            bridge.updateMarketConditions({
                marketCap: 1500,
                previousMarketCap: 1000,
                volatility: 0.8,
                maxMarketCap: 2000
            });

            // Check pattern adaptation
            const updatedPatterns = bridge.patternManager.getActivePatterns();
            expect(updatedPatterns[0].speed).not.toBe(initialSpeed);
        });

        test('handles multiple patterns simultaneously', () => {
            const positions = [[0, 0], [1, 1], [2, 2]];
            const patternIds = positions.map(pos => 
                bridge.createSpreadPattern('exponential', pos)
            );

            bridge.updateMarketConditions({
                marketCap: 1200,
                previousMarketCap: 1000,
                volatility: 0.5,
                maxMarketCap: 2000
            });

            // Check all patterns were updated
            patternIds.forEach(id => {
                const updates = layerManager.updates.filter(u => u.id.startsWith(id));
                expect(updates.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Cleanup', () => {
        test('properly cleans up all resources', () => {
            const positions = [[0, 0], [1, 1], [2, 2]];
            positions.forEach(pos => bridge.createSpreadPattern('exponential', pos));

            bridge.cleanup();

            expect(bridge.patternManager.getActivePatterns().length).toBe(0);
            expect(bridge.activeVisualizations.size).toBe(0);
        });
    });
}); 