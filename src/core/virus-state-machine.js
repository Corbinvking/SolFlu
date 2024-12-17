class VirusPoint {
    constructor(position, intensity = 1.0) {
        this.position = position;
        this.intensity = intensity;
        this.age = 0;
        this.active = true;
        this.colorIntensity = intensity;
    }
}

class VirusStateMachine {
    constructor() {
        this.points = [];
        this.params = {
            intensity: 0.5,
            speed: 0.5,
            branchingFactor: 0.3,
            pattern: 'normal'
        };
        this.center = [0, 0];
        this.maxPoints = 1000;
        this.spreadRadius = 0.01; // Base radius for point spread
    }

    initialize(center, params) {
        console.log('Initializing virus at center:', center);
        this.center = center;
        this.params = { ...this.params, ...params };
        // Create initial point with position in [longitude, latitude] format
        this.points = [new VirusPoint(center, 1.0)];
    }

    update(deltaTime) {
        // Update existing points
        this.points.forEach(point => {
            point.age += deltaTime;
            
            // Decay intensity over time
            point.intensity *= Math.max(0, 1 - (deltaTime * 0.1));
            
            // Deactivate points that are too weak
            if (point.intensity < 0.1) {
                point.active = false;
            }
        });

        // Remove inactive points
        this.points = this.points.filter(p => p.active);

        // Generate new points based on pattern
        if (this.points.length < this.maxPoints) {
            this.generateNewPoints(deltaTime);
        }
    }

    generateNewPoints(deltaTime) {
        const newPoints = [];
        const spreadChance = this.params.speed * deltaTime;

        this.points.forEach(point => {
            if (Math.random() < spreadChance) {
                const angle = Math.random() * Math.PI * 2;
                const distance = this.spreadRadius * (1 + Math.random());
                
                const newPosition = [
                    point.position[0] + Math.cos(angle) * distance,
                    point.position[1] + Math.sin(angle) * distance
                ];

                // Create new point with slightly reduced intensity
                const newPoint = new VirusPoint(
                    newPosition,
                    point.intensity * this.params.intensity * 0.95
                );
                
                newPoints.push(newPoint);
            }
        });

        // Add new points up to maxPoints limit
        const availableSlots = this.maxPoints - this.points.length;
        const pointsToAdd = Math.min(newPoints.length, availableSlots);
        
        this.points.push(...newPoints.slice(0, pointsToAdd));
    }

    getPoints() {
        // Return points in the format expected by DeckGL ScatterplotLayer
        return this.points.map(p => ({
            position: p.position, // Already in [longitude, latitude] format
            colorIntensity: p.intensity,
            radius: 3
        }));
    }

    updateParams(params) {
        this.params = { ...this.params, ...params };
        
        // Adjust behavior based on pattern
        switch (this.params.pattern) {
            case 'explosive':
                this.spreadRadius *= 1.5;
                break;
            case 'contracting':
                this.spreadRadius *= 0.7;
                break;
            case 'balanced':
                this.spreadRadius = 0.01;
                break;
            default:
                this.spreadRadius = 0.01;
        }
    }

    boostSpread(multiplier) {
        this.params.speed *= multiplier;
        this.params.intensity *= multiplier;
        console.log('Boosted virus spread:', this.params);
    }

    suppressSpread(multiplier) {
        this.params.speed *= multiplier;
        this.params.intensity *= multiplier;
        console.log('Suppressed virus spread:', this.params);
    }
}

export default VirusStateMachine; 