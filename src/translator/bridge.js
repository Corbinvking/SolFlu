const WebSocket = require('ws');
const EventEmitter = require('events');

class TranslatorBridge extends EventEmitter {
    constructor(options = {}) {
        super();
        this.url = options.url || 'ws://127.0.0.1:8006/translator';
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
        this.reconnectDelay = options.reconnectDelay || 1000;
        this.heartbeatInterval = options.heartbeatInterval || 30000;
        this.subscriptions = new Map();
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);
                
                this.ws.on('open', () => {
                    console.log('Connected to WebSocket server');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    resolve(true);
                });

                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Error parsing message:', error);
                    }
                });

                this.ws.on('close', () => {
                    console.log('WebSocket connection closed');
                    this.isConnected = false;
                    this.handleDisconnect();
                });

                this.ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    if (!this.isConnected) {
                        reject(error);
                    }
                });
            } catch (error) {
                console.error('Failed to initialize WebSocket:', error);
                reject(error);
            }
        });
    }

    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                this.send({
                    type: 'heartbeat',
                    timestamp: new Date().toISOString()
                });
            }
        }, this.heartbeatInterval);
    }

    async handleDisconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.initialize(), this.reconnectDelay);
        }
    }

    handleMessage(message) {
        if (message.type && this.subscriptions.has(message.type)) {
            const callbacks = this.subscriptions.get(message.type);
            callbacks.forEach(callback => callback(message));
        }
        this.emit('message', message);
    }

    subscribe(type, callback) {
        if (!this.subscriptions.has(type)) {
            this.subscriptions.set(type, new Set());
        }
        this.subscriptions.get(type).add(callback);
    }

    unsubscribe(type, callback) {
        if (this.subscriptions.has(type)) {
            this.subscriptions.get(type).delete(callback);
        }
    }

    async handleMarketUpdate(marketData) {
        return this.send({
            type: 'marketUpdate',
            timestamp: new Date().toISOString(),
            data: {
                marketMetrics: marketData
            }
        });
    }

    async send(message) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Not connected to WebSocket server'));
                return;
            }

            try {
                this.ws.send(JSON.stringify(message), (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async cleanup() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        
        if (this.ws) {
            this.ws.close();
        }
        
        this.subscriptions.clear();
        this.isConnected = false;
    }
}

module.exports = { TranslatorBridge }; 