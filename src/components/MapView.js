import React, { useState, useEffect } from 'react';
import { DeckGL } from '@deck.gl/react';
import { Map } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import { MapControl } from './map-control';

mapboxgl.accessToken = process.env.MAPBOX_TOKEN;

const INITIAL_VIEW_STATE = {
  longitude: -100,
  latitude: 40,
  zoom: 3,
  pitch: 0,
  bearing: 0
};

function MapView() {
  const [layers, setLayers] = useState([]);
  const [error, setError] = useState(null);

  const handleLayerUpdate = (newLayers) => {
    setLayers(newLayers);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
      >
        <Map
          mapStyle="mapbox://styles/mapbox/dark-v11"
          reuseMaps
          attributionControl={true}
        />
      </DeckGL>
      <MapControl onLayerUpdate={handleLayerUpdate} />
    </div>
  );
}

export default MapView; 