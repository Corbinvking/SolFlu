import React, { useEffect, useRef, useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import { Map } from 'react-map-gl';
import { ScatterplotLayer } from '@deck.gl/layers';
import { MAPBOX_TOKEN, MAP_STYLE, INITIAL_VIEW_STATE } from '../../config';
import MarketSimulator from '../integration/market-simulator';
import TranslatorBridge from '../integration/translator-bridge';
import VirusStateMachine from '../core/virus-state-machine';
import OrderBookDisplay from './OrderBookDisplay';
import DevPanel from '../../components/DevPanel';

const SimpleSpreadMap = () => {
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [layers, setLayers] = useState([]);
    const [marketData, setMarketData] = useState(null);

    // Refs for persistent instances
    const marketRef = useRef(null);
    const translatorRef = useRef(null);
    const virusRef = useRef(null);
    const animationFrameRef = useRef(null);
    const lastTimeRef = useRef(performance.now());

    // Dev control handlers
    const handleVirusBoost = () => {
        if (virusRef.current) {
            virusRef.current.boostSpread(2.0); // Double the spread rate temporarily
            marketRef.current.injectVolatility(1.5); // Increase market volatility
        }
    };

    const handleVirusSuppress = () => {
        if (virusRef.current) {
            virusRef.current.suppressSpread(0.5); // Halve the spread rate temporarily
            marketRef.current.injectVolatility(0.5); // Decrease market volatility
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

    useEffect(() => {
        console.log('Initializing components...');
        
        // Initialize components
        marketRef.current = new MarketSimulator();
        translatorRef.current = new TranslatorBridge();
        virusRef.current = new VirusStateMachine();

        // Initialize virus state
        const center = [viewState.longitude, viewState.latitude];
        const initialMarketState = marketRef.current.getMarketState();
        const initialVirusParams = translatorRef.current.translateMarketState(initialMarketState);
        virusRef.current.initialize(center, initialVirusParams);

        // Subscribe to market updates
        marketRef.current.subscribe((newMarketData) => {
            setMarketData(newMarketData);
            const translatedParams = translatorRef.current.translateMarketState(newMarketData);
            virusRef.current.updateParams(translatedParams);
        });

        // Start market simulation
        marketRef.current.start();

        // Animation loop
        const animate = () => {
            const now = performance.now();
            const deltaTime = (now - lastTimeRef.current) / 1000; // Convert to seconds
            lastTimeRef.current = now;

            // Update virus state
            virusRef.current.update(deltaTime);

            // Get current points and update visualization
            const points = virusRef.current.getPoints();
            updateVisualization(points);

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        // Start animation loop
        animate();

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (marketRef.current) {
                marketRef.current.stop();
            }
        };
    }, []);

    const updateVisualization = (points) => {
        const scatterLayer = new ScatterplotLayer({
            id: 'virus-points',
            data: points,
            getPosition: d => d.position,
            getRadius: d => Math.max(50, d.intensity * 500),
            getFillColor: d => [
                255, // Red
                Math.min(255, d.colorIntensity * 255), // Green (based on volatility)
                0, // Blue
                Math.min(255, (d.intensity + d.colorIntensity) * 127) // Alpha (combined effect)
            ],
            pickable: true,
            opacity: 0.9,
            stroked: false,
            filled: true,
            radiusUnits: 'pixels',
            radiusScale: 1,
            radiusMinPixels: 3,
            radiusMaxPixels: 20,
            parameters: {
                depthTest: false
            }
        });

        setLayers([scatterLayer]);
    };

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <DeckGL
                viewState={viewState}
                controller={{
                    dragRotate: true,
                    touchRotate: true,
                    keyboard: true,
                    dragPan: true,
                    touchZoom: true,
                    doubleClickZoom: true,
                    scrollZoom: true
                }}
                layers={layers}
                onViewStateChange={({ viewState }) => setViewState(viewState)}
                projection="mercator"
            >
                <Map
                    mapStyle={MAP_STYLE}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    projection="mercator"
                    renderWorldCopies={true}
                />
            </DeckGL>

            {/* Order Book Display */}
            <OrderBookDisplay marketState={marketData} />

            {/* Dev Panel */}
            <DevPanel
                onVirusBoost={handleVirusBoost}
                onVirusSuppress={handleVirusSuppress}
                onResetSimulation={handleResetSimulation}
            />
        </div>
    );
};

export default SimpleSpreadMap; 