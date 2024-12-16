import React, { useEffect, useRef, useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import { Map } from 'react-map-gl';
import { LayerManager } from './map-control/layer-manager';
import { MAPBOX_TOKEN, MAP_STYLE, INITIAL_VIEW_STATE } from '../config';
import MockCryptoMarket from '../utils/mock-market-data';

const SpreadVisualizationTest = () => {
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [layers, setLayers] = useState([]);
    const [error, setError] = useState(null);
    const [marketData, setMarketData] = useState({
        marketCap: 1000000,
        price: 100,
        volatility: 0.5,
        timestamp: Date.now()
    });
    
    const layerManagerRef = useRef(null);
    const lastTimeRef = useRef(performance.now());
    const animationFrameRef = useRef(null);
    const marketRef = useRef(null);
    
    useEffect(() => {
        console.log('Initializing visualization with token:', MAPBOX_TOKEN);
        
        try {
            // Initialize market simulator
            marketRef.current = new MockCryptoMarket();
            marketRef.current.subscribe((data) => {
                setMarketData(data);
            });
            marketRef.current.start();

            // Initialize layer manager
            layerManagerRef.current = new LayerManager();
            
            // Add initial virus spread pattern
            const initialPattern = {
                source: {
                    coordinates: [-98.5795, 39.8283] // Center of US
                },
                spread: []
            };
            
            layerManagerRef.current.addVirusSpread('initial-pattern', initialPattern, {
                intensity: 0.5,
                speed: 0.5
            });
            
            // Start animation loop
            const animate = (timestamp) => {
                const deltaTime = (timestamp - lastTimeRef.current) / 1000;
                lastTimeRef.current = timestamp;
                
                if (layerManagerRef.current) {
                    layerManagerRef.current.update(deltaTime);
                    setLayers(layerManagerRef.current.getLayers());
                }
                
                animationFrameRef.current = requestAnimationFrame(animate);
            };
            
            animate(performance.now());
        } catch (err) {
            console.error('Initialization error:', err);
            setError(err.message);
        }
        
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (layerManagerRef.current) {
                layerManagerRef.current.cleanup();
            }
            if (marketRef.current) {
                marketRef.current.stop();
            }
        };
    }, []);
    
    const formatMarketCap = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const handleMarketEvent = (eventType) => {
        if (marketRef.current) {
            marketRef.current.triggerEvent(eventType);
        }
    };

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
                </div>
            </div>
        );
    }
    
    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <DeckGL
                viewState={viewState}
                controller={true}
                layers={layers}
                onViewStateChange={({ viewState }) => setViewState(viewState)}
            >
                <Map
                    mapStyle={MAP_STYLE}
                    mapboxAccessToken={MAPBOX_TOKEN}
                />
            </DeckGL>
            
            {/* Market Controls */}
            <div style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(25, 25, 25, 0.9)',
                padding: 20,
                borderRadius: 8,
                color: 'white',
                width: 300,
                zIndex: 1000,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '16px' }}>Market Controls</h3>
                
                <div style={{ marginBottom: 20 }}>
                    <div style={{ marginBottom: 10, fontSize: '14px' }}>
                        Market Cap: <span style={{ color: '#4CAF50' }}>{formatMarketCap(marketData.marketCap)}</span>
                    </div>
                    <div style={{ marginBottom: 10, fontSize: '14px' }}>
                        Volatility: <span style={{ color: '#FF9800' }}>{(marketData.volatility * 100).toFixed(1)}%</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <button
                        onClick={() => handleMarketEvent('boom')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            background: '#4CAF50',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Trigger Boom
                    </button>
                    <button
                        onClick={() => handleMarketEvent('crash')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            background: '#f44336',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Trigger Crash
                    </button>
                </div>

                <button
                    onClick={() => handleMarketEvent('recovery')}
                    style={{
                        width: '100%',
                        padding: '8px',
                        background: '#2196F3',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    Trigger Recovery
                </button>
            </div>
            
            {/* Debug Info */}
            <div style={{
                position: 'absolute',
                bottom: 20,
                left: 20,
                background: 'rgba(25, 25, 25, 0.9)',
                padding: 15,
                borderRadius: 4,
                color: '#ccc',
                fontFamily: 'monospace',
                zIndex: 1000,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div>Active Layers: {layers.length}</div>
                <div>Layer IDs: {layers.map(l => l.id).join(', ')}</div>
                <div>Market Cap: {formatMarketCap(marketData.marketCap)}</div>
                <div>Volatility: {(marketData.volatility * 100).toFixed(1)}%</div>
                <div>Last Update: {new Date(marketData.timestamp).toLocaleTimeString()}</div>
            </div>
        </div>
    );
};

export default SpreadVisualizationTest; 