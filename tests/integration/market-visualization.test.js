import React from 'react';
import { render, act } from '@testing-library/react';
import VisualizationTest from '../../src/components/VisualizationTest';
import LayerManager from '../../src/components/layer-manager/LayerManager';
import { AnimationController } from '../../src/components/animation/AnimationController';

// Mock mapbox-gl to avoid WebGL context issues in tests
jest.mock('mapbox-gl', () => ({
    Map: jest.fn(),
    accessToken: null,
}));

// Mock deck.gl to avoid WebGL context issues
jest.mock('@deck.gl/react', () => ({
    DeckGL: jest.fn(() => null)
}));

describe('Market Data Visualization Integration', () => {
    let mockMarketData;
    
    beforeEach(() => {
        // Setup mock market data
        mockMarketData = {
            marketCap: 1000000,
            volatility: 0.5,
            price: 100,
            volume: 50000
        };

        // Clear all mocks
        jest.clearAllMocks();
    });

    test('LayerManager updates layers based on market cap changes', () => {
        const layerManager = new LayerManager();
        const testCenters = [
            { id: 1, lat: 40.7128, lng: -74.0060, intensity: 0.8 }
        ];

        // Initial update
        layerManager.updateCenters(testCenters);
        layerManager.updateHeatmap(testCenters, mockMarketData.marketCap, mockMarketData.volatility);
        
        const initialLayers = layerManager.getLayers();
        const initialHeatmap = initialLayers.find(layer => layer.id === 'heatmap-layer');
        const initialRadius = initialHeatmap.props.radiusPixels;

        // Simulate market cap increase
        mockMarketData.marketCap *= 2;
        layerManager.updateHeatmap(testCenters, mockMarketData.marketCap, mockMarketData.volatility);
        
        const updatedLayers = layerManager.getLayers();
        const updatedHeatmap = updatedLayers.find(layer => layer.id === 'heatmap-layer');
        
        // Verify radius increased with market cap
        expect(updatedHeatmap.props.radiusPixels).toBeGreaterThan(initialRadius);
    });

    test('AnimationController speed changes with volatility', () => {
        const controller = new AnimationController();
        const initialSpeed = controller.speedMultiplier;

        // Simulate high volatility
        mockMarketData.volatility = 0.9;
        controller.updateSpeed(mockMarketData.volatility);

        // Verify animation speed increased
        expect(controller.speedMultiplier).toBeGreaterThan(initialSpeed);
    });

    test('Route intensity changes with market volatility', () => {
        const layerManager = new LayerManager();
        const testRoutes = [{
            id: 1,
            source: [-74.0060, 40.7128],
            target: [-118.2437, 34.0522],
            active: true,
            permanent: true
        }];

        // Initial update
        layerManager.updateRoutes(testRoutes, mockMarketData.volatility);
        const initialLayers = layerManager.getLayers();
        const initialRoute = initialLayers.find(layer => layer.id === 'routes-layer');
        const initialWidth = initialRoute.props.getWidth({activation: mockMarketData.volatility});

        // Simulate volatility increase
        mockMarketData.volatility = 0.9;
        layerManager.updateRoutes(testRoutes, mockMarketData.volatility);
        
        const updatedLayers = layerManager.getLayers();
        const updatedRoute = updatedLayers.find(layer => layer.id === 'routes-layer');
        const updatedWidth = updatedRoute.props.getWidth({activation: mockMarketData.volatility});

        // Verify route width increased with volatility
        expect(updatedWidth).toBeGreaterThan(initialWidth);
    });

    test('Market info display updates with market changes', () => {
        const { getByText, rerender } = render(
            <VisualizationTest />
        );

        // Initial render should show default market cap
        expect(getByText(/\$1\.00M/)).toBeInTheDocument();

        // Simulate market update
        act(() => {
            mockMarketData.marketCap = 2000000;
            mockMarketData.volatility = 0.8;
        });

        rerender(<VisualizationTest />);

        // Verify display updates
        expect(getByText(/\$2\.00M/)).toBeInTheDocument();
        expect(getByText(/80\.0%/)).toBeInTheDocument();
    });

    test('Spread mechanics respond to market conditions', () => {
        const layerManager = new LayerManager();
        const testCenters = [
            { id: 1, lat: 40.7128, lng: -74.0060, intensity: 0.8 },
            { id: 2, lat: 34.0522, lng: -118.2437, intensity: 0.6 }
        ];

        // Initial state
        layerManager.updateCenters(testCenters);
        const initialLayers = layerManager.getLayers();
        const initialCenters = initialLayers.find(layer => layer.id === 'centers-layer');
        const initialIntensity = initialCenters.props.data[0].intensity;

        // Simulate market crash (high volatility, low market cap)
        mockMarketData.marketCap *= 0.5;
        mockMarketData.volatility = 0.9;
        
        const updatedCenters = testCenters.map(center => ({
            ...center,
            intensity: center.intensity * mockMarketData.volatility
        }));
        
        layerManager.updateCenters(updatedCenters);
        const updatedLayers = layerManager.getLayers();
        const updatedCenterLayer = updatedLayers.find(layer => layer.id === 'centers-layer');

        // Verify spread intensity increased with volatility
        expect(updatedCenterLayer.props.data[0].intensity)
            .toBeGreaterThan(initialIntensity);
    });
}); 