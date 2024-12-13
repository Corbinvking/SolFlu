import React from 'react';
import MapView from './components/MapView';
import './styles/map.css';

function App() {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh',
      position: 'absolute',
      top: 0,
      left: 0,
      overflow: 'hidden'
    }}>
      <MapView />
    </div>
  );
}

export default App;
