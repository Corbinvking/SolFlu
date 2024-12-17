export class AnimationController {
    constructor() {
        this.isRunning = true;
        this.lastUpdate = performance.now();
        this.callbacks = new Set();
    }

    addUpdateCallback(callback) {
        this.callbacks.add(callback);
    }

    removeUpdateCallback(callback) {
        this.callbacks.delete(callback);
    }

    update(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = (timestamp - this.lastUpdate) / 1000;
        this.lastUpdate = timestamp;

        this.callbacks.forEach(callback => {
            try {
                callback(deltaTime);
            } catch (error) {
                console.error('Error in animation callback:', error);
            }
        });
    }

    start() {
        this.isRunning = true;
        this.lastUpdate = performance.now();
    }

    stop() {
        this.isRunning = false;
    }

    cleanup() {
        this.stop();
        this.callbacks.clear();
    }
}

export default AnimationController; 