import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { AnimationController } from '../../utils/animation-utils';

export class LayerManager {
  constructor() {
    this.layers = [];
    this.animationController = new AnimationController();
  }

  clear() {
    this.layers = [];
    if (this.animationController) {
      this.animationController.stop();
    }
  }

  addVirusSpread(id, data, config = {}) {
    let currentProgress = 0;
    const baseRadius = 20;
    const pulseRange = 30;

    // Generate a lot more spread points in a tighter cluster
    const spreadPoints = [];
    const center = data.source.coordinates;
    
    // Generate dense center cluster
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 0.1; // Very tight cluster
      spreadPoints.push({
        coordinates: [
          center[0] + Math.cos(angle) * distance,
          center[1] + Math.sin(angle) * distance
        ],
        weight: 1.0 - distance * 5 // Higher weight for center points
      });
    }

    // Add some outer spread
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 0.1 + Math.random() * 0.2;
      spreadPoints.push({
        coordinates: [
          center[0] + Math.cos(angle) * distance,
          center[1] + Math.sin(angle) * distance
        ],
        weight: 0.3 + Math.random() * 0.3
      });
    }

    // Initial infection point
    const pointLayer = new ScatterplotLayer({
      id: `${id}-point`,
      data: [data.source],
      getPosition: d => d.coordinates,
      getFillColor: [255, 0, 0],
      getRadius: baseRadius,
      opacity: 0.8,
      stroked: true,
      radiusScale: 1,
      radiusMinPixels: 3,
      radiusMaxPixels: 60,
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT
    });

    // Heatmap layer with original working configuration
    const heatmapLayer = new HeatmapLayer({
      id: `${id}-heat`,
      data: spreadPoints,
      getPosition: d => d.coordinates,
      getWeight: d => d.weight,
      radiusPixels: 30,
      intensity: 3,
      threshold: 0.05,
      opacity: 0.7,
      colorRange: [
        [255, 255, 178],
        [254, 204, 92],
        [253, 141, 60],
        [240, 59, 32]
      ],
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      updateTriggers: {
        getWeight: currentProgress
      }
    });

    this.layers = [];
    this.layers.push(heatmapLayer);  // Add heatmap first
    this.layers.push(pointLayer);     // Add point layer on top

    this.animationController.setDuration(5000);
    this.animationController.setOnFrame((progress) => {
      currentProgress = progress;
      
      // Update point animation
      this.updateLayer(`${id}-point`, {
        getRadius: baseRadius + Math.sin(progress * Math.PI * 2) * pulseRange
      });

      // Update heatmap intensity and weights
      this.updateLayer(`${id}-heat`, {
        intensity: 1 + progress * 3,
        getWeight: d => d.weight * progress,
        opacity: Math.min(0.7, progress * 1.5)
      });
    });

    return this.animationController;
  }

  addInfectionSpreadAnimation(id, data, config = {}) {
    let currentProgress = 0;
    const baseRadius = 20;
    const pulseRange = 30;

    // Initial infection point
    const pointLayer = new ScatterplotLayer({
      id: `${id}-point`,
      data: [data.source],
      getPosition: d => d.coordinates,
      getFillColor: [255, 0, 0],
      getRadius: baseRadius,
      opacity: 0.8,
      stroked: true,
      radiusScale: 1,
      radiusMinPixels: 3,
      radiusMaxPixels: 60,
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT
    });

    // Spread heatmap
    const heatmapLayer = new HeatmapLayer({
      id: `${id}-heat`,
      data: data.spread,
      getPosition: d => d.coordinates,
      getWeight: d => d.weight * currentProgress,
      radiusPixels: 60,
      intensity: 1,
      threshold: 0.1,
      opacity: currentProgress * 0.7,
      colorRange: [
        [255, 255, 178],
        [254, 204, 92],
        [253, 141, 60],
        [240, 59, 32]
      ],
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT
    });

    this.layers = [];
    this.layers.push(heatmapLayer);
    this.layers.push(pointLayer);

    this.animationController.setDuration(5000);
    this.animationController.setOnFrame((progress) => {
      currentProgress = progress;
      
      this.updateLayer(`${id}-heat`, {
        getWeight: d => d.weight * (progress > 0.2 ? progress : 0),
        opacity: progress > 0.2 ? progress * 0.7 : 0
      });

      this.updateLayer(`${id}-point`, {
        getRadius: baseRadius + Math.sin(progress * Math.PI * 2) * pulseRange
      });
    });

    return this.animationController;
  }

  addHeatmapLayer(id, data) {
    // Create the heatmap layer with static data
    const heatmapLayer = new HeatmapLayer({
      id: `${id}-heat`,
      data: data.spread,
      getPosition: d => d.coordinates,
      getWeight: d => d.weight,
      radiusPixels: 60,
      intensity: 3,
      threshold: 0.05,
      opacity: 0.7,
      colorRange: [
        [255, 255, 178],
        [254, 204, 92],
        [253, 141, 60],
        [240, 59, 32]
      ],
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT
    });

    this.layers = [heatmapLayer];
    return null; // No animation controller needed
  }

  addAnimatedRoutes(id, data) {
    console.log('Adding routes with data:', JSON.stringify(data, null, 2));
    
    // Generate spread points around each source based on route intensity
    const spreadPoints = [];
    data.routes.forEach(route => {
      const center = route.source;
      const intensity = route.intensity || 1.0;
      const spreadRadius = route.type === 'air' ? 1.0 : 0.5; // Larger spread for air routes
      
      // Dense center cluster - size based on route intensity
      const centerPoints = Math.floor(50 * intensity);
      for (let i = 0; i < centerPoints; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * spreadRadius * 0.5;
        spreadPoints.push({
          coordinates: [
            center[0] + Math.cos(angle) * distance,
            center[1] + Math.sin(angle) * distance
          ],
          weight: (1.0 - distance) * intensity
        });
      }

      // Scattered outer points
      const outerPoints = Math.floor(30 * intensity);
      for (let i = 0; i < outerPoints; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = spreadRadius * (0.5 + Math.random());
        spreadPoints.push({
          coordinates: [
            center[0] + Math.cos(angle) * distance,
            center[1] + Math.sin(angle) * distance
          ],
          weight: 0.3 * intensity
        });
      }
    });

    // Create heatmap layer with fixed pixel radius
    const heatmapLayer = new HeatmapLayer({
      id: `${id}-heatmap`,
      data: spreadPoints,
      getPosition: d => d.coordinates,
      getWeight: d => d.weight,
      radiusPixels: 20,
      radiusMinPixels: 20,
      radiusMaxPixels: 20,
      intensity: 1,
      threshold: 0.1,
      opacity: 0.6,
      colorRange: [
        [255, 255, 178],
        [254, 204, 92],
        [253, 141, 60],
        [240, 59, 32]
      ],
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      updateTriggers: {
        getWeight: Date.now()
      }
    });
    
    // Create a single point layer for all points with fixed pixel size
    const pointLayer = new ScatterplotLayer({
      id: `${id}-points`,
      data: [
        ...data.routes.map(r => ({ 
          position: r.source, 
          color: r.type === 'air' ? [255, 0, 0] : [255, 140, 0],  // Red for airports, orange for ports
          radius: r.type === 'air' ? 15 : 12  // Larger for airports
        })),
        ...data.routes.map(r => ({ 
          position: r.target, 
          color: r.type === 'air' ? [0, 255, 0] : [0, 200, 0],  // Different greens for destinations
          radius: r.type === 'air' ? 15 : 12
        }))
      ],
      getPosition: d => d.position,
      getFillColor: d => d.color,
      getRadius: d => d.radius,
      radiusUnits: 'pixels',
      radiusMinPixels: 5,
      radiusMaxPixels: 15,
      opacity: 1,
      stroked: true,
      lineWidthMinPixels: 1,
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      pickable: true
    });

    // Create arc layer with different styles for air and ship routes
    const arcLayer = new ArcLayer({
      id: `${id}-arcs`,
      data: data.routes,
      getSourcePosition: d => d.source,
      getTargetPosition: d => d.target,
      getSourceColor: d => d.type === 'air' ? [255, 0, 0] : [255, 140, 0],
      getTargetColor: d => d.type === 'air' ? [0, 255, 0] : [0, 200, 0],
      getWidth: d => d.type === 'air' ? 3 : 2,
      widthUnits: 'pixels',
      widthMinPixels: 2,
      widthMaxPixels: 4,
      getHeight: d => d.height * (d.type === 'air' ? 1.0 : 0.5),  // Lower height for shipping routes
      opacity: 0.8,
      greatCircle: true,
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      pickable: true
    });

    // Set layers with heatmap at bottom, then points, then arcs on top
    this.layers = [heatmapLayer, pointLayer, arcLayer];

    // Animation with persistence
    this.animationController.setDuration(2000);
    this.animationController.setOnFrame((progress) => {
      if (!this.layers) return;

      const pulseValue = (Math.sin(progress * Math.PI * 2) + 1) / 2;

      // Update heatmap intensity
      this.updateLayer(`${id}-heatmap`, {
        intensity: 1 + pulseValue * 0.5,
        opacity: 0.6,
        updateTriggers: {
          getWeight: Date.now()
        }
      });

      // Update point sizes
      this.updateLayer(`${id}-points`, {
        getRadius: d => d.radius * (1 + pulseValue * 0.3),
        updateTriggers: {
          getRadius: Date.now()
        }
      });

      // Update arc animation
      this.updateLayer(`${id}-arcs`, {
        getHeight: d => d.height * (d.type === 'air' ? 1.0 : 0.5) * (1 + pulseValue * 0.2),
        updateTriggers: {
          getHeight: Date.now()
        }
      });
    });

    return this.animationController;
  }

  updateLayer(id, props) {
    const layerIndex = this.layers.findIndex(layer => layer.id === id);
    if (layerIndex !== -1) {
      const updatedLayer = this.layers[layerIndex].clone({ ...props });
      this.layers[layerIndex] = updatedLayer;
    }
  }

  getLayers() {
    return this.layers;
  }
}