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

    const updateVisualization = (points) => {
        if (!points || points.length === 0) {
            console.log('No points to render');
            return;
        }

        const scatterLayer = new ScatterplotLayer({
            id: 'virus-points',
            data: points,
            getPosition: d => d.position,
            getRadius: 3,  // Fixed small size
            getFillColor: d => [
                255, // Red
                Math.min(255, d.colorIntensity * 255), // Green (based on volatility)
                0, // Blue
                255 // Full alpha
            ],
            pickable: false,
            opacity: 1,
            stroked: false,
            filled: true,
            radiusUnits: 'pixels',
            radiusScale: 1,
            radiusMinPixels: 3,
            radiusMaxPixels: 3,
            updateTriggers: {
                getFillColor: [points.map(p => p.colorIntensity)]
            }
        });

        setLayers([scatterLayer]);
    };

    useEffect(() => {
        console.log('Initializing with view state:', viewState);
        
        // Initialize components
        marketRef.current = new MarketSimulator();
        translatorRef.current = new TranslatorBridge();
        virusRef.current = new VirusStateMachine();

        // Initialize virus state at center of view
        const center = [viewState.longitude, viewState.latitude];
        console.log('Setting initial center at:', center);
        
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
            const deltaTime = (now - lastTimeRef.current) / 1000;
            lastTimeRef.current = now;

            virusRef.current.update(deltaTime);
            const points = virusRef.current.getPoints();
            updateVisualization(points);

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (marketRef.current) {
                marketRef.current.stop();
            }
        };
    }, []);

    const handleViewStateChange = ({ viewState }) => {
        console.log('View state changed:', viewState);
        setViewState(viewState);
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
                onViewStateChange={handleViewStateChange}
                getCursor={() => 'default'}
            >
                <Map
                    mapStyle={MAP_STYLE}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    projection="mercator"
                    renderWorldCopies={true}
                />
            </DeckGL>

            <OrderBookDisplay marketState={marketData} />
            <DevPanel
                onVirusBoost={handleVirusBoost}
                onVirusSuppress={handleVirusSuppress}
                onResetSimulation={handleResetSimulation}
            />
        </div>
    );
};

export default SimpleSpreadMap; 