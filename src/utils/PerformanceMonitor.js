class FPSCounter {
    constructor(sampleSize = 60) {
        this.sampleSize = sampleSize;
        this.frames = [];
        this.lastFrameTime = performance.now();
    }

    update() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        this.frames.push(deltaTime);
        if (this.frames.length > this.sampleSize) {
            this.frames.shift();
        }
    }

    getCurrentFPS() {
        if (this.frames.length === 0) return 0;
        const averageFrameTime = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
        return Math.round(1000 / averageFrameTime);
    }
}

class UpdateTracker {
    constructor(maxSamples = 100) {
        this.maxSamples = maxSamples;
        this.updates = [];
    }

    trackUpdate(startTime, endTime) {
        this.updates.push(endTime - startTime);
        if (this.updates.length > this.maxSamples) {
            this.updates.shift();
        }
    }

    getLatency() {
        if (this.updates.length === 0) return 0;
        return this.updates.reduce((a, b) => a + b, 0) / this.updates.length;
    }
}

class SpreadMetrics {
    constructor() {
        this.updateTimes = [];
        this.maxSamples = 100;
    }

    trackUpdate(duration) {
        this.updateTimes.push(duration);
        if (this.updateTimes.length > this.maxSamples) {
            this.updateTimes.shift();
        }
    }

    getUpdateTime() {
        if (this.updateTimes.length === 0) return 0;
        return this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length;
    }
}

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: new FPSCounter(),
            marketUpdates: new UpdateTracker(),
            spreadCalculations: new SpreadMetrics()
        };
        
        this.warningThresholds = {
            minFPS: 55,
            maxUpdateLatency: 16, // ms
            maxSpreadUpdateTime: 16 // ms
        };

        this.startMonitoring();
    }

    startMonitoring() {
        this.monitoringInterval = setInterval(() => {
            this.checkPerformance();
        }, 1000);
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }

    trackMarketUpdate(startTime, endTime) {
        this.metrics.marketUpdates.trackUpdate(startTime, endTime);
    }

    trackSpreadCalculation(duration) {
        this.metrics.spreadCalculations.trackUpdate(duration);
    }

    updateFPS() {
        this.metrics.fps.update();
    }

    checkPerformance() {
        const analysis = this.analyze();
        
        // Check for performance issues
        if (analysis.performance < this.warningThresholds.minFPS) {
            console.warn(`Low FPS detected: ${analysis.performance}`);
        }
        if (analysis.marketUpdateLatency > this.warningThresholds.maxUpdateLatency) {
            console.warn(`High market update latency: ${analysis.marketUpdateLatency}ms`);
        }
        if (analysis.spreadUpdateTime > this.warningThresholds.maxSpreadUpdateTime) {
            console.warn(`High spread calculation time: ${analysis.spreadUpdateTime}ms`);
        }

        return analysis;
    }

    analyze() {
        return {
            performance: this.metrics.fps.getCurrentFPS(),
            marketUpdateLatency: this.metrics.marketUpdates.getLatency(),
            spreadUpdateTime: this.metrics.spreadCalculations.getUpdateTime()
        };
    }
}

module.exports = {
    PerformanceMonitor,
    FPSCounter,
    UpdateTracker,
    SpreadMetrics
}; 