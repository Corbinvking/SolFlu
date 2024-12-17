import { IconLayer } from '@deck.gl/layers';

class RouteSystem {
    constructor() {
        this.vehicles = [];
        this.iconAtlas = null;
        this.vehicleLayer = null;
    }

    setIconAtlas(atlas) {
        this.iconAtlas = atlas;
        this.createVehicleLayer();
    }

    createVehicleLayer() {
        if (!this.iconAtlas) return null;

        return new IconLayer({
            id: 'vehicle-layer',
            data: this.vehicles,
            iconAtlas: this.iconAtlas,
            iconMapping: {
                plane: { x: 0, y: 0, width: 32, height: 32, mask: true },
                ship: { x: 32, y: 0, width: 32, height: 32, mask: true }
            },
            getIcon: d => d.type,
            getPosition: d => this.getVehiclePosition(d),
            getSize: 24,
            sizeScale: 1,
            sizeUnits: 'pixels',
            sizeMinPixels: 16,
            sizeMaxPixels: 32
        });
    }

    getVehiclePosition(vehicle) {
        const { start, end, progress } = vehicle;
        return [
            start[0] + (end[0] - start[0]) * progress,
            start[1] + (end[1] - start[1]) * progress
        ];
    }

    update(deltaTime) {
        // Update vehicle positions
        this.vehicles.forEach(vehicle => {
            vehicle.progress += (deltaTime * vehicle.speed);
            if (vehicle.progress >= 1) {
                vehicle.progress = 0;
            }
        });

        // Create a new layer with updated positions
        this.vehicleLayer = this.createVehicleLayer();
    }

    getLayers() {
        return this.vehicleLayer ? [this.vehicleLayer] : [];
    }

    addVehicle(type, start, end, speed = 0.1) {
        this.vehicles.push({
            type,
            start,
            end,
            progress: 0,
            speed
        });
    }
}

export default RouteSystem; 