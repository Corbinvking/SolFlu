import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';

export class LayerManager {
  constructor() {
    this.layers = [];
  }

  addHeatmapLayer(id, data, config = {}) {
    const layer = new HeatmapLayer({
      id,
      data,
      getPosition: d => d.coordinates,
      getWeight: d => d.weight,
      radiusPixels: 60,
      intensity: 1,
      threshold: 0.1,
      colorRange: [
        [255, 255, 178],
        [254, 204, 92],
        [253, 141, 60],
        [240, 59, 32]
      ],
      ...config
    });
    this.layers.push(layer);
  }

  addArcLayer(id, data, config = {}) {
    const layer = new ArcLayer({
      id,
      data,
      getSourcePosition: d => d.source,
      getTargetPosition: d => d.target,
      getSourceColor: [255, 100, 100],
      getTargetColor: [100, 255, 100],
      getWidth: 3,
      greatCircle: true,
      ...config
    });
    this.layers.push(layer);
  }

  addPointLayer(id, data, config = {}) {
    const layer = new ScatterplotLayer({
      id,
      data,
      getPosition: d => d.coordinates,
      getFillColor: d => d.color,
      getRadius: d => d.size,
      opacity: 0.8,
      stroked: true,
      radiusScale: 1,
      radiusMinPixels: 3,
      radiusMaxPixels: 30,
      ...config
    });
    this.layers.push(layer);
  }

  getLayers() {
    return this.layers;
  }

  removeLayer(id) {
    this.layers = this.layers.filter(layer => layer.id !== id);
  }

  clear() {
    this.layers = [];
  }
} 