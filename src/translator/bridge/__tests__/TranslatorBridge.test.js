import { TranslatorBridge } from '../';

describe('TranslatorBridge', () => {
    let bridge;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(async () => {
        if (bridge) {
            await bridge.cleanup();
            bridge = null;
        }
    });

    describe('initialization', () => {
        it('should establish WebSocket connection', async () => {
            bridge = new TranslatorBridge({ port: 8006 });
            const initPromise = bridge.initialize();
            
            await expect(initPromise).resolves.toBe(true);
            expect(bridge.isConnected).toBe(true);
        }, 10000);

        it('should handle connection failure', async () => {
            bridge = new TranslatorBridge({ port: 8007 }); // Wrong port
            const initPromise = bridge.initialize();
            
            await expect(initPromise).resolves.toBe(false);
            expect(bridge.isConnected).toBe(false);
        }, 10000);
    });

    describe('market data translation', () => {
        beforeEach(async () => {
            bridge = new TranslatorBridge({ port: 8006 });
            await bridge.initialize();
        });

        it('should translate market data to virus parameters', async () => {
            const marketData = {
                price: 100,
                marketCap: 100000,
                volatility: 0.5,
                trend: 0,
                eventType: 'normal',
                metrics: { marketState: 'stable' }
            };

            const translatedData = await bridge.handleMarketUpdate(marketData);
            
            expect(translatedData).toBeDefined();
            expect(translatedData.virusMetrics).toBeDefined();
            expect(translatedData.virusMetrics.spreadFactor).toBeGreaterThan(0);
            expect(translatedData.virusMetrics.mutationRate).toBeGreaterThan(0);
        }, 10000);
    });

    describe('state synchronization', () => {
        beforeEach(async () => {
            bridge = new TranslatorBridge({ port: 8006 });
            await bridge.initialize();
        });

        it('should notify subscribers of state changes', async () => {
            const stateChangeHandler = jest.fn();
            bridge.stateSync.on('stateChanged', stateChangeHandler);

            const marketData = {
                price: 100,
                marketCap: 100000,
                volatility: 0.5,
                trend: 0,
                eventType: 'normal',
                metrics: { marketState: 'stable' }
            };

            await bridge.handleMarketUpdate(marketData);

            expect(stateChangeHandler).toHaveBeenCalled();
            const [stateDiff] = stateChangeHandler.mock.calls[0];
            expect(stateDiff.hasChanges).toBe(true);
        }, 10000);
    });

    describe('message handling', () => {
        beforeEach(async () => {
            bridge = new TranslatorBridge({ port: 8006 });
            await bridge.initialize();
        });

        it('should handle market updates', async () => {
            const messageHandler = jest.fn();
            bridge.eventEmitter.on('marketUpdate', messageHandler);

            const marketData = {
                type: 'marketUpdate',
                data: {
                    marketMetrics: {
                        price: 100,
                        volume: 1000,
                        marketCap: 100000,
                        volatility: 0.5
                    }
                }
            };

            await bridge.sendMessage(marketData);
            await new Promise(resolve => setTimeout(resolve, 1000));

            expect(messageHandler).toHaveBeenCalled();
            const [update] = messageHandler.mock.calls[0];
            expect(update.type).toBe('marketUpdate');
        }, 10000);
    });
}); 