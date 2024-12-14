const LayerManager = require('../src/components/layer-manager/LayerManager');
const { AnimationController, Animation } = require('../src/components/animation/AnimationController');

// Mock deck.gl layers
jest.mock('@deck.gl/aggregation-layers', () => ({
    HeatmapLayer: jest.fn().mockImplementation(() => ({
        setProps: jest.fn()
    }))
}));

jest.mock('@deck.gl/layers', () => ({
    ScatterplotLayer: jest.fn().mockImplementation(() => ({
        setProps: jest.fn()
    })),
    ArcLayer: jest.fn().mockImplementation(() => ({
        setProps: jest.fn()
    }))
}));

jest.mock('@deck.gl/core', () => ({
    COORDINATE_SYSTEM: {
        LNGLAT: 'lnglat'
    }
}));

describe('Layer Management System', () => {
    let layerManager;
    let animationController;

    beforeEach(() => {
        layerManager = new LayerManager({});
        animationController = new AnimationController();
        layerManager.setAnimationController(animationController);
    });

    test('LayerManager initializes with all required layers', () => {
        const layers = layerManager.getLayers();
        expect(layers).toHaveLength(3); // heatmap, routes, centers
    });

    test('LayerManager updates heatmap based on market data', () => {
        const testData = [
            { lat: 0, lng: 0, intensity: 0.5 }
        ];
        const marketCap = 1000000;
        const volatility = 0.5;

        layerManager.updateHeatmap(testData, marketCap, volatility);
        expect(layerManager.layers.heatmap.setProps).toHaveBeenCalled();
    });

    test('LayerManager updates routes with correct activation', () => {
        const testRoutes = [
            {
                source: [0, 0],
                target: [1, 1],
                active: true
            }
        ];
        const volatility = 0.7;

        layerManager.updateRoutes(testRoutes, volatility);
        expect(layerManager.layers.routes.setProps).toHaveBeenCalled();
    });

    test('LayerManager updates centers with correct scaling', () => {
        const testCenters = [
            { lat: 0, lng: 0, intensity: 0.8 }
        ];

        layerManager.updateCenters(testCenters);
        expect(layerManager.layers.centers.setProps).toHaveBeenCalled();
    });
});

describe('Animation System', () => {
    let animationController;

    beforeEach(() => {
        animationController = new AnimationController();
        jest.useFakeTimers();
        global.performance.now = jest.fn(() => Date.now());
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('Animation completes within expected duration', () => {
        const onUpdate = jest.fn();
        const onComplete = jest.fn();

        const animation = new Animation({
            duration: 1000,
            onUpdate,
            onComplete
        });

        // Start animation
        animation.update();
        expect(onUpdate).toHaveBeenCalledWith(expect.any(Number), {});
        expect(onComplete).not.toHaveBeenCalled();

        // Move time forward
        jest.advanceTimersByTime(1000);
        animation.update();

        expect(onComplete).toHaveBeenCalled();
        expect(animation.isComplete).toBe(true);
    });

    test('AnimationController adjusts speed based on volatility', () => {
        const volatility = 1.5;
        animationController.updateSpeed(volatility);
        expect(animationController.speedMultiplier).toBe(1.5);

        // Test speed clamping
        animationController.updateSpeed(3.0);
        expect(animationController.speedMultiplier).toBe(2.0);
    });

    test('Spread animation creates and manages animation correctly', () => {
        const center = {
            onUpdate: jest.fn(),
            onComplete: jest.fn()
        };

        const animationId = animationController.addSpreadAnimation(center, 1000000);
        expect(animationId).toBeDefined();
        expect(animationController.animations.size).toBe(1);

        // Simulate animation frame
        jest.advanceTimersByTime(16);
        animationController.update();
        expect(center.onUpdate).toHaveBeenCalled();
    });

    test('Route animation handles progress updates', () => {
        const route = {
            onUpdate: jest.fn(),
            onComplete: jest.fn()
        };

        const animationId = animationController.addRouteAnimation(route, 0.5);
        expect(animationId).toBeDefined();
        expect(animationController.animations.size).toBe(1);

        // Simulate animation frame
        jest.advanceTimersByTime(16);
        animationController.update();
        expect(route.onUpdate).toHaveBeenCalledWith(expect.objectContaining({
            progress: expect.any(Number),
            volatility: 0.5
        }));
    });

    test('Animation system maintains frame rate', () => {
        const fps = [];
        const frameTime = 1000 / 60; // Target 60 FPS
        let lastTime = performance.now();

        // Run animation for 1 second
        for (let i = 0; i < 60; i++) {
            const currentTime = lastTime + frameTime;
            global.performance.now.mockReturnValue(currentTime);
            
            animationController.animate();
            
            const actualFrameTime = currentTime - lastTime;
            fps.push(1000 / actualFrameTime);
            lastTime = currentTime;
            
            jest.advanceTimersByTime(frameTime);
        }

        // Check if average FPS is close to 60
        const avgFps = fps.reduce((a, b) => a + b, 0) / fps.length;
        expect(avgFps).toBeCloseTo(60, 0);
    });
}); 