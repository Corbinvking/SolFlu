import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import MarketTranslator from '../../utils/market-translator';

const BASE_RADIUS = 30;
const HEATMAP_INTENSITY = 2;
const ROUTE_WIDTH = 5;
const MIN_ROUTE_WIDTH = 2;

// Add constants for growth calculations
const GROWTH_PARAMS = {
    INFECTION_RATE: {
        MIN: 0.05,
        MAX: 0.5
    },
    SPREAD_DISTANCE: {
        MIN: 0.001,
        MAX: 0.01
    }
};

class LayerManager {
    constructor() {
        console.log('Initializing LayerManager');
        this.layers = [];
        this.animationController = null;
        this.heatmapData = [];
        this.marketTranslator = new MarketTranslator();
        
        // Initialize enhanced growth system
        this.growthSystem = {
            points: new Map(),
            edges: new Set(),
            sourcePoints: new Set(),
            lastGrowthTime: 0,
            branchMemory: new Map(),
            marketInfluence: {
                infectionRate: 0.1,
                spreadDistance: 0.001,
                branchProbability: 0.2,
                shrinkRate: 0,
                simultaneousGrowth: 1
            }
        };
        
        this.initializeLayers();
    }

    initializeLayers() {
        try {
            console.log('Creating deck.gl layers');
            
            // Create heatmap layer with updated configuration
            const heatmapLayer = new HeatmapLayer({
                id: 'heatmap-layer',
                data: this.heatmapData,
                getPosition: d => [d.lng, d.lat],
                getWeight: d => d.weight * HEATMAP_INTENSITY,
                radiusPixels: BASE_RADIUS,
                intensity: 1,
                threshold: 0.1,
                aggregation: 'SUM',
                pickable: true,
                autoHighlight: false,
                visible: true,
                opacity: 1,
                colorRange: [
                    [255, 255, 178, 50],  // Light yellow with low alpha
                    [254, 204, 92, 100],  // Yellow
                    [253, 141, 60, 150],  // Orange
                    [240, 59, 32, 200],   // Red-Orange
                    [189, 0, 38, 255]     // Deep Red
                ],
                parameters: {
                    depthTest: false,
                    blend: true,
                    blendFunc: [770, 771],
                    blendEquation: 32774
                }
            });

            // Create routes layer with enhanced visibility
            const routesLayer = new ArcLayer({
                id: 'routes-layer',
                data: [],
                getSourcePosition: d => d.source,
                getTargetPosition: d => d.target,
                getSourceColor: d => [255, 165, 0, 200],
                getTargetColor: d => [255, 69, 0, 200],
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
            console.log('Layers created successfully:', this.layers.map(l => ({
                id: l.id,
                data: l.props.data.length
            })));
        } catch (error) {
            console.error('Error initializing layers:', error);
            throw new Error(`Failed to initialize layers: ${error.message}`);
        }
    }

    updateHeatmap(centers, marketCap, volatility) {
        try {
            console.log('Updating heatmap with centers:', centers);
            
            // Update growth parameters based on market conditions
            this.updateGrowthParameters(marketCap, volatility);
            
            // Clear old source points and update with new centers
            this.growthSystem.sourcePoints.clear();
            this.growthSystem.points.clear();
            this.growthSystem.edges.clear();
            
            // Process centers as source points and initial heatmap data
            const initialHeatmapData = [];
            centers.forEach(center => {
                const key = `${center.lng},${center.lat}`;
                this.growthSystem.sourcePoints.add(key);
                
                // Add center point to growth system
                this.growthSystem.points.set(key, {
                    point: {
                        lng: center.lng,
                        lat: center.lat,
                        weight: 1.0
                    },
                    isEdge: true,
                    generation: 0,
                    direction: null
                });
                this.growthSystem.edges.add(key);

                // Add to initial heatmap data
                initialHeatmapData.push({
                    lng: center.lng,
                    lat: center.lat,
                    weight: 1.0
                });
            });

            // Update the layer with initial data
            const heatmapLayer = this.layers.find(layer => layer.id === 'heatmap-layer');
            if (heatmapLayer) {
                console.log('Updating heatmap layer with data:', initialHeatmapData);
                
                const updatedLayer = new HeatmapLayer({
                    ...heatmapLayer.props,
                    data: initialHeatmapData,
                    visible: true,
                    opacity: 1,
                    radiusPixels: Math.max(30, Math.min(60, BASE_RADIUS)),
                    intensity: Math.max(1, Math.min(3.0, volatility * HEATMAP_INTENSITY)),
                    threshold: 0.05,
                    colorRange: [
                        [255, 255, 178, 50],
                        [254, 204, 92, 100],
                        [253, 141, 60, 150],
                        [240, 59, 32, 200],
                        [189, 0, 38, 255]
                    ],
                    updateTriggers: {
                        getPosition: initialHeatmapData,
                        getWeight: [initialHeatmapData, volatility],
                        radiusPixels: marketCap,
                        intensity: volatility
                    }
                });
                this.updateLayer('heatmap-layer', updatedLayer);
                
                // Force a re-render by creating a new array
                this.heatmapData = [...initialHeatmapData];
            }

            console.log('Heatmap Updated:', {
                centers: centers.length,
                points: this.growthSystem.points.size,
                edges: this.growthSystem.edges.size,
                heatmapData: this.heatmapData.length,
                firstPoint: this.heatmapData[0]
            });

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
                activation: route.active ? Math.max(0.5, volatility) : 0,
                height: route.active ? 2.0 : 0,
                permanent: route.permanent
            }));

            const routesLayer = this.layers.find(layer => layer.id === 'routes-layer');
            if (routesLayer) {
                const updatedLayer = new ArcLayer({
                    ...routesLayer.props,
                    data: processedRoutes,
                    getSourcePosition: d => d.source,
                    getTargetPosition: d => d.target,
                    getWidth: d => Math.max(MIN_ROUTE_WIDTH * 2, d.activation * ROUTE_WIDTH * 2),
                    getTilt: d => 15,
                    getHeight: d => d.permanent ? 2.0 : 1.5,
                    widthMinPixels: 3,
                    widthMaxPixels: 15,
                    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                    greatCircle: true,
                    pickable: true,
                    autoHighlight: true,
                    highlightColor: [255, 255, 255, 200],
                    getSourceColor: d => d.permanent ? [255, 140, 0, 230] : [255, 165, 0, 200],
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

    animate(progress = 0) {
        try {
            if (this.animationController) {
                this.animationController.update();

                // Update heatmap animation with organic growth
                if (this.heatmapData.length > 0 || this.growthSystem.sourcePoints.size > 0) {
                    const now = progress;
                    
                    // Handle market decline - remove points from edges based on translated shrink rate
                    const shrinkRate = this.growthSystem.marketInfluence.shrinkRate;
                    if (shrinkRate > 0) {
                        const shrinkAmount = Math.floor(this.growthSystem.points.size * shrinkRate);
                        const edgePoints = Array.from(this.growthSystem.edges);
                        
                        for (let i = 0; i < shrinkAmount && edgePoints.length > 0; i++) {
                            const randomEdgeIndex = Math.floor(Math.random() * edgePoints.length);
                            const edgeKey = edgePoints[randomEdgeIndex];
                            
                            // Remove point from all collections
                            this.growthSystem.points.delete(edgeKey);
                            this.growthSystem.edges.delete(edgeKey);
                            edgePoints.splice(randomEdgeIndex, 1);
                        }
                    }

                    // Ensure we have edge points - if none, reinitialize from source points
                    if (this.growthSystem.edges.size === 0 && this.growthSystem.sourcePoints.size > 0) {
                        this.growthSystem.sourcePoints.forEach(key => {
                            if (!this.growthSystem.points.has(key)) {
                                const [lng, lat] = key.split(',').map(Number);
                                this.growthSystem.points.set(key, {
                                    point: { lng, lat, weight: 1.0 },
                                    isEdge: true,
                                    generation: 0,
                                    direction: null
                                });
                                this.growthSystem.edges.add(key);
                            }
                        });
                    }

                    let pointsUpdated = false;
                    // Get all available edge points
                    const edgeKeys = Array.from(this.growthSystem.edges);
                    if (edgeKeys.length > 0) {
                        // Use translated parameters for growth
                        const growthPoints = Math.min(
                            edgeKeys.length,
                            this.growthSystem.marketInfluence.simultaneousGrowth
                        );

                        // Grow multiple points per frame based on infection rate
                        const pointsToGrow = Math.max(1, Math.floor(growthPoints * this.growthSystem.marketInfluence.infectionRate));
                        
                        for (let i = 0; i < pointsToGrow; i++) {
                            const edgeKey = edgeKeys[Math.floor(Math.random() * edgeKeys.length)];
                            const edgeData = this.growthSystem.points.get(edgeKey);

                            if (edgeData) {
                                const growthAngle = this.calculateGrowthDirection(edgeData, progress);
                                const spreadDistance = this.growthSystem.marketInfluence.spreadDistance;

                                const createGrowthPoint = (angle) => {
                                    const newLng = edgeData.point.lng + Math.cos(angle) * spreadDistance;
                                    const newLat = edgeData.point.lat + Math.sin(angle) * spreadDistance;
                                    const newKey = `${newLng},${newLat}`;

                                    if (!this.growthSystem.points.has(newKey) && 
                                        this.growthSystem.points.size < 2000) {
                                        this.growthSystem.points.set(newKey, {
                                            point: {
                                                lng: newLng,
                                                lat: newLat,
                                                weight: edgeData.point.weight * 0.99
                                            },
                                            isEdge: true,
                                            generation: edgeData.generation + 1,
                                            direction: angle
                                        });
                                        this.growthSystem.edges.add(newKey);
                                        pointsUpdated = true;
                                        return true;
                                    }
                                    return false;
                                };

                                const success = createGrowthPoint(growthAngle);

                                // Use translated branch probability
                                if (success && Math.random() < this.growthSystem.marketInfluence.branchProbability) {
                                    const branchAngle1 = growthAngle + Math.PI / 3;
                                    const branchAngle2 = growthAngle - Math.PI / 3;
                                    createGrowthPoint(branchAngle1);
                                    createGrowthPoint(branchAngle2);
                                }

                                if (success) {
                                    edgeData.isEdge = false;
                                    this.growthSystem.edges.delete(edgeKey);
                                }
                            }
                        }

                        // Only update the layer if points have changed
                        if (pointsUpdated) {
                            // Update heatmap layer with new growth data
                            const heatmapLayer = this.layers.find(layer => layer.id === 'heatmap-layer');
                            if (heatmapLayer) {
                                const animatedData = Array.from(this.growthSystem.points.values()).map(data => ({
                                    lng: data.point.lng,
                                    lat: data.point.lat,
                                    weight: data.point.weight * (data.isEdge ? 1.0 : Math.max(0.5, 1 - (data.generation * 0.05)))
                                }));

                                const updatedLayer = new HeatmapLayer({
                                    ...heatmapLayer.props,
                                    data: animatedData,
                                    visible: true,
                                    opacity: 1,
                                    radiusPixels: Math.max(30, Math.min(60, BASE_RADIUS * this.growthSystem.marketInfluence.infectionRate)),
                                    intensity: Math.max(1, Math.min(3.0, this.growthSystem.marketInfluence.infectionRate * HEATMAP_INTENSITY)),
                                    updateTriggers: {
                                        getPosition: now,
                                        getWeight: now,
                                        radiusPixels: this.growthSystem.marketInfluence.infectionRate,
                                        intensity: this.growthSystem.marketInfluence.infectionRate
                                    }
                                });
                                this.updateLayer('heatmap-layer', updatedLayer);
                                
                                // Force update heatmap data
                                this.heatmapData = [...animatedData];

                                // Log growth status for debugging
                                if (now % 0.1 < 0.01) {
                                    console.log('Growth Status:', {
                                        totalPoints: this.growthSystem.points.size,
                                        edgePoints: this.growthSystem.edges.size,
                                        infectionRate: this.growthSystem.marketInfluence.infectionRate,
                                        shrinkRate: this.growthSystem.marketInfluence.shrinkRate,
                                        heatmapDataLength: this.heatmapData.length
                                    });
                                }
                            }
                        }
                    }
                }

                // Update route animations with glow effect
                const routesLayer = this.layers.find(layer => layer.id === 'routes-layer');
                if (routesLayer && routesLayer.props.data.length > 0) {
                    const glowIntensity = Math.floor(128 + 127 * Math.sin(progress * Math.PI * 4));

                    const updatedLayer = new ArcLayer({
                        ...routesLayer.props,
                        getSourcePosition: d => d.source,
                        getTargetPosition: d => d.target,
                        getWidth: d => Math.max(MIN_ROUTE_WIDTH, d.activation * ROUTE_WIDTH),
                        getTilt: d => 15,
                        getHeight: d => d.permanent ? 2.0 : 1.5,
                        widthMinPixels: 2,
                        widthMaxPixels: 10,
                        coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                        greatCircle: true,
                        pickable: true,
                        autoHighlight: true,
                        highlightColor: [255, 255, 255, 200],
                        getSourceColor: d => {
                            return d.permanent ? [255, 140, 0, glowIntensity] : [255, 165, 0, glowIntensity];
                        },
                        getTargetColor: d => {
                            return d.permanent ? [255, 69, 0, glowIntensity] : [255, 69, 0, glowIntensity];
                        },
                        updateTriggers: {
                            getSourceColor: progress,
                            getTargetColor: progress
                        }
                    });
                    this.updateLayer('routes-layer', updatedLayer);
                }

                // Update center animations with pulsing effect
                const centersLayer = this.layers.find(layer => layer.id === 'centers-layer');
                if (centersLayer && centersLayer.props.data.length > 0) {
                    const scale = 1 + 0.2 * Math.sin(progress * Math.PI * 4);
                    const updatedLayer = new ScatterplotLayer({
                        ...centersLayer.props,
                        radiusScale: scale,
                        updateTriggers: {
                            radiusScale: progress
                        }
                    });
                    this.updateLayer('centers-layer', updatedLayer);
                }
            }
        } catch (error) {
            console.error('Error in animate:', error);
        }
    }

    updateGrowthParameters(marketCap, volatility) {
        // Use the translator to convert market data to virus parameters
        const marketData = {
            marketCap,
            volume: marketCap * volatility,
            volatility
        };

        const virusParameters = this.marketTranslator.translate(marketData);
        
        // Update growth system with translated parameters
        this.growthSystem.marketInfluence = {
            ...virusParameters,
            // Store normalized values for growth calculations
            marketStrength: marketCap / 1000000
        };

        console.log('Updated Growth Parameters:', {
            ...this.growthSystem.marketInfluence,
            normalizedMarketCap: marketCap / 1000000
        });
    }

    shouldBranch(edgeData) {
        // More aggressive branching for testing
        const branchChance = this.growthSystem.marketInfluence.branchProbability;
        const generationFactor = Math.max(0.5, 1 - (edgeData.generation * 0.02)); // Much slower generation decay
        return Math.random() < (branchChance * generationFactor);
    }

    calculateGrowthDirection(edgeData, progress) {
        const key = `${Math.floor(edgeData.point.lng * 1000)},${Math.floor(edgeData.point.lat * 1000)}`;
        const successfulDirection = this.growthSystem.branchMemory.get(key);
        
        // Get market influence
        const marketInfluence = this.growthSystem.marketInfluence;
        const marketStrength = marketInfluence.infectionRate / GROWTH_PARAMS.INFECTION_RATE.MAX;
        
        if (successfulDirection && Math.random() < 0.8) {
            // Follow successful direction with less variation during strong markets
            const variation = (Math.random() - 0.5) * Math.PI / (3 + marketStrength * 4);
            return successfulDirection + variation;
        } else if (edgeData.direction !== null) {
            // Continue current direction with market-influenced variation
            const variation = (Math.random() - 0.5) * Math.PI / (2 + marketStrength * 3);
            return edgeData.direction + variation;
        } else {
            // For new directions, use a market-influenced approach
            const baseAngle = progress * Math.PI * 2;
            const variation = (Math.random() - 0.5) * Math.PI * (1 - marketStrength * 0.5);
            return baseAngle + variation;
        }
    }
}

export default LayerManager; 