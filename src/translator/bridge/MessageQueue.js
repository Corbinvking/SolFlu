class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(element) {
        if (this.isEmpty()) {
            this.items.push(element);
        } else {
            let added = false;
            for (let i = 0; i < this.items.length; i++) {
                if (element.priority > this.items[i].priority) {
                    this.items.splice(i, 0, element);
                    added = true;
                    break;
                }
            }
            if (!added) {
                this.items.push(element);
            }
        }
    }

    dequeue() {
        if (this.isEmpty()) {
            return null;
        }
        return this.items.shift();
    }

    isEmpty() {
        return this.items.length === 0;
    }

    peek() {
        if (this.isEmpty()) {
            return null;
        }
        return this.items[0];
    }

    size() {
        return this.items.length;
    }
}

class MessageQueue {
    constructor() {
        this.queue = new PriorityQueue();
        this.processors = new Map();
        this.isProcessing = false;
        this.maxRetries = 3;
        this.processingInterval = null;
        this.messageHistory = [];
        this.maxHistorySize = 1000;
    }

    addMessage(message, priority = 1) {
        const messageItem = {
            data: message,
            timestamp: Date.now(),
            priority,
            retries: 0,
            id: this.generateMessageId()
        };

        this.queue.enqueue(messageItem);
        this.archiveMessage(messageItem);

        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    registerProcessor(messageType, processor) {
        if (typeof processor !== 'function') {
            throw new Error('Processor must be a function');
        }
        this.processors.set(messageType, processor);
    }

    async processQueue() {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        while (!this.queue.isEmpty()) {
            const message = this.queue.dequeue();
            
            if (!message) {
                continue;
            }

            try {
                const processor = this.processors.get(message.data.type);
                
                if (processor) {
                    await processor(message.data);
                    this.updateMessageHistory(message.id, 'processed');
                } else {
                    console.warn(`No processor found for message type: ${message.data.type}`);
                    this.updateMessageHistory(message.id, 'skipped');
                }
            } catch (error) {
                console.error('Error processing message:', error);
                this.handleProcessingError(message);
            }
        }

        this.isProcessing = false;
    }

    handleProcessingError(message) {
        if (message.retries < this.maxRetries) {
            message.retries++;
            message.priority = Math.max(1, message.priority - 1); // Decrease priority for retry
            this.queue.enqueue(message);
            this.updateMessageHistory(message.id, 'retrying');
        } else {
            this.updateMessageHistory(message.id, 'failed');
            console.error(`Message processing failed after ${this.maxRetries} attempts:`, message);
        }
    }

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    archiveMessage(message) {
        this.messageHistory.push({
            id: message.id,
            timestamp: message.timestamp,
            type: message.data.type,
            priority: message.priority,
            status: 'queued'
        });

        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory.shift();
        }
    }

    updateMessageHistory(messageId, status) {
        const historyEntry = this.messageHistory.find(entry => entry.id === messageId);
        if (historyEntry) {
            historyEntry.status = status;
            historyEntry.processedAt = Date.now();
        }
    }

    getMessageHistory() {
        return [...this.messageHistory];
    }

    clearQueue() {
        while (!this.queue.isEmpty()) {
            this.queue.dequeue();
        }
    }

    getQueueStatus() {
        return {
            size: this.queue.size(),
            isProcessing: this.isProcessing,
            historySize: this.messageHistory.length
        };
    }

    startAutoProcessing(interval = 100) {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }

        this.processingInterval = setInterval(() => {
            if (!this.isProcessing && !this.queue.isEmpty()) {
                this.processQueue();
            }
        }, interval);
    }

    stopAutoProcessing() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
    }
}

module.exports = {
    MessageQueue,
    PriorityQueue
}; 