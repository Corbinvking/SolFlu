class PerformanceMonitor {
    constructor() {
        this.metrics = {
            orderProcessing: [],
            stateUpdates: [],
            frameTime: [],
            virusPoints: [],
            marketMetrics: [],
            renderTime: [],
            memoryUsage: [],
            queueSize: 0,
            lastUpdate: Date.now(),
            fps: [],
            coverage: [],
            layerUpdates: []
        };

        this.maxSampleSize = 100; // Keep last 100 samples for each metric
        this.enabled = true;
        this.debug = false;
        this.startTime = Date.now();

        // Initialize performance tracking
        if (typeof window !== 'undefined' && window.performance) {
            this.performanceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.addMetric('renderTime', entry.duration);
                }
            });
            this.performanceObserver.observe({ entryTypes: ['measure'] });
        }
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

        // Calculate FPS for frame time metrics
        if (type === 'frameTime' && value > 0) {
            const fps = 1000 / value;
            this.addMetric('fps', fps);
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

    updateVirusMetrics(points, coverage) {
        this.addMetric('virusPoints', points.length);
        this.addMetric('coverage', coverage);
    }

    updateMarketMetrics(marketState) {
        this.addMetric('marketMetrics', {
            marketCap: marketState.marketCap,
            volatility: marketState.volatility,
            timestamp: Date.now()
        });
    }

    updateLayerMetrics(layerCount, renderTime) {
        this.addMetric('layerUpdates', {
            count: layerCount,
            renderTime: renderTime,
            timestamp: Date.now()
        });
    }

    getMetricsSummary() {
        const now = Date.now();
        const timeSinceLastUpdate = now - this.metrics.lastUpdate;
        this.metrics.lastUpdate = now;

        const fps = this.getAverageMetric('fps');
        const coverage = this.getAverageMetric('coverage');
        const lastMarketMetrics = this.metrics.marketMetrics[this.metrics.marketMetrics.length - 1] || {};

        return {
            fps: Math.round(fps),
            orderProcessingAvg: this.getAverageMetric('orderProcessing'),
            stateUpdatesAvg: this.getAverageMetric('stateUpdates'),
            frameTimeAvg: this.getAverageMetric('frameTime'),
            renderTimeAvg: this.getAverageMetric('renderTime'),
            currentQueueSize: this.metrics.queueSize,
            updateInterval: timeSinceLastUpdate,
            virusPoints: this.getAverageMetric('virusPoints'),
            coverage: coverage,
            marketCap: lastMarketMetrics.marketCap,
            volatility: lastMarketMetrics.volatility,
            uptime: Math.floor((now - this.startTime) / 1000),
            memoryUsage: this.getMemoryUsage(),
            sampleCounts: {
                orderProcessing: this.metrics.orderProcessing.length,
                stateUpdates: this.metrics.stateUpdates.length,
                frameTime: this.metrics.frameTime.length,
                virusPoints: this.metrics.virusPoints.length,
                marketMetrics: this.metrics.marketMetrics.length
            }
        };
    }

    getMemoryUsage() {
        if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
            return {
                usedJSHeapSize: window.performance.memory.usedJSHeapSize,
                totalJSHeapSize: window.performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    enableDebug() {
        this.debug = true;
        console.log('[Performance Monitor] Debug mode enabled');
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
        this.startTime = Date.now();
    }

    getLastUpdateDuration() {
        const frameTimeSamples = this.metrics.frameTime;
        return frameTimeSamples.length > 0 ? frameTimeSamples[frameTimeSamples.length - 1] : 0;
    }

    getAverageUpdateDuration() {
        return this.getAverageMetric('frameTime');
    }

    getPeakUpdateDuration() {
        const frameTimeSamples = this.metrics.frameTime;
        return frameTimeSamples.length > 0 ? Math.max(...frameTimeSamples) : 0;
    }

    getPerformanceReport() {
        const summary = this.getMetricsSummary();
        return {
            fps: summary.fps,
            memoryUsage: summary.memoryUsage,
            metrics: {
                orderProcessing: `${summary.orderProcessingAvg.toFixed(2)}ms`,
                stateUpdates: `${summary.stateUpdatesAvg.toFixed(2)}ms`,
                frameTime: `${summary.frameTimeAvg.toFixed(2)}ms`,
                renderTime: `${summary.renderTimeAvg.toFixed(2)}ms`
            },
            virus: {
                points: Math.round(summary.virusPoints),
                coverage: `${(summary.coverage * 100).toFixed(1)}%`
            },
            market: {
                marketCap: summary.marketCap ? `$${summary.marketCap.toLocaleString()}` : 'N/A',
                volatility: summary.volatility ? `${(summary.volatility * 100).toFixed(1)}%` : 'N/A'
            },
            system: {
                queueSize: summary.currentQueueSize,
                uptime: `${Math.floor(summary.uptime / 60)}m ${summary.uptime % 60}s`,
                updateInterval: `${summary.updateInterval.toFixed(0)}ms`
            }
        };
    }
}

export default PerformanceMonitor; 