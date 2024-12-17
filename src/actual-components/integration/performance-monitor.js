class PerformanceMonitor {
    constructor() {
        this.metrics = {
            orderProcessing: [],
            stateUpdates: [],
            frameTime: [],
            queueSize: 0,
            lastUpdate: Date.now()
        };

        this.maxSampleSize = 100; // Keep last 100 samples for each metric
        this.enabled = true;
        this.debug = false;
    }

    measureOperation(operation, type) {
        if (!this.enabled) return operation();

        const start = performance.now();
        const result = operation();
        const duration = performance.now() - start;

        this.addMetric(type, duration);
        
        if (this.debug) {
            console.log(`[Performance] ${type}: ${duration.toFixed(2)}ms`);
        }

        return result;
    }

    addMetric(type, value) {
        if (!this.metrics[type]) return;

        this.metrics[type].push(value);
        if (this.metrics[type].length > this.maxSampleSize) {
            this.metrics[type].shift();
        }
    }

    getAverageMetric(type) {
        if (!this.metrics[type] || this.metrics[type].length === 0) return 0;
        
        const sum = this.metrics[type].reduce((a, b) => a + b, 0);
        return sum / this.metrics[type].length;
    }

    setQueueSize(size) {
        this.metrics.queueSize = size;
    }

    getMetricsSummary() {
        const now = Date.now();
        const timeSinceLastUpdate = now - this.metrics.lastUpdate;
        this.metrics.lastUpdate = now;

        return {
            orderProcessingAvg: this.getAverageMetric('orderProcessing'),
            stateUpdatesAvg: this.getAverageMetric('stateUpdates'),
            frameTimeAvg: this.getAverageMetric('frameTime'),
            currentQueueSize: this.metrics.queueSize,
            updateInterval: timeSinceLastUpdate,
            sampleCounts: {
                orderProcessing: this.metrics.orderProcessing.length,
                stateUpdates: this.metrics.stateUpdates.length,
                frameTime: this.metrics.frameTime.length
            }
        };
    }

    enableDebug() {
        this.debug = true;
    }

    disableDebug() {
        this.debug = false;
    }

    reset() {
        Object.keys(this.metrics).forEach(key => {
            if (Array.isArray(this.metrics[key])) {
                this.metrics[key] = [];
            }
        });
        this.metrics.queueSize = 0;
        this.metrics.lastUpdate = Date.now();
    }
}

export default PerformanceMonitor; 