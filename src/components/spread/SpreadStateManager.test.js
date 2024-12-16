import SpreadStateManager from './SpreadStateManager';
import { UpdateQueue, SpreadMechanism } from './spread-components';

// Mock LayerManager
class MockLayerManager {
    constructor() {
        this.layers = new Map();
        this.updates = [];
        this.baseLayerCount = 0;
        this.basePatterns = new Map();
        this.patternIdCounter = 1;
    }

    addVirusSpread(id, data, config) {
        const layerId = id || `pattern-${this.patternIdCounter++}`;
        this.layers.set(`${layerId}-heat`, { data, config });
        this.layers.set(`${layerId}-point`, { data: { coordinates: data.source.coordinates } });
        this.layers.set(layerId, { data, config });
        this.basePatterns.set(layerId, { 
            id: layerId,
            data: {
                source: { coordinates: data.source.coordinates },
                spread: data.spread
            },
            config
        });
        this.baseLayerCount++;
        return {
            stop: jest.fn(),
            setDuration: jest.fn(),
            setOnFrame: jest.fn()
        };
    }

    updateLayer(id, updates) {
        const baseId = id.replace('-heat', '').replace('-point', '');
        if (updates.remove) {
            if (!id.endsWith('-heat') && !id.endsWith('-point')) {
                this.baseLayerCount--;
                this.basePatterns.delete(baseId);
            }
            this.layers.delete(id);
            this.layers.delete(`${baseId}-heat`);
            this.layers.delete(`${baseId}-point`);
            this.layers.delete(baseId);
        } else {
            if (!this.layers.has(id) && updates.data) {
                this.layers.set(id, { data: updates.data });
                if (!id.endsWith('-heat') && !id.endsWith('-point')) {
                    if (!this.basePatterns.has(baseId)) {
                        this.basePatterns.set(baseId, { 
                            id: baseId,
                            data: updates.data
                        });
                        this.baseLayerCount++;
                    }
                }
            }
            this.updates.push({ id, updates });
        }
    }

    getLayers() {
        return Array.from(this.basePatterns.values());
    }

    get size() {
        return this.baseLayerCount;
    }

    clear() {
        this.layers.clear();
        this.updates = [];
        this.baseLayerCount = 0;
        this.basePatterns.clear();
        this.patternIdCounter = 1;
    }
}

describe('SpreadStateManager Integration', () => {
    let manager;
    let layerManager;
    let mockMarketData;

    beforeEach(() => {
        layerManager = new MockLayerManager();
        manager = new SpreadStateManager(layerManager);
        mockMarketData = {
            marketCap: 1000000,
            previousMarketCap: 900000,
            volatility: 0.5,
            maxMarketCap: 2000000,
            infectionCenters: new Map([
                ['center1', { x: 0, y: 0 }],
                ['center2', { x: 1, y: 1 }]
            ]),
            routes: new Map([
                ['route1', { start: [0, 0], end: [1, 1] }]
            ])
        };
        jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Market Data Processing', () => {
        test('processes initial market update correctly', async () => {
            const result = await manager.processMarketUpdate(mockMarketData);
            
            // Should create initial patterns
            expect(layerManager.size).toBe(2); // Two initial patterns
            expect(result.newPatternIds.length).toBe(2);
            
            // Verify update queue processed updates
            expect(result.spreadUpdates).toBeDefined();
            expect(result.routeUpdates).toBe(1);
        });

        test('creates new patterns on significant market changes', async () => {
            // Initial update
            await manager.processMarketUpdate(mockMarketData);
            const initialLayerCount = layerManager.size;
            const initialPatternCount = layerManager.getLayers().length;

            // Significant market change
            const updatedMarketData = {
                ...mockMarketData,
                marketCap: 1500000,  // 50% increase
                volatility: 0.8      // Significant volatility increase
            };
            const result = await manager.processMarketUpdate(updatedMarketData);

            // Should have created additional patterns
            expect(layerManager.size).toBe(initialLayerCount + 2); // Two additional patterns
            expect(result.newPatternIds.length).toBe(2);
            expect(result.spreadUpdates).toBeDefined();

            // Verify new patterns are different from initial ones
            const allLayers = layerManager.getLayers();
            const initialPatterns = allLayers.slice(0, initialPatternCount);
            const newPatterns = allLayers.slice(initialPatternCount);

            expect(newPatterns.length).toBe(2);

            // Check that new patterns have different positions
            const initialPositions = initialPatterns.map(p => p.data.source.coordinates);
            const newPositions = newPatterns.map(p => p.data.source.coordinates);

            // Verify no position overlap
            newPositions.forEach(newPos => {
                initialPositions.forEach(initPos => {
                    const distance = Math.hypot(newPos[0] - initPos[0], newPos[1] - initPos[1]);
                    expect(distance).toBeGreaterThan(0.1);
                });
            });
        });

        test('handles route updates', async () => {
            const result = await manager.processMarketUpdate(mockMarketData);
            expect(result.routeUpdates).toBe(1);
        });
    });

    describe('Pattern Type Selection', () => {
        test('selects exponential pattern for high volatility', () => {
            const highVolatilityData = {
                ...mockMarketData,
                volatility: 0.8
            };
            expect(manager.determinePatternType(highVolatilityData)).toBe('exponential');
        });

        test('selects clustered pattern for medium volatility', () => {
            const mediumVolatilityData = {
                ...mockMarketData,
                volatility: 0.5
            };
            expect(manager.determinePatternType(mediumVolatilityData)).toBe('clustered');
        });

        test('selects linear pattern for low volatility', () => {
            const lowVolatilityData = {
                ...mockMarketData,
                volatility: 0.2
            };
            expect(manager.determinePatternType(lowVolatilityData)).toBe('linear');
        });
    });

    describe('Pattern Creation Conditions', () => {
        test('creates initial patterns on first update', async () => {
            const result = await manager.processMarketUpdate(mockMarketData);
            expect(result.newPatternIds.length).toBe(2);
            expect(layerManager.size).toBe(2);
        });

        test('creates pattern on significant volatility change', async () => {
            // Initial update
            await manager.processMarketUpdate(mockMarketData);

            // Significant volatility change
            const updatedData = {
                ...mockMarketData,
                volatility: mockMarketData.volatility + 0.3
            };
            expect(manager.shouldCreateNewPattern(updatedData, mockMarketData)).toBe(true);
        });

        test('creates pattern on significant market cap change', async () => {
            // Initial update
            await manager.processMarketUpdate(mockMarketData);

            // Significant market cap change
            const updatedData = {
                ...mockMarketData,
                marketCap: mockMarketData.marketCap * 1.2
            };
            expect(manager.shouldCreateNewPattern(updatedData, mockMarketData)).toBe(true);
        });

        test('distributes initial patterns evenly', async () => {
            const result = await manager.processMarketUpdate(mockMarketData);
            const positions = result.newPatternIds.map(id => 
                layerManager.layers.get(id).data.source.coordinates
            );

            // Check that positions are different
            expect(positions[0]).not.toEqual(positions[1]);

            // Check that positions are roughly the same distance from center
            const distances = positions.map(pos => 
                Math.hypot(pos[0], pos[1])
            );
            expect(Math.abs(distances[0] - distances[1])).toBeLessThan(0.1);
        });

        test('distributes additional patterns evenly', async () => {
            // Initial update
            await manager.processMarketUpdate(mockMarketData);
            const initialPatternCount = layerManager.getLayers().length;

            // Significant market change
            const updatedMarketData = {
                ...mockMarketData,
                marketCap: 1500000,
                volatility: 0.8
            };
            const result = await manager.processMarketUpdate(updatedMarketData);

            // Get positions of new patterns
            const allLayers = layerManager.getLayers();
            const newPatterns = allLayers.slice(initialPatternCount);

            expect(newPatterns.length).toBe(2);

            const newPositions = newPatterns.map(p => p.data.source.coordinates);

            // Check that positions are different
            expect(newPositions[0]).not.toEqual(newPositions[1]);

            // Check that positions are roughly the same distance from the base position
            const basePosition = manager.calculateNewPatternPosition(updatedMarketData);
            const distances = newPositions.map(pos => 
                Math.hypot(pos[0] - basePosition[0], pos[1] - basePosition[1])
            );
            expect(Math.abs(distances[0] - distances[1])).toBeLessThan(0.1);
        });
    });

    describe('Update and Cleanup', () => {
        test('updates visualization with correct delta time', async () => {
            await manager.processMarketUpdate(mockMarketData);
            
            // Simulate time passing
            jest.spyOn(performance, 'now')
                .mockReturnValueOnce(Date.now() + 1000)
                .mockReturnValueOnce(Date.now() + 1000);
            
            const updates = manager.update(1.0);
            expect(updates).toBeDefined();
            expect(Array.isArray(updates)).toBe(true);
        });

        test('properly cleans up resources', async () => {
            await manager.processMarketUpdate(mockMarketData);
            manager.cleanup();
            layerManager.clear();

            expect(manager.lastMarketData).toBeNull();
            expect(layerManager.size).toBe(0);
            expect(manager.initialPatternsCreated).toBe(0);
        });
    });

    describe('Priority Handling', () => {
        test('assigns high priority for high volatility', () => {
            const highVolatilityData = {
                ...mockMarketData,
                volatility: 0.8
            };
            expect(manager.calculatePriority(highVolatilityData)).toBe('high');
        });

        test('assigns normal priority for normal volatility', () => {
            const normalVolatilityData = {
                ...mockMarketData,
                volatility: 0.5
            };
            expect(manager.calculatePriority(normalVolatilityData)).toBe('normal');
        });
    });
}); 