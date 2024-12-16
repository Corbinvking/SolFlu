import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import SpreadVisualizationTest from './components/SpreadVisualizationTest';
import './styles/map.css';

const App = () => {
    return (
        <ErrorBoundary>
            <SpreadVisualizationTest />
        </ErrorBoundary>
    );
};

export default App;
