import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { AnimationController } from '../../utils/animation-utils';

export class LayerManager {
    constructor() {
        this.layers = [];
        this.animationController = new AnimationController();
        this.activeAnimations = new Map();
    }

    addVirusSpread(id, data, config = {}) {
        console.log('Adding virus spread:', { id, data, config });
        
        // Generate spread points with higher density
        const spreadPoints = [];
        const center = data.source.coordinates;
        
        // Dense center cluster
        for (let i = 0; i < 100; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 0.1;
            spreadPoints.push({
                coordinates: [
                    center[0] + Math.cos(angle) * distance,
                    center[1] + Math.sin(angle) * distance
                ],
                weight: 1.0 - distance * 5
            });
        }

        // Outer spread
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

        // Create layers
        const heatmapLayer = new HeatmapLayer({
            id: `${id}-heat`,
            data: spreadPoints,
            getPosition: d => d.coordinates,
            getWeight: d => d.weight * (config.intensity || 1),
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
                getWeight: Date.now()
            }
        });

        const pointLayer = new ScatterplotLayer({
            id: `${id}-point`,
            data: [data.source],
            getPosition: d => d.coordinates,
            getFillColor: [255, 0, 0],
            getRadius: 20,
            opacity: 0.8,
            stroked: true,
            radiusScale: 1,
            radiusMinPixels: 3,
            radiusMaxPixels: 30,
            coordinateSystem: COORDINATE_SYSTEM.LNGLAT
        });

        // Update layers array
        this.layers = this.layers.filter(l => !l.id.startsWith(id));
        this.layers.push(heatmapLayer);
        this.layers.push(pointLayer);

        // Set up animation
        const animation = {
            progress: 0,
            intensity: config.intensity || 1,
            speed: config.speed || 1
        };

        this.activeAnimations.set(id, animation);

        return this.animationController;
    }

    update(deltaTime) {
        const updatedPatterns = [];
        
        for (const [id, animation] of this.activeAnimations.entries()) {
            // Update animation progress
            animation.progress += deltaTime * animation.speed;
            
            // Update layers
            const heatmapLayer = this.layers.find(l => l.id === `${id}-heat`);
            const pointLayer = this.layers.find(l => l.id === `${id}-point`);
            
            if (heatmapLayer && pointLayer) {
                // Pulse effect for point
                const pulseScale = 1 + Math.sin(animation.progress * Math.PI * 2) * 0.3;
                
                this.updateLayer(`${id}-point`, {
                    getRadius: 20 * pulseScale
                });

                // Intensity variation for heatmap
                this.updateLayer(`${id}-heat`, {
                    intensity: animation.intensity * (1 + Math.sin(animation.progress * Math.PI) * 0.2),
                    updateTriggers: {
                        getWeight: Date.now()
                    }
                });

                updatedPatterns.push(id);
            }
        }

        return updatedPatterns;
    }

    updateLayer(id, props) {
        const layerIndex = this.layers.findIndex(l => l.id === id);
        if (layerIndex >= 0) {
            const layer = this.layers[layerIndex];
            this.layers[layerIndex] = layer.clone(props);
        }
    }

    getLayers() {
        return this.layers;
    }

    cleanup() {
        this.layers = [];
        this.activeAnimations.clear();
        this.animationController.cleanup();
    }
}

export default LayerManager;