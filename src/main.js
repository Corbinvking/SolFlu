// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import React from 'react';
import { createRoot } from 'react-dom/client';
import VisualizationTest from './components/VisualizationTest';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<VisualizationTest />);
