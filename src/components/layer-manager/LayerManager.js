import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';

const BASE_RADIUS = 50;
const HEATMAP_INTENSITY = 1;
const ROUTE_WIDTH = 5;
const MIN_ROUTE_WIDTH = 2;

class LayerManager {
    constructor() {
        console.log('Initializing LayerManager'); // Debug
        this.layers = [];
        this.animationController = null;
        this.initializeLayers();
    }

    initializeLayers() {
        try {
            console.log('Creating deck.gl layers'); // Debug
            
            // Create heatmap layer
            const heatmapLayer = new HeatmapLayer({
                id: 'heatmap-layer',
                data: [],
                getPosition: d => [d.lng, d.lat],
                getWeight: d => d.intensity * HEATMAP_INTENSITY,
                radiusPixels: BASE_RADIUS,
                intensity: 1,
                threshold: 0.05,
                colorRange: [
                    [255, 255, 178],
                    [254, 204, 92],
                    [253, 141, 60],
                    [240, 59, 32],
                    [189, 0, 38]
                ]
            });

            // Create routes layer with enhanced visibility
            const routesLayer = new ArcLayer({
                id: 'routes-layer',
                data: [],
                getSourcePosition: d => d.source,
                getTargetPosition: d => d.target,
                getSourceColor: d => [255, 165, 0, 200], // Orange with alpha
                getTargetColor: d => [255, 69, 0, 200],  // Red-Orange with alpha
                getWidth: d => Math.max(MIN_ROUTE_WIDTH, d.activation * ROUTE_WIDTH),
                getTilt: d => 15,
                getHeight: d => 1.5,
                widthMinPixels: 2,
                widthMaxPixels: 10,
                coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                greatCircle: true,
                pickable: true,
                autoHighlight: true,
                highlightColor: [255, 255, 255, 200]
            });

            // Create centers layer
            const centersLayer = new ScatterplotLayer({
                id: 'centers-layer',
                data: [],
                getPosition: d => [d.lng, d.lat],
                getRadius: d => d.intensity * BASE_RADIUS,
                getFillColor: d => [255, 140, 0, 200],
                radiusScale: 1,
                radiusMinPixels: 5,
                radiusMaxPixels: 50,
                pickable: true,
                autoHighlight: true,
                highlightColor: [255, 255, 255, 200]
            });

            this.layers = [heatmapLayer, routesLayer, centersLayer];
            console.log('Layers created successfully:', this.layers); // Debug
        } catch (error) {
            console.error('Error initializing layers:', error);
            throw new Error(`Failed to initialize layers: ${error.message}`);
        }
    }

    updateHeatmap(data, marketCap, volatility) {
        try {
            const radius = this.calculateRadius(marketCap);
            const intensity = this.calculateIntensity(volatility);

            const heatmapLayer = this.layers.find(layer => layer.id === 'heatmap-layer');
            if (heatmapLayer) {
                const updatedLayer = new HeatmapLayer({
                    ...heatmapLayer.props,
                    data,
                    radiusPixels: radius,
                    intensity,
                    updateTriggers: {
                        getWeight: data,
                        radiusPixels: radius,
                        intensity
                    }
                });
                this.updateLayer('heatmap-layer', updatedLayer);
            }
        } catch (error) {
            console.error('Error updating heatmap:', error);
            throw new Error(`Failed to update heatmap: ${error.message}`);
        }
    }

    updateRoutes(routes, volatility) {
        try {
            const processedRoutes = routes.map(route => ({
                source: route.source,
                target: route.target,
                activation: route.active ? Math.max(0.5, volatility) : 0, // Increased minimum activation
                height: route.active ? 2.0 : 0, // Increased height
                permanent: route.permanent
            }));

            const routesLayer = this.layers.find(layer => layer.id === 'routes-layer');
            if (routesLayer) {
                const updatedLayer = new ArcLayer({
                    ...routesLayer.props,
                    data: processedRoutes,
                    getWidth: d => Math.max(MIN_ROUTE_WIDTH, (d.permanent ? 1.5 : 1.0) * d.activation * ROUTE_WIDTH), // Wider for permanent routes
                    getSourceColor: d => d.permanent ? [255, 140, 0, 230] : [255, 165, 0, 200], // Brighter for permanent routes
                    getTargetColor: d => d.permanent ? [255, 69, 0, 230] : [255, 69, 0, 200],
                    updateTriggers: {
                        getWidth: [volatility, processedRoutes],
                        getHeight: processedRoutes,
                        getSourceColor: processedRoutes,
                        getTargetColor: processedRoutes
                    }
                });
                this.updateLayer('routes-layer', updatedLayer);
            }
        } catch (error) {
            console.error('Error updating routes:', error);
            throw new Error(`Failed to update routes: ${error.message}`);
        }
    }

    updateCenters(centers) {
        try {
            const centersLayer = this.layers.find(layer => layer.id === 'centers-layer');
            if (centersLayer) {
                const updatedLayer = new ScatterplotLayer({
                    ...centersLayer.props,
                    data: centers,
                    updateTriggers: {
                        getRadius: centers,
                        getFillColor: centers
                    }
                });
                this.updateLayer('centers-layer', updatedLayer);
            }
        } catch (error) {
            console.error('Error updating centers:', error);
            throw new Error(`Failed to update centers: ${error.message}`);
        }
    }

    updateLayer(layerId, newLayer) {
        const index = this.layers.findIndex(layer => layer.id === layerId);
        if (index !== -1) {
            this.layers[index] = newLayer;
        }
    }

    calculateRadius(marketCap) {
        try {
            return Math.max(30, Math.min(200, marketCap / 1000000 * BASE_RADIUS));
        } catch (error) {
            console.error('Error calculating radius:', error);
            return BASE_RADIUS; // fallback to default
        }
    }

    calculateIntensity(volatility) {
        try {
            return Math.max(0.5, Math.min(2.0, volatility * HEATMAP_INTENSITY));
        } catch (error) {
            console.error('Error calculating intensity:', error);
            return HEATMAP_INTENSITY; // fallback to default
        }
    }

    getLayers() {
        try {
            return this.layers;
        } catch (error) {
            console.error('Error getting layers:', error);
            return []; // return empty array as fallback
        }
    }

    setAnimationController(controller) {
        try {
            this.animationController = controller;
        } catch (error) {
            console.error('Error setting animation controller:', error);
            throw new Error(`Failed to set animation controller: ${error.message}`);
        }
    }

    animate() {
        try {
            if (this.animationController) {
                this.animationController.update();
            }
        } catch (error) {
            console.error('Error in animate:', error);
        }
    }
}

export default LayerManager; 