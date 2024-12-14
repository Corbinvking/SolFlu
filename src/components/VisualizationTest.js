import React, { useEffect, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl';
import LayerManager from './layer-manager/LayerManager';
import { AnimationController } from './animation/AnimationController';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Initial view state
const INITIAL_VIEW_STATE = {
    longitude: -100,
    latitude: 40,
    zoom: 3,
    pitch: 45,
    bearing: 0
};

// Try different ways to get the token
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || window.MAPBOX_TOKEN;
console.log('Direct token access:', process.env.MAPBOX_TOKEN);
console.log('Window token access:', window.MAPBOX_TOKEN);
console.log('Combined token access:', MAPBOX_TOKEN);

// Set the token for mapbox-gl
mapboxgl.accessToken = MAPBOX_TOKEN;

if (!mapboxgl.accessToken) {
    console.error('Mapbox token is missing! Please check your .env file.');
    console.error('process.env:', process.env);
}

function VisualizationTest() {
    const [layerManager, setLayerManager] = useState(null);
    const [animationController, setAnimationController] = useState(null);
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [error, setError] = useState(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapInitialized, setMapInitialized] = useState(false);

    useEffect(() => {
        // Validate Mapbox token
        console.log('Current Mapbox Token:', mapboxgl.accessToken); // Debug token
        console.log('Token length:', mapboxgl.accessToken ? mapboxgl.accessToken.length : 0);
        
        if (!mapboxgl.accessToken) {
            const err = 'Mapbox token is missing. Please check your .env file.';
            console.error(err);
            setError(err);
            return;
        }

        try {
            console.log('Initializing visualization components...'); // Debug initialization
            const lManager = new LayerManager({});
            const aController = new AnimationController();
            lManager.setAnimationController(aController);
            
            console.log('Layer Manager initialized:', lManager); // Debug layer manager
            console.log('Animation Controller initialized:', aController); // Debug animation controller
            
            setLayerManager(lManager);
            setAnimationController(aController);

            // Start demo animations
            const cleanup = startDemoAnimations(lManager, aController);

            return () => {
                console.log('Cleaning up visualization components...'); // Debug cleanup
                cleanup();
                aController.stop();
            };
        } catch (err) {
            const errorMsg = `Error initializing visualization: ${err.message}`;
            console.error(errorMsg, err);
            setError(errorMsg);
        }
    }, []);

    const startDemoAnimations = (lManager, aController) => {
        try {
            // Demo data
            const testCenters = [
                { id: 1, lat: 40.7128, lng: -74.0060, intensity: 0.8 }, // New York
                { id: 2, lat: 34.0522, lng: -118.2437, intensity: 0.6 }, // Los Angeles
                { id: 3, lat: 41.8781, lng: -87.6298, intensity: 0.7 }, // Chicago
            ];

            const testRoutes = [
                {
                    id: 1,
                    source: [-74.0060, 40.7128],
                    target: [-118.2437, 34.0522],
                    active: true,
                    permanent: true  // Mark as permanent route
                },
                {
                    id: 2,
                    source: [-87.6298, 41.8781],
                    target: [-74.0060, 40.7128],
                    active: true,
                    permanent: true  // Mark as permanent route
                }
            ];

            console.log('Initializing layers with test data'); // Debug
            // Update layers with initial data
            lManager.updateCenters(testCenters);
            lManager.updateRoutes(testRoutes, 0.7);

            // Simulate market updates
            let marketCap = 1000000;
            let volatility = 0.5;

            const updateInterval = setInterval(() => {
                try {
                    // Simulate market changes
                    marketCap *= (1 + (Math.random() - 0.5) * 0.1);
                    volatility = Math.max(0.1, Math.min(1.0, volatility + (Math.random() - 0.5) * 0.1));

                    // Update animations based on new market data
                    aController.updateSpeed(volatility);

                    // Update visualization
                    const heatmapData = testCenters.map(center => ({
                        ...center,
                        intensity: center.intensity * volatility
                    }));

                    // Update routes with permanent routes always visible
                    const updatedRoutes = testRoutes.map(route => ({
                        ...route,
                        active: route.permanent ? true : route.active // Keep permanent routes always active
                    }));

                    lManager.updateHeatmap(heatmapData, marketCap, volatility);
                    lManager.updateRoutes(updatedRoutes, volatility);
                    
                    // Add new spread animation randomly
                    if (Math.random() < 0.1) {
                        const randomCenter = testCenters[Math.floor(Math.random() * testCenters.length)];
                        aController.addSpreadAnimation({
                            ...randomCenter,
                            onUpdate: ({ radius, intensity }) => {
                                lManager.updateCenters([{
                                    ...randomCenter,
                                    intensity: intensity
                                }]);
                            }
                        }, marketCap);
                    }

                    // Add new temporary route animation randomly
                    if (Math.random() < 0.05) {
                        const availableCenters = testCenters.filter(c => 
                            !testRoutes.some(r => 
                                (r.source[0] === c.lng && r.source[1] === c.lat) ||
                                (r.target[0] === c.lng && r.target[1] === c.lat)
                            )
                        );

                        if (availableCenters.length >= 2) {
                            const source = availableCenters[0];
                            const target = availableCenters[1];
                            const tempRoute = {
                                id: `temp-${Date.now()}`,
                                source: [source.lng, source.lat],
                                target: [target.lng, target.lat],
                                active: true,
                                permanent: false
                            };

                            // Add temporary route to visualization
                            testRoutes.push(tempRoute);
                            setTimeout(() => {
                                // Remove temporary route after animation
                                const index = testRoutes.findIndex(r => r.id === tempRoute.id);
                                if (index !== -1) {
                                    testRoutes.splice(index, 1);
                                }
                            }, 5000); // Remove after 5 seconds
                        }
                    }
                } catch (err) {
                    console.error('Error in animation update:', err);
                    setError(`Error in animation update: ${err.message}`);
                }
            }, 1000);

            return () => clearInterval(updateInterval);
        } catch (err) {
            console.error('Error in startDemoAnimations:', err);
            setError(`Error in startDemoAnimations: ${err.message}`);
            return () => {};
        }
    };

    if (error) {
        return (
            <div style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#1a1a1a',
                color: '#ff4444',
                padding: '20px',
                fontFamily: 'Arial, sans-serif'
            }}>
                <div>
                    <h2>Error</h2>
                    <pre style={{
                        background: '#2a2a2a',
                        padding: '15px',
                        borderRadius: '5px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                    }}>
                        {error}
                    </pre>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <DeckGL
                initialViewState={INITIAL_VIEW_STATE}
                controller={true}
                layers={layerManager ? layerManager.getLayers() : []}
                onViewStateChange={({ viewState }) => {
                    console.log('View state changed:', viewState); // Debug view state
                    setViewState(viewState);
                }}
                onError={(error) => {
                    console.error('DeckGL error:', error);
                    setError(`DeckGL error: ${error.message}`);
                }}
            >
                <Map
                    reuseMaps
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    mapboxAccessToken={mapboxgl.accessToken}
                    preventStyleDiffing={true}
                    projection="mercator"
                    renderWorldCopies={true}
                    onLoad={() => {
                        console.log('Mapbox map loaded successfully'); // Debug map load
                        setMapLoaded(true);
                        setMapInitialized(true);
                    }}
                    onError={(error) => {
                        const errorMsg = error.error && error.error.message ? 
                            error.error.message : 
                            'Unknown Mapbox error';
                        console.error('Mapbox error details:', error);
                        setError(`Mapbox error: ${errorMsg}`);
                    }}
                    attributionControl={true}
                    preserveDrawingBuffer={true}
                />
            </DeckGL>
            <div style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
                zIndex: 1000
            }}>
                <h3>Visualization Test</h3>
                <p>Map Loaded: {mapLoaded ? 'Yes' : 'No'}</p>
                <p>Map Initialized: {mapInitialized ? 'Yes' : 'No'}</p>
                <p>Token Available: {mapboxgl.accessToken ? 'Yes' : 'No'}</p>
                <p>Token Length: {mapboxgl.accessToken ? mapboxgl.accessToken.length : 0}</p>
                <p>Token Value: {mapboxgl.accessToken ? `${mapboxgl.accessToken.substring(0, 10)}...` : 'Not available'}</p>
                <p>Zoom: {viewState.zoom.toFixed(2)}</p>
                <p>Pitch: {viewState.pitch.toFixed(2)}°</p>
                <p>Bearing: {viewState.bearing.toFixed(2)}°</p>
                <p>Layers: {layerManager ? layerManager.getLayers().length : 0}</p>
            </div>
        </div>
    );
}

export default VisualizationTest; 