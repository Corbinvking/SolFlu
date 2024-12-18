import React, { useEffect, useRef, useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import { Map } from 'react-map-gl';
import { ScatterplotLayer } from '@deck.gl/layers';
import { MAPBOX_TOKEN, MAP_STYLE, INITIAL_VIEW_STATE } from '../../config';
import MarketSimulator from '../integration/market-simulator';
import TranslatorBridge from '../integration/translator-bridge';
import VirusStateMachine from '../core/virus-state-machine';
import RouteSystem from '../core/route-system';
import { loadIconAtlas } from '../utils/icon-processor';
import { ensureIconsSetup } from '../utils/setup-icons';
import OrderBookDisplay from './OrderBookDisplay';
import DevPanel from '../../components/DevPanel';
import StageTimelinePanel from './StageTimelinePanel';
import MarketGrowthStages from '../integration/market-growth-stages';

const SimpleSpreadMap = () => {
    const [layers, setLayers] = useState([]);
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [marketData, setMarketData] = useState({
        marketCap: 380000,
        volatility: 0.5,
        buyOrders: [],
        sellOrders: [],
        currentPrice: 0.03
    });
    const [error, setError] = useState(null);
    const [growthStages] = useState(() => new MarketGrowthStages());
    
    const routeSystemRef = useRef(null);
    const marketRef = useRef(null);
    const virusRef = useRef(null);
    const translatorRef = useRef(null);
    const animationFrameRef = useRef(null);
    const lastFrameTimeRef = useRef(Date.now());

    // Single initialization effect
    useEffect(() => {
        const initialize = async () => {
            try {
                console.log('Starting initialization...');
                
                // Initialize core systems
                marketRef.current = new MarketSimulator();
                translatorRef.current = new TranslatorBridge();
                virusRef.current = new VirusStateMachine();

                // Initialize virus state at center of view
                const center = [viewState.longitude, viewState.latitude];
                console.log('Setting initial center at:', center);
                
                const initialMarketState = marketRef.current.getMarketState();
                const initialVirusParams = translatorRef.current.translateMarketState(initialMarketState);
                virusRef.current.initialize(center, initialVirusParams);

                // Initialize route system with Font Awesome icons
                console.log('Initializing route system...');
                routeSystemRef.current = new RouteSystem();
                
                // Add test vehicles
                routeSystemRef.current.addTestVehicles();
                console.log('Added test vehicles to route system');

                // Subscribe to market updates
                marketRef.current.subscribe((marketState) => {
                    setMarketData(marketState);
                });

                // Start market simulation
                marketRef.current.start();

                // Start animation loop
                const animate = () => {
                    const now = Date.now();
                    const deltaTime = (now - lastFrameTimeRef.current) / 1000;
                    lastFrameTimeRef.current = now;

                    // Update virus
                    virusRef.current.update(deltaTime);
                    const points = virusRef.current.getPoints();
                    console.log('Virus Update -', {
                        deltaTime,
                        pointCount: points.length,
                        samplePoint: points.length > 0 ? points[0] : null,
                        currentLayers: layers.length
                    });

                    // Update routes
                    if (routeSystemRef.current) {
                        console.log('Updating route system, deltaTime:', deltaTime);
                        routeSystemRef.current.update(deltaTime);
                    }

                    // Update layers
                    setLayers(prevLayers => {
                        const virusLayer = new ScatterplotLayer({
                            id: 'virus-points',
                            data: points,
                            getPosition: d => d.position,
                            getRadius: d => d.radius || 10,
                            getFillColor: d => [255, 0, 0, Math.floor(255 * (d.colorIntensity || 1.0))],
                            pickable: false,
                            opacity: 0.8,
                            stroked: true,
                            strokeWidth: 1,
                            filled: true,
                            radiusUnits: 'pixels',
                            radiusScale: 1,
                            radiusMinPixels: 3,
                            radiusMaxPixels: 15,
                            parameters: {
                                depthTest: false
                            },
                            updateTriggers: {
                                getRadius: [points.length, Date.now()],
                                getFillColor: [points.length, Date.now()]
                            }
                        });

                        // Get updated route layers
                        const routeLayers = routeSystemRef.current ? routeSystemRef.current.getLayers() : [];
                        console.log('Route layers:', routeLayers.length);
                        
                        // Return combined layers with route layers first
                        return [...routeLayers, virusLayer];
                    });

                    animationFrameRef.current = requestAnimationFrame(animate);
                };

                animate();
                console.log('Initialization complete');
            } catch (error) {
                console.error('Initialization error:', error);
                setError(error.message);
            }
        };

        initialize();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (marketRef.current) {
                marketRef.current.stop();
            }
        };
    }, []);

    // Dev control handlers
    const handleVirusBoost = () => {
        if (virusRef.current) {
            virusRef.current.boostSpread(2.0);
            marketRef.current.injectVolatility(1.5);
        }
    };

    const handleVirusSuppress = () => {
        if (virusRef.current) {
            virusRef.current.suppressSpread(0.5);
            marketRef.current.injectVolatility(0.5);
        }
    };

    const handleResetSimulation = () => {
        if (virusRef.current && marketRef.current) {
            const center = [viewState.longitude, viewState.latitude];
            marketRef.current.reset();
            const initialMarketState = marketRef.current.getMarketState();
            const initialVirusParams = translatorRef.current.translateMarketState(initialMarketState);
            virusRef.current.initialize(center, initialVirusParams);
        }
    };

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <DeckGL
                viewState={viewState}
                controller={{
                    dragRotate: false,
                    touchRotate: false,
                    keyboard: true,
                    dragPan: true,
                    touchZoom: true,
                    doubleClickZoom: true,
                    scrollZoom: true
                }}
                layers={layers}
                onViewStateChange={({ viewState }) => setViewState(viewState)}
                getCursor={() => 'default'}
            >
                <Map
                    mapStyle={MAP_STYLE}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    projection="mercator"
                    renderWorldCopies={true}
                />
            </DeckGL>

            {error && (
                <div style={{
                    position: 'absolute',
                    top: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(255, 0, 0, 0.8)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: 4,
                    zIndex: 1000
                }}>
                    {error}
                </div>
            )}

            <OrderBookDisplay marketState={marketData} />
            <DevPanel
                onVirusBoost={handleVirusBoost}
                onVirusSuppress={handleVirusSuppress}
                onResetSimulation={handleResetSimulation}
                marketSimulator={marketRef.current}
            >
                <StageTimelinePanel growthStages={growthStages} />
            </DevPanel>
        </div>
    );
};

export default SimpleSpreadMap; 