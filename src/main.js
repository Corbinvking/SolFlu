// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import React from 'react';
import { createRoot } from 'react-dom/client';
import SpreadVisualizationTest from './components/SpreadVisualizationTest';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<SpreadVisualizationTest />);
