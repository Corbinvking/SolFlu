import React, { useState, useRef } from 'react';
import { LayerManager } from './layer-manager';

export function MapControl({ onLayerUpdate }) {
  const [layerManager] = useState(() => new LayerManager());
  const animationControllerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const showHeatmap = () => {
    layerManager.clear();
    
    const controller = layerManager.addHeatmapLayer('heatmap', {
      source: {
        coordinates: [-122.4, 37.8], // San Francisco
      },
      spread: [
        { coordinates: [-122.4, 37.8], weight: 1 },
        { coordinates: [-122.3, 37.9], weight: 0.8 },
        { coordinates: [-122.5, 37.7], weight: 0.6 },
        { coordinates: [-122.2, 37.8], weight: 0.7 },
        { coordinates: [-122.4, 37.6], weight: 0.5 }
      ]
    });
    
    onLayerUpdate(layerManager.getLayers());
  };

  const showRoutes = () => {
    layerManager.clear();
    
    const routeData = {
      routes: [
        { 
          source: [-122.4194, 37.7749],    // San Francisco
          target: [-74.0060, 40.7128],     // New York
          height: 1.0 
        },
        {
          source: [-118.2437, 34.0522],    // Los Angeles
          target: [-87.6298, 41.8781],     // Chicago
          height: 1.0
        },
        {
          source: [-80.1918, 25.7617],     // Miami
          target: [-122.3321, 47.6062],    // Seattle
          height: 1.0
        }
      ]
    };

    console.log('Creating routes:', routeData);
    
    const controller = layerManager.addAnimatedRoutes('routes', routeData);
    animationControllerRef.current = controller;
    controller.play();
    setIsPlaying(true);
    
    const layers = layerManager.getLayers();
    console.log('Created layers:', layers.map(l => ({ id: l.id, props: l.props })));
    onLayerUpdate(layers);
  };

  const showFullAnimation = () => {
    layerManager.clear();
    
    const controller = layerManager.addInfectionSpreadAnimation('infection-spread', {
      source: {
        coordinates: [-122.4, 37.8], // San Francisco
      },
      spread: [
        { coordinates: [-122.4, 37.8], weight: 1 },
        { coordinates: [-122.3, 37.9], weight: 0.8 },
        { coordinates: [-122.5, 37.7], weight: 0.6 },
        { coordinates: [-122.2, 37.8], weight: 0.7 },
        { coordinates: [-122.4, 37.6], weight: 0.5 }
      ]
    });
    
    animationControllerRef.current = controller;
    controller.play();
    setIsPlaying(true);
    onLayerUpdate(layerManager.getLayers());
  };

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'rgba(255, 255, 255, 0.9)',
      padding: '10px',
      borderRadius: '4px',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={showHeatmap}>Show Heatmap Only</button>
        <button onClick={showRoutes}>Show Routes Only</button>
        <button onClick={showFullAnimation}>Show Full Animation</button>
      </div>
    </div>
  );
} 