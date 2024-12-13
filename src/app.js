import React from 'react';
import Test from './components/Test';
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
      <Test />
    </div>
  );
}

export default App;
