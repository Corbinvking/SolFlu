import React, { useState } from 'react';
import { LayerManager } from './layer-manager';

export function MapControl({ onLayerUpdate }) {
  const [layerManager] = useState(() => new LayerManager());

  const addHeatmapLayer = () => {
    layerManager.addHeatmapLayer('test-heatmap', [
      { coordinates: [-100, 40], weight: 1 },
      { coordinates: [-90, 35], weight: 2 },
      { coordinates: [-95, 38], weight: 3 }
    ]);
    onLayerUpdate(layerManager.getLayers());
  };

  const addArcLayer = () => {
    layerManager.addArcLayer('test-arc', [
      {
        source: [-122.4, 37.8],
        target: [-74, 40.7],
      }
    ]);
    onLayerUpdate(layerManager.getLayers());
  };

  const addPointLayer = () => {
    layerManager.addPointLayer('test-points', [
      { coordinates: [-122.4, 37.8], color: [255, 0, 0], size: 100 },
      { coordinates: [-74, 40.7], color: [0, 255, 0], size: 100 }
    ]);
    onLayerUpdate(layerManager.getLayers());
  };

  const clearLayers = () => {
    layerManager.clear();
    onLayerUpdate([]);
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
        <button onClick={addHeatmapLayer}>Add Heatmap</button>
        <button onClick={addArcLayer}>Add Route</button>
        <button onClick={addPointLayer}>Add Points</button>
        <button onClick={clearLayers}>Clear All</button>
      </div>
    </div>
  );
} 