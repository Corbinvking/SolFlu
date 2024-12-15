import VirusStateMachine from '../utils/virus-state-machine';

class LayerManager {
    constructor(map) {
        this.map = map;
        this.virusState = new VirusStateMachine();
        this.animationFrame = null;
        this.lastTimestamp = 0;
        this.progress = 0;
        this.isAnimating = false;
        this.maxPoints = 2000; // Limit total points
        this.currentPoints = [];
        this.centers = [];
        
        // Bind the animation method
        this.animate = this.animate.bind(this);
        
        // Initialize layers
        this.initializeLayers();
    }

    initializeLayers() {
        // Heat layer for virus spread
        this.map.addLayer({
            id: 'virus-heat',
            type: 'heatmap',
            source: {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            },
            paint: {
                'heatmap-weight': ['get', 'weight'],
                'heatmap-intensity': 1,
                'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(33,102,172,0)',
                    0.2, 'rgba(103,169,207,0.6)',
                    0.4, 'rgba(209,229,240,0.7)',
                    0.6, 'rgba(253,219,199,0.8)',
                    0.8, 'rgba(239,138,98,0.9)',
                    1, 'rgba(178,24,43,1)'
                ],
                'heatmap-radius': 8,
                'heatmap-opacity': 0.7
            }
        });

        // Add route lines layer
        this.map.addLayer({
            id: 'route-lines',
            type: 'line',
            source: {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            },
            paint: {
                'line-color': '#ff0000',
                'line-width': 2,
                'line-opacity': 0.7
            }
        });
    }

    startAnimation(centers) {
        // Store centers for reference
        this.centers = centers;
        
        if (this.isAnimating) {
            this.stopAnimation();
        }
        
        this.isAnimating = true;
        this.progress = 0;
        this.lastTimestamp = performance.now();
        
        // Initialize virus state with centers
        this.currentPoints = this.virusState.initializeFromCenters(centers);
        this.updateHeatmap(this.currentPoints);
        
        // Create routes between centers
        this.updateRoutes(centers);
        
        // Start animation loop
        this.animate(performance.now());
    }

    stopAnimation() {
        this.isAnimating = false;
        if (this.animationFrame) {
            window.cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    animate(timestamp) {
        if (!this.isAnimating) return;

        // Calculate time delta and progress
        const delta = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        
        if (delta > 0) {
            this.progress += delta / 10000; // Adjust speed as needed
            if (this.progress > 1) this.progress = 0;
            
            try {
                // Evolve virus state
                const points = this.virusState.evolve(this.progress);
                
                // Check if we're exceeding point limit
                if (points.length > this.maxPoints) {
                    // Instead of stopping, just limit the points
                    this.currentPoints = points.slice(0, this.maxPoints);
                } else {
                    this.currentPoints = points;
                }
                
                this.updateHeatmap(this.currentPoints);
            } catch (err) {
                console.error('Animation error:', err);
                // Don't stop animation on error, just log it
                console.warn('Animation continuing despite error');
            }
        }

        // Continue animation loop
        this.animationFrame = window.requestAnimationFrame(this.animate);
    }

    updateHeatmap(points) {
        if (!this.map || !points) return;

        const features = points.map(point => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [point.lng, point.lat]
            },
            properties: {
                weight: point.weight
            }
        }));

        const source = this.map.getSource('virus-heat');
        if (source) {
            source.setData({
                type: 'FeatureCollection',
                features: features
            });
        }
    }

    updateRoutes(centers) {
        if (!this.map || !centers || centers.length < 2) return;

        // Create route lines between consecutive centers
        const features = [];
        for (let i = 0; i < centers.length - 1; i++) {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [centers[i].lng, centers[i].lat],
                        [centers[i + 1].lng, centers[i + 1].lat]
                    ]
                }
            });
        }

        // Connect last center to first to complete the circuit
        features.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [centers[centers.length - 1].lng, centers[centers.length - 1].lat],
                    [centers[0].lng, centers[0].lat]
                ]
            }
        });

        const source = this.map.getSource('route-lines');
        if (source) {
            source.setData({
                type: 'FeatureCollection',
                features: features
            });
        }
    }

    updateMarketData(marketData) {
        if (!this.map || !this.virusState) return;

        try {
            // Update virus state with new market data
            const marketState = this.virusState.updateMarketState(marketData);
            
            // Adjust visualization based on market state
            this.map.setPaintProperty('virus-heat', 'heatmap-intensity', 
                1 + marketState.strength);
            
            this.map.setPaintProperty('virus-heat', 'heatmap-radius', 
                8 * (1 + marketState.strength * 0.5));

            // Update route lines based on market state
            this.map.setPaintProperty('route-lines', 'line-opacity',
                0.7 * marketState.strength);
            
            this.map.setPaintProperty('route-lines', 'line-width',
                2 * (1 + marketState.strength));

            // Ensure points are still visible
            if (this.currentPoints.length > 0) {
                this.updateHeatmap(this.currentPoints);
            }
        } catch (err) {
            console.error('Error updating market data:', err);
            // Don't stop animation on error, just log it
            console.warn('Market update continuing despite error');
        }
    }
}

export default LayerManager; 