import { IconLayer, PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';

class RouteSystem {
    constructor() {
        this.vehicles = [];
        this.routes = [];
        this.vehicleLayer = null;
        this.pathLayer = null;
        this.endpointLayer = null;
        this.labelLayer = null;
        this.setupIconAtlas();
    }

    setupIconAtlas() {
        // Create a canvas for the icon atlas
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 64, 32);

        // Draw plane icon (arrow-like triangle)
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        // Main triangle
        ctx.beginPath();
        ctx.moveTo(16, 6);     // top point
        ctx.lineTo(4, 26);     // bottom left
        ctx.lineTo(28, 26);    // bottom right
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Small wings
        ctx.beginPath();
        ctx.moveTo(12, 20);    // left wing
        ctx.lineTo(20, 20);    // center
        ctx.lineTo(16, 14);    // top
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw ship icon (boat-like shape)
        ctx.beginPath();
        ctx.moveTo(36, 20);    // bottom left
        ctx.lineTo(42, 8);     // front point
        ctx.lineTo(56, 8);     // top right
        ctx.lineTo(60, 20);    // bottom right
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        console.log('Enhanced icon atlas created');
        this.iconAtlas = canvas;
        this.createLayers();
    }

    createPathLayer() {
        return new PathLayer({
            id: 'route-paths',
            data: this.routes,
            pickable: false,
            widthScale: 1,
            widthMinPixels: 2,
            widthMaxPixels: 4,
            getPath: d => [d.start, d.end],
            getColor: [255, 255, 255],  // White color for all routes
            getWidth: 2,
            getDashArray: [6, 4],  // Dotted pattern for all routes
            dashJustified: true,
            parameters: {
                depthTest: false
            }
        });
    }

    createVehicleLayer() {
        if (!this.iconAtlas) {
            console.log('No icon atlas available');
            return null;
        }

        // Debug vehicle positions
        this.vehicles.forEach(v => {
            const pos = this.getVehiclePosition(v);
            console.log(`${v.type} position:`, pos);
        });

        return new IconLayer({
            id: 'vehicle-layer',
            data: this.vehicles,
            iconAtlas: this.iconAtlas,
            iconMapping: {
                plane: { x: 0, y: 0, width: 32, height: 32, mask: true, anchorY: 16, anchorX: 16 },
                ship: { x: 32, y: 0, width: 32, height: 32, mask: true, anchorY: 16, anchorX: 16 }
            },
            getIcon: d => d.type,
            getPosition: d => this.getVehiclePosition(d),
            getSize: d => d.type === 'plane' ? 32 : 28,
            getAngle: d => {
                const [fromPoint, toPoint] = d.isReturning ? [d.end, d.start] : [d.start, d.end];
                const angle = Math.atan2(
                    toPoint[1] - fromPoint[1],
                    toPoint[0] - fromPoint[0]
                ) * 180 / Math.PI;
                return angle;
            },
            sizeScale: 1,
            sizeUnits: 'pixels',
            sizeMinPixels: 16,
            sizeMaxPixels: 40,
            pickable: false,
            parameters: {
                depthTest: false
            },
            updateTriggers: {
                getPosition: [Date.now()],  // Force position updates
                getAngle: [Date.now()]      // Force angle updates
            }
        });
    }

    createEndpointLayer() {
        // Create endpoint data with labels
        const endpoints = [];
        this.routes.forEach((route, index) => {
            const prefix = route.type === 'plane' ? ['A', 'B'] : ['C', 'D'];
            endpoints.push(
                {
                    position: route.start,
                    label: `${prefix[0]}${index + 1}`,
                    routeId: index,
                    isStart: true,
                    type: route.type
                },
                {
                    position: route.end,
                    label: `${prefix[1]}${index + 1}`,
                    routeId: index,
                    isStart: false,
                    type: route.type
                }
            );
        });

        // Create the dots
        this.endpointLayer = new ScatterplotLayer({
            id: 'route-endpoints',
            data: endpoints,
            pickable: true,
            opacity: 0.8,
            stroked: true,
            filled: true,
            radiusScale: 1,
            radiusMinPixels: 6,
            radiusMaxPixels: 12,
            lineWidthMinPixels: 2,
            getPosition: d => d.position,
            getFillColor: d => d.type === 'plane' ? [255, 165, 0] : [0, 191, 255],  // Orange for planes, Blue for ships
            getLineColor: [255, 255, 255],
            getRadius: 8,
            onClick: (info) => {
                if (info.object) {
                    console.log('Clicked endpoint:', info.object.label);
                    // We'll add interaction handling here
                }
            },
            parameters: {
                depthTest: false
            }
        });

        // Create labels
        this.labelLayer = new TextLayer({
            id: 'endpoint-labels',
            data: endpoints,
            pickable: false,
            getPosition: d => d.position,
            getText: d => d.label,
            getSize: 14,
            getColor: [255, 255, 255],
            getAngle: 0,
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'center',
            parameters: {
                depthTest: false
            }
        });
    }

    createLayers() {
        this.pathLayer = this.createPathLayer();
        this.vehicleLayer = this.createVehicleLayer();
        this.createEndpointLayer();
    }

    getVehiclePosition(vehicle) {
        const { start, end, progress, isReturning } = vehicle;
        // If returning, swap start and end points
        const [fromPoint, toPoint] = isReturning ? [end, start] : [start, end];
        
        // Calculate interpolated position
        const pos = [
            fromPoint[0] + (toPoint[0] - fromPoint[0]) * progress,
            fromPoint[1] + (toPoint[1] - fromPoint[1]) * progress
        ];

        return pos;
    }

    update(deltaTime) {
        const now = Date.now();
        let needsUpdate = false;
        
        // Update vehicle positions
        this.vehicles.forEach(vehicle => {
            const oldProgress = vehicle.progress;
            // Update progress based on direction
            const scaledDelta = deltaTime * vehicle.speed;
            vehicle.progress += scaledDelta;

            // Check if we've reached an endpoint
            if (vehicle.progress >= 1) {
                // Reverse direction
                vehicle.isReturning = !vehicle.isReturning;
                vehicle.progress = 0;
                needsUpdate = true;
                
                // Adjust speed slightly for variety
                vehicle.speed *= 0.9 + Math.random() * 0.2; // Random speed variation ±10%
                console.log(`Vehicle ${vehicle.type} reversed direction, new speed:`, vehicle.speed);
            }

            // If progress changed significantly, mark for update
            if (Math.abs(oldProgress - vehicle.progress) > 0.001) {
                needsUpdate = true;
            }

            // Update last update time
            vehicle.lastUpdate = now;
        });

        // Only recreate layers if there were significant updates
        if (needsUpdate) {
            this.createLayers();
        }
    }

    getLayers() {
        const layers = [];
        if (this.pathLayer) layers.push(this.pathLayer);
        if (this.endpointLayer) layers.push(this.endpointLayer);
        if (this.labelLayer) layers.push(this.labelLayer);
        if (this.vehicleLayer) layers.push(this.vehicleLayer);
        return layers;
    }

    addRoute(type, start, end, speed = 0.1) {
        const routeId = this.routes.length;
        // Add route path
        this.routes.push({
            id: routeId,
            type,
            start,
            end
        });

        // Add vehicle on this route with direction tracking
        this.vehicles.push({
            type,
            start,
            end,
            progress: 0,
            speed,
            routeId,
            isReturning: false,  // Track direction
            lastUpdate: Date.now()  // For smooth animation
        });

        // Recreate layers with new route
        this.createLayers();
    }

    // Add some test routes for development
    addTestVehicles() {
        // Major air routes with different speeds
        this.addRoute(
            'plane',
            [-74.006, 40.7128], // New York
            [0.1278, 51.5074],  // London
            0.5  // Faster speed for planes
        );

        this.addRoute(
            'plane',
            [139.6917, 35.6895], // Tokyo
            [-122.4194, 37.7749], // San Francisco
            0.4
        );

        // Major shipping routes with slower speeds
        this.addRoute(
            'ship',
            [-118.2437, 34.0522], // Los Angeles
            [139.6917, 35.6895],  // Tokyo
            0.3
        );

        this.addRoute(
            'ship',
            [4.4000, 51.9000],    // Rotterdam
            [-74.006, 40.7128],   // New York
            0.25
        );

        console.log('Added test routes:', this.routes.length, 'routes');
    }

    // Method to handle endpoint interactions
    handleEndpointClick(endpointInfo) {
        const { routeId, isStart, label } = endpointInfo;
        console.log(`Clicked ${label} - ${isStart ? 'Start' : 'End'} of route ${routeId}`);
        // We can add more interaction logic here
    }
}

export default RouteSystem; 