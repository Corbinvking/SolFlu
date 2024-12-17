import React, { useEffect, useRef, useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import { Map } from 'react-map-gl';
import { LayerManager } from './map-control/layer-manager';
import SpreadVisualizationBridge from '../integration/spread-visualization-bridge';
import { MAPBOX_TOKEN, MAP_STYLE, INITIAL_VIEW_STATE } from '../config';
import MockCryptoMarket from '../integration/mock-crypto-market';

const SpreadPatternTest = () => {
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [layers, setLayers] = useState([]);
    const [activePatterns, setActivePatterns] = useState([]);
    const [selectedPattern, setSelectedPattern] = useState(null);
    const [patternParams, setPatternParams] = useState({
        intensity: 1.0,
        speed: 1.0,
        branchingFactor: 0.3
    });
    
    const [marketData, setMarketData] = useState({
        marketCap: 385084,
        volatility: 0.491,
        previousMarketCap: 380000
    });
    
    const layerManagerRef = useRef(null);
    const bridgeRef = useRef(null);
    const animationFrameRef = useRef(null);
    const lastTimeRef = useRef(performance.now());
    const mockMarketRef = useRef(null);
    
    useEffect(() => {
        try {
            console.log('Initializing SpreadPatternTest');
            // Initialize layer manager and visualization bridge
            layerManagerRef.current = new LayerManager();
            bridgeRef.current = new SpreadVisualizationBridge(layerManagerRef.current);
            
            // Initialize mock market
            const mockMarket = new MockCryptoMarket(100, marketData.marketCap);
            mockMarket.subscribe((data) => {
                setMarketData({
                    marketCap: data.marketCap,
                    volatility: data.volatility,
                    previousMarketCap: data.previousMarketCap || marketData.marketCap
                });

                // Update bridge with new market conditions
                if (bridgeRef.current) {
                    bridgeRef.current.updateMarketConditions(data);
                }
            });
            mockMarket.start();

            // Store reference for cleanup
            mockMarketRef.current = mockMarket;
            
            // Start animation loop
            const animate = (timestamp) => {
                const deltaTime = (timestamp - lastTimeRef.current) / 1000;
                lastTimeRef.current = timestamp;
                
                if (bridgeRef.current) {
                    const updatedPatterns = bridgeRef.current.update(deltaTime);
                    if (updatedPatterns.length > 0) {
                        console.log('Updated patterns:', updatedPatterns);
                    }
                    setActivePatterns(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(updatedPatterns)) {
                            return updatedPatterns;
                        }
                        return prev;
                    });
                }
                
                if (layerManagerRef.current) {
                    const currentLayers = layerManagerRef.current.getLayers();
                    setLayers(prev => {
                        if (prev.length !== currentLayers.length || 
                            JSON.stringify(prev.map(l => l.props)) !== JSON.stringify(currentLayers.map(l => l.props))) {
                            console.log('Layers updated:', currentLayers.length);
                            return [...currentLayers];
                        }
                        return prev;
                    });
                }
                
                animationFrameRef.current = requestAnimationFrame(animate);
            };
            
            animate(performance.now());
        } catch (err) {
            console.error('Initialization error:', err);
        }
        
        return () => {
            console.log('Cleaning up SpreadPatternTest');
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (bridgeRef.current) {
                bridgeRef.current.cleanup();
            }
            if (mockMarketRef.current) {
                mockMarketRef.current.stop();
            }
        };
    }, []);

    const createPattern = async (type) => {
        if (!bridgeRef.current) {
            console.error('Bridge not initialized');
            return;
        }
        
        console.log('Creating pattern:', type, 'with params:', patternParams);
        
        try {
            // Create pattern at current map center
            const center = [viewState.longitude, viewState.latitude];
            const patternId = await bridgeRef.current.createSpreadPattern(type, center, {
                intensity: patternParams.intensity,
                speed: patternParams.speed,
                branchingFactor: patternParams.branchingFactor
            });
            
            console.log('Pattern created with ID:', patternId);
            
            if (patternId) {
                // Deselect previous pattern
                if (selectedPattern) {
                    console.log('Removing previous pattern:', selectedPattern);
                    bridgeRef.current.removePattern(selectedPattern);
                }
                
                setSelectedPattern(patternId);
                setActivePatterns(prev => [...prev, patternId]);
            } else {
                console.error('Failed to create pattern');
            }
        } catch (error) {
            console.error('Error creating pattern:', error);
        }
    };

    const updatePatternParams = (param, value) => {
        const newValue = parseFloat(value);
        console.log('Updating pattern param:', param, 'to:', newValue);
        
        setPatternParams(prev => {
            const updated = {
                ...prev,
                [param]: newValue
            };
            
            // Update existing pattern with new parameters
            if (bridgeRef.current && selectedPattern) {
                console.log('Updating existing pattern:', selectedPattern, 'with new params:', updated);
                bridgeRef.current.updatePatternParameters(selectedPattern, updated);
            }
            
            return updated;
        });
    };

    // Add pattern removal handler
    const removePattern = (patternId) => {
        if (!bridgeRef.current) return;
        
        console.log('Removing pattern:', patternId);
        bridgeRef.current.removePattern(patternId);
        
        if (selectedPattern === patternId) {
            setSelectedPattern(null);
        }
        
        setActivePatterns(prev => prev.filter(id => id !== patternId));
    };

    // Add market control handlers
    const handleMarketEvent = (eventType) => {
        if (!mockMarketRef.current) return;
        console.log('Triggering market event:', eventType);
        mockMarketRef.current.triggerEvent(eventType);
    };

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
                
                <div style={{ marginBottom: 15 }}>
                    <div>Market Cap: ${marketData.marketCap.toLocaleString()}</div>
                    <div>Volatility: {(marketData.volatility * 100).toFixed(1)}%</div>
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
            
            {/* Pattern Controls */}
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
                <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '16px' }}>Pattern Controls</h3>
                
                {/* Pattern Parameters */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', marginBottom: 5 }}>Intensity</label>
                        <input
                            type="range"
                            min="0.1"
                            max="2.0"
                            step="0.1"
                            value={patternParams.intensity}
                            onChange={(e) => updatePatternParams('intensity', e.target.value)}
                            style={{ width: '100%' }}
                        />
                        <span style={{ fontSize: '12px' }}>{patternParams.intensity.toFixed(1)}</span>
                    </div>
                    
                    <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', marginBottom: 5 }}>Speed</label>
                        <input
                            type="range"
                            min="0.1"
                            max="2.0"
                            step="0.1"
                            value={patternParams.speed}
                            onChange={(e) => updatePatternParams('speed', e.target.value)}
                            style={{ width: '100%' }}
                        />
                        <span style={{ fontSize: '12px' }}>{patternParams.speed.toFixed(1)}</span>
                    </div>
                    
                    <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', marginBottom: 5 }}>Branching Factor</label>
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={patternParams.branchingFactor}
                            onChange={(e) => updatePatternParams('branchingFactor', e.target.value)}
                            style={{ width: '100%' }}
                        />
                        <span style={{ fontSize: '12px' }}>{patternParams.branchingFactor.toFixed(1)}</span>
                    </div>
                </div>

                {/* Pattern Creation Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <button
                        onClick={() => createPattern('exponential')}
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
                        Exponential
                    </button>
                    <button
                        onClick={() => createPattern('linear')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            background: '#2196F3',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Linear
                    </button>
                </div>
                
                <button
                    onClick={() => createPattern('clustered')}
                    style={{
                        width: '100%',
                        padding: '8px',
                        background: '#FF9800',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        marginBottom: '15px'
                    }}
                >
                    Clustered
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
                <div>Active Patterns: {activePatterns.length}</div>
                <div>Selected Pattern: {selectedPattern || 'None'}</div>
                <div>Layer Count: {layers.length}</div>
            </div>
        </div>
    );
};

export default SpreadPatternTest; 