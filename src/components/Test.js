import React, { useEffect, useState, useRef } from 'react';
import { DeckGL } from '@deck.gl/react';
import { Map } from 'react-map-gl';
import { LayerManager } from './map-control/layer-manager';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = process.env.MAPBOX_TOKEN;

const INITIAL_VIEW_STATE = {
  longitude: -98.5795,  // Center of US
  latitude: 39.8283,
  zoom: 3,
  pitch: 45,
  bearing: 0,
  minZoom: 1,
  maxZoom: 20,
  maxPitch: 60,
  minPitch: 0,
  projection: 'mercator'
};

const TEST_ROUTES = {
  routes: [
    { 
      source: [-122.4194, 37.7749],    // San Francisco
      target: [-74.0060, 40.7128],     // New York
      height: 1.0,
      type: 'air',
      intensity: 1.0
    },
    {
      source: [-118.2437, 34.0522],    // Los Angeles
      target: [-87.6298, 41.8781],     // Chicago
      height: 1.0,
      type: 'air',
      intensity: 0.8
    }
  ]
};

function Test() {
  const [layers, setLayers] = useState([]);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const layerManagerRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize layer manager
  useEffect(() => {
    try {
      layerManagerRef.current = new LayerManager();
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } catch (error) {
      console.error('Error initializing LayerManager:', error);
    }
  }, []);

  // Setup and run animation
  useEffect(() => {
    if (!layerManagerRef.current) return;

    try {
      const manager = layerManagerRef.current;
      const controller = manager.addAnimatedRoutes('test', TEST_ROUTES);
      setLayers(manager.getLayers());

      let startTime = Date.now();
      const animate = () => {
        const now = Date.now();
        const progress = ((now - startTime) % 2000) / 2000;
        
        if (controller && controller.onFrame) {
          controller.onFrame(progress);
          setLayers([...manager.getLayers()]);
        }
        
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } catch (error) {
      console.error('Error in animation setup:', error);
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        layers={layers}
        debug={true}
        projection="mercator"
      >
        <Map
          mapStyle="mapbox://styles/mapbox/dark-v11"
          reuseMaps
          preventStyleDiffing={true}
          projection="mercator"
          renderWorldCopies={true}
          attributionControl={true}
        />
      </DeckGL>
      
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: 10,
        borderRadius: 4,
        fontSize: 12,
        fontFamily: 'monospace'
      }}>
        <div>Active Layers: {layers.length}</div>
        <div>Layer IDs: {layers.map(l => l.id).join(', ')}</div>
        <div>Pitch: {Math.round(viewState.pitch)}°</div>
      </div>
    </div>
  );
}

export default Test; 