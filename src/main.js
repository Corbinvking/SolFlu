// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import ErrorBoundary from './components/ErrorBoundary';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
