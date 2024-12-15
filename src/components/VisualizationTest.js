import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import LayerManager from './LayerManager';
import { MAPBOX_TOKEN, MAP_STYLE, INITIAL_VIEW_STATE } from '../config';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set token globally for mapboxgl
mapboxgl.accessToken = MAPBOX_TOKEN;

const VisualizationTest = () => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const layerManager = useRef(null);
    const animationFrame = useRef(null);
    const marketState = useRef({
        marketCap: 500000,
        trend: 1,
        lastUpdate: performance.now()
    });
    const [error, setError] = useState(null);
    const [mapInitialized, setMapInitialized] = useState(false);

    // Cleanup function
    const cleanup = () => {
        if (animationFrame.current) {
            window.cancelAnimationFrame(animationFrame.current);
            animationFrame.current = null;
        }
        if (layerManager.current) {
            layerManager.current.stopAnimation();
        }
        if (map.current) {
            map.current.remove();
            map.current = null;
        }
    };

    // Market data simulation function
    const updateMarketData = (timestamp) => {
        if (!layerManager.current) return;

        const deltaTime = timestamp - marketState.current.lastUpdate;
        marketState.current.lastUpdate = timestamp;

        // Simulate market fluctuations
        const volatility = Math.random() * 0.2;
        marketState.current.marketCap += 
            marketState.current.marketCap * 
            (Math.random() * 0.1 - 0.05) * 
            marketState.current.trend * 
            (deltaTime / 1000);

        // Occasionally reverse trend
        if (Math.random() < 0.01) { // Reduced frequency of trend changes
            marketState.current.trend *= -1;
            console.log('Market trend reversed:', marketState.current.trend > 0 ? 'Upward' : 'Downward');
        }

        // Keep market cap in reasonable bounds
        marketState.current.marketCap = Math.max(
            100000, 
            Math.min(1000000, marketState.current.marketCap)
        );

        try {
            // Update visualization with new market data
            layerManager.current.updateMarketData({
                marketCap: marketState.current.marketCap,
                volatility,
                timestamp
            });

            // Log market state occasionally
            if (Math.random() < 0.1) {
                console.log('Market State:', {
                    marketCap: Math.round(marketState.current.marketCap),
                    trend: marketState.current.trend > 0 ? 'Upward' : 'Downward',
                    volatility: Math.round(volatility * 100) / 100
                });
            }
        } catch (err) {
            console.error('Error updating market data:', err);
            cleanup();
            setError(`Market data update error: ${err.message}`);
            return;
        }

        // Continue animation loop
        animationFrame.current = window.requestAnimationFrame(updateMarketData);
    };

    useEffect(() => {
        if (map.current) return;

        try {
            console.log('Starting map initialization...');

            if (!mapContainer.current) {
                throw new Error('Map container element not found');
            }

            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: MAP_STYLE,
                center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
                zoom: INITIAL_VIEW_STATE.zoom
            });

            map.current.on('load', () => {
                console.log('Map loaded successfully');
                setMapInitialized(true);
                
                try {
                    layerManager.current = new LayerManager(map.current);
                    
                    // Start demo with initial centers
                    const centers = [
                        { lng: -74.5, lat: 40 },
                        { lng: -74.3, lat: 40.1 },
                        { lng: -74.6, lat: 39.9 }
                    ];
                    
                    layerManager.current.startAnimation(centers);
                    
                    // Start market data simulation using requestAnimationFrame
                    animationFrame.current = window.requestAnimationFrame(updateMarketData);
                } catch (err) {
                    console.error('Error in layer initialization:', err);
                    setError(`Layer initialization error: ${err.message}`);
                }
            });

            map.current.on('error', (e) => {
                console.error('Mapbox error:', e);
                const errorMessage = e.error ? e.error.message : 'Unknown error';
                setError(`Map error: ${errorMessage}`);
            });

            map.current.on('style.load', () => {
                console.log('Map style loaded successfully');
            });

        } catch (error) {
            console.error('Error initializing map:', error);
            setError(`Initialization error: ${error.message}`);
        }

        // Cleanup function
        return cleanup;
    }, []);

    if (error) {
        return (
            <div style={{
                width: '100%',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#1a1a1a',
                color: '#ff4444',
                padding: '20px'
            }}>
                <div>
                    <h2>Error</h2>
                    <pre style={{
                        background: '#2a2a2a',
                        padding: '15px',
                        borderRadius: '5px'
                    }}>
                        {error}
                    </pre>
                    <div style={{ marginTop: '20px', color: '#888' }}>
                        <p>Debug Info:</p>
                        <p>Map Initialized: {mapInitialized ? 'Yes' : 'No'}</p>
                        <p>Token Length: {MAPBOX_TOKEN.length}</p>
                        <p>Token Prefix: {MAPBOX_TOKEN.substring(0, 10)}</p>
                    </div>
                    <button 
                        onClick={() => window.location.reload()} 
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Reload Application
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={mapContainer} 
            style={{ 
                width: '100%', 
                height: '100vh',
                position: 'relative'
            }}
        />
    );
};

export default VisualizationTest; 