class MessageQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.batchSize = 5; // Smaller batch size for more frequent updates
        this.processInterval = 16; // ~60fps
        this.handlers = new Map();
        this.metrics = {
            queueLength: 0,
            processedCount: 0,
            lastProcessTime: 0,
            processingTime: 0
        };
        this.processingTimer = null;
    }

    enqueue(type, data, priority = 1) {
        this.queue.push({
            type,
            data,
            priority,
            timestamp: Date.now()
        });

        this.metrics.queueLength = this.queue.length;

        // Start processing immediately if not already processing
        if (!this.processing) {
            this.processQueue();
        }
    }

    subscribe(type, handler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type).add(handler);
    }

    unsubscribe(type, handler) {
        if (this.handlers.has(type)) {
            this.handlers.get(type).delete(handler);
        }
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const startTime = performance.now();

        try {
            // Sort only if we have high priority messages
            if (this.queue.some(msg => msg.priority > 1)) {
                this.queue.sort((a, b) => {
                    if (b.priority !== a.priority) return b.priority - a.priority;
                    return a.timestamp - b.timestamp;
                });
            }

            // Process batch
            const batch = this.queue.splice(0, this.batchSize);
            
            const processPromises = batch.map(async message => {
                const handlers = this.handlers.get(message.type);
                if (handlers) {
                    return Promise.all(
                        Array.from(handlers).map(handler => 
                            handler(message.data).catch(error => 
                                console.error(`Error processing message of type ${message.type}:`, error)
                            )
                        )
                    );
                }
            });

            await Promise.all(processPromises);
            this.metrics.processedCount += batch.length;

        } catch (error) {
            console.error('Error in message queue processing:', error);
        } finally {
            this.metrics.lastProcessTime = performance.now() - startTime;
            this.metrics.processingTime += this.metrics.lastProcessTime;
            this.metrics.queueLength = this.queue.length;
            this.processing = false;

            // Schedule next batch if queue not empty
            if (this.queue.length > 0) {
                this.processingTimer = setTimeout(() => this.processQueue(), this.processInterval);
            }
        }
    }

    getMetrics() {
        return {
            queueLength: this.metrics.queueLength,
            processedCount: this.metrics.processedCount,
            lastProcessTime: this.metrics.lastProcessTime,
            processingTime: this.metrics.processingTime,
            isProcessing: this.processing
        };
    }

    clear() {
        this.queue = [];
        this.metrics.queueLength = 0;
        if (this.processingTimer) {
            clearTimeout(this.processingTimer);
            this.processingTimer = null;
        }
        this.processing = false;
    }

    size() {
        return this.queue.length;
    }
}

export default MessageQueue; 