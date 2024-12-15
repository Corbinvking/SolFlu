const EventEmitter = require('events');
const WebSocket = require('ws');
const { MessageQueue } = require('./MessageQueue');
const StateSync = require('./StateSync');

class TranslatorBridge {
    constructor(options = {}) {
        this.port = options.port || 8008;
        this.socket = null;
        this.messageQueue = new MessageQueue();
        this.stateSync = new StateSync();
        this.eventEmitter = new EventEmitter();
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        this.lastHeartbeat = Date.now();
        this.subscriptions = new Map();
        this._pendingSubscriptions = null;
        this._pendingEventEmitterSubscriptions = null;
        this.isReconnecting = false;
        this.messageCount = 0;
    }

    async initialize() {
        try {
            await this.setupSocketConnection();
            await this.initializeStateSync();
            this.startHeartbeat();
            
            // Wait for connection to stabilize
            await new Promise(resolve => setTimeout(resolve, 200));
            
            return true;
        } catch (error) {
            console.error('Failed to initialize TranslatorBridge:', error);
            return false;
        }
    }

    async setupSocketConnection() {
        return new Promise((resolve, reject) => {
            try {
                if (this.socket) {
                    this.socket.removeAllListeners();
                    this.socket.close();
                    this.socket = null;
                }

                console.log('Creating WebSocket connection...');
                this.socket = new WebSocket(`ws://127.0.0.1:${this.port}/translator`);
                
                let connectionTimeout = setTimeout(() => {
                    if (!this.isConnected) {
                        console.error('Connection timeout, closing socket...');
                        this.socket.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 5000);

                this.socket.on('open', async () => {
                    console.log('WebSocket connection opened');
                    clearTimeout(connectionTimeout);
                    
                    // Setup message handler
                    this.setupMessageHandler();
                    
                    // Mark as connected
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 1000;
                    
                    console.log('TranslatorBridge: WebSocket connection established');
                    resolve();
                });

                this.socket.on('close', (code, reason) => {
                    console.log(`WebSocket connection closed: ${code} - ${reason}`);
                    clearTimeout(connectionTimeout);
                    this.isConnected = false;
                    console.log(`TranslatorBridge: WebSocket closed with code ${code}`);
                    this.handleDisconnection();
                });

                this.socket.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    clearTimeout(connectionTimeout);
                    console.error('TranslatorBridge: WebSocket error:', error);
                    if (!this.isConnected) {
                        reject(error);
                    }
                });
            } catch (error) {
                console.error('Error setting up WebSocket:', error);
                clearTimeout(connectionTimeout);
                reject(error);
            }
        });
    }

    setupMessageHandler() {
        if (!this.socket) return;
        
        // Store bound handler for later removal
        this.boundMessageHandler = (data) => {
            try {
                this.handleIncomingMessage(data.toString());
            } catch (error) {
                console.error('Error handling message:', error);
                this.eventEmitter.emit('error', {
                    type: 'messageError',
                    error: error.message
                });
            }
        };
        
        // Remove any existing handlers
        this.socket.removeAllListeners('message');
        
        // Add new handler
        this.socket.on('message', this.boundMessageHandler);
    }

    async initializeStateSync() {
        await this.stateSync.initialize();
        this.stateSync.on('stateChanged', (diff) => {
            this.eventEmitter.emit('stateChanged', diff);
        });
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.sendHeartbeat();
            }
        }, 30000); // Send heartbeat every 30 seconds
    }

    async handleMarketUpdate(data) {
        try {
            const translatedData = this.translateMarketData(data);
            if (!this.isConnected) {
                await this.setupSocketConnection();
            }
            
            const message = {
                type: 'marketUpdate',
                data: translatedData,
                sequence: data.sequence
            };
            
            await this.sendMessage(message);
            this.stateSync.update(translatedData);
            
            // Don't notify subscribers here, let the WebSocket message handle it
            return translatedData;
        } catch (error) {
            console.error('Error handling market update:', error);
            this.eventEmitter.emit('error', {
                type: 'marketUpdate',
                error: error.message
            });
            throw error;
        }
    }

    translateMarketData(data) {
        // Ensure consistent format with handleIncomingMessage
        return {
            marketMetrics: {
                price: data.price || 0,
                volume: data.volume || 0,
                marketCap: data.marketCap || 0,
                volatility: data.volatility || 0
            },
            sequence: data.sequence,
            timestamp: Date.now()
        };
    }

    notifySubscribers(eventType, data) {
        const callbacks = this.subscriptions.get(eventType);
        if (!callbacks || callbacks.size === 0) {
            return;
        }

        console.log(`Notifying ${callbacks.size} subscribers for ${eventType}`);
        
        // Create a copy of the callbacks to avoid modification during iteration
        const callbacksArray = Array.from(callbacks);
        
        // Ensure immediate execution of callbacks
        setImmediate(() => {
            for (const callback of callbacksArray) {
                try {
                    if (callback && typeof callback === 'function') {
                        callback(data);
                    }
                } catch (error) {
                    console.error(`Error in subscriber callback for ${eventType}:`, error);
                    this.eventEmitter.emit('error', {
                        type: 'callbackError',
                        error: error.message,
                        eventType
                    });
                }
            }
        });
    }

    handleDisconnection() {
        if (!this.socket || this.reconnectTimeout || this.isReconnecting) {
            return;
        }

        this.isConnected = false;
        this.isReconnecting = true;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log(`Attempting reconnection in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
            
            // Store direct subscriptions before cleanup
            if (!this._pendingSubscriptions) {
                // Create a deep copy of subscriptions
                this._pendingSubscriptions = new Map();
                for (const [eventType, callbacks] of this.subscriptions.entries()) {
                    this._pendingSubscriptions.set(eventType, new Set(callbacks));
                }
                console.log(`Backed up ${this._pendingSubscriptions.size} subscription types`);
            }

            // Store event emitter subscriptions
            if (!this._pendingEventEmitterSubscriptions) {
                this._pendingEventEmitterSubscriptions = new Map();
                const eventTypes = ['marketUpdate', 'error', 'stateChanged', 'messageProcessed'];
                for (const eventType of eventTypes) {
                    const listeners = this.eventEmitter.listeners(eventType);
                    if (listeners.length > 0) {
                        this._pendingEventEmitterSubscriptions.set(eventType, listeners);
                        console.log(`Backing up ${listeners.length} event emitter listeners for ${eventType}`);
                    }
                }
            }
            
            this.reconnectTimeout = setTimeout(async () => {
                this.reconnectAttempts++;
                try {
                    // Clear existing socket
                    if (this.socket) {
                        this.socket.removeAllListeners();
                        this.socket.close();
                        this.socket = null;
                    }
                    
                    // Clear current subscriptions but keep the backup
                    this.subscriptions.clear();
                    this.eventEmitter.removeAllListeners();
                    
                    // Reconnect
                    const success = await this.initialize();
                    if (!success) {
                        throw new Error('Failed to initialize during reconnection');
                    }
                    
                    // Wait for connection to stabilize
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Restore subscriptions from backup
                    if (this._pendingSubscriptions) {
                        // Restore each subscription with its callbacks
                        for (const [eventType, callbacks] of this._pendingSubscriptions.entries()) {
                            if (!this.subscriptions.has(eventType)) {
                                this.subscriptions.set(eventType, new Set());
                            }
                            for (const callback of callbacks) {
                                this.subscriptions.get(eventType).add(callback);
                            }
                        }
                        console.log('Restored subscriptions after reconnection');
                        this._pendingSubscriptions = null;
                    }
                    
                    // Restore event emitter subscriptions
                    if (this._pendingEventEmitterSubscriptions) {
                        for (const [eventType, listeners] of this._pendingEventEmitterSubscriptions.entries()) {
                            for (const listener of listeners) {
                                this.eventEmitter.on(eventType, listener);
                            }
                        }
                        this._pendingEventEmitterSubscriptions = null;
                        console.log('Restored event emitter subscriptions');
                    }
                    
                    // Wait for subscriptions to be fully restored
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    this.reconnectTimeout = null;
                    this.isReconnecting = false;
                    
                    // Emit reconnected event
                    this.eventEmitter.emit('reconnected');
                } catch (error) {
                    console.error('Reconnection attempt failed:', error);
                    this.isReconnecting = false;
                    this.handleDisconnection();
                }
            }, this.reconnectDelay);
            
            // Exponential backoff
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        } else {
            console.error('Max reconnection attempts reached');
            this._pendingSubscriptions = null;
            this._pendingEventEmitterSubscriptions = null;
            this.isReconnecting = false;
            this.cleanup();
        }
    }

    handleIncomingMessage(data) {
        try {
            const parsedData = JSON.parse(data);
            console.log('Received message:', parsedData.type);
            
            if (parsedData.type === 'error') {
                this.eventEmitter.emit('error', parsedData);
                return;
            }
            
            if (parsedData.type === 'heartbeat') {
                this.lastHeartbeat = Date.now();
                return;
            }

            // Add sequence number if not present
            if (!parsedData.sequence) {
                parsedData.sequence = this.messageCount++;
            }

            if (parsedData.type === 'marketUpdate') {
                // Extract and normalize the market data
                const marketData = parsedData.data || parsedData;
                console.log('Processing market update:', marketData);
                
                // Format response data to match test expectations
                const response = {
                    type: 'marketUpdate',
                    data: {
                        marketMetrics: marketData.marketMetrics || {
                            price: marketData.price || 0,
                            volume: marketData.volume || 0,
                            marketCap: marketData.marketCap || 0,
                            volatility: marketData.volatility || 0
                        },
                        sequence: parsedData.sequence
                    },
                    timestamp: Date.now(),
                    sequence: parsedData.sequence
                };
                
                // Always notify subscribers during message processing
                this.notifySubscribers('marketUpdate', response);
                this.eventEmitter.emit('marketUpdate', response);
                
                return;
            }

            // Queue non-market update messages
            this.messageQueue.addMessage(parsedData, parsedData.priority || 1);
            
            // Process message queue synchronously
            this.processMessageQueue();
        } catch (error) {
            console.error('Error handling incoming message:', error);
            this.eventEmitter.emit('error', {
                type: 'messageError',
                error: error.message
            });
        }
    }

    processMessageQueue() {
        while (!this.messageQueue.isEmpty()) {
            const nextMessage = this.messageQueue.getNextMessage();
            if (nextMessage) {
                const response = {
                    type: nextMessage.type,
                    data: nextMessage.data,
                    timestamp: Date.now(),
                    sequence: nextMessage.sequence || this.messageCount++
                };
                
                // Always notify subscribers during message processing
                this.notifySubscribers(nextMessage.type, response);
                this.eventEmitter.emit(nextMessage.type, response);
                
                // Emit messageProcessed event for testing
                this.eventEmitter.emit('messageProcessed', response);
            }
        }
    }

    sendHeartbeat() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
        }
    }

    // Public API methods
    subscribe(eventType, callback) {
        if (!this.subscriptions.has(eventType)) {
            this.subscriptions.set(eventType, new Set());
        }
        
        // Store the original callback directly
        this.subscriptions.get(eventType).add(callback);
        console.log(`Subscribed to ${eventType}. Active callbacks: ${this.subscriptions.get(eventType).size}`);
        
        // Return unsubscribe function
        return () => {
            console.log(`Unsubscribing from ${eventType}`);
            if (this.subscriptions.has(eventType)) {
                this.subscriptions.get(eventType).delete(callback);
                if (this.subscriptions.get(eventType).size === 0) {
                    this.subscriptions.delete(eventType);
                }
                console.log(`Unsubscribed from ${eventType}. Remaining callbacks: ${
                    this.subscriptions.has(eventType) ? this.subscriptions.get(eventType).size : 0
                }`);
            }
        };
    }

    async sendMessage(message) {
        if (!this.isConnected) {
            throw new Error('Not connected to translator service');
        }
        
        return new Promise((resolve, reject) => {
            try {
                this.socket.send(JSON.stringify(message));
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    async cleanup() {
        return new Promise((resolve) => {
            const cleanupComplete = () => {
                if (this.heartbeatInterval) {
                    clearInterval(this.heartbeatInterval);
                    this.heartbeatInterval = null;
                }

                if (this.reconnectTimeout) {
                    clearTimeout(this.reconnectTimeout);
                    this.reconnectTimeout = null;
                }

                this.isConnected = false;
                this.isReconnecting = false;
                this.messageCount = 0;
                
                // Clear event handlers
                if (this.socket && this.boundMessageHandler) {
                    this.socket.removeListener('message', this.boundMessageHandler);
                }
                this.boundMessageHandler = null;
                
                // Clear event emitter unless we're in reconnection
                if (!this._pendingEventEmitterSubscriptions) {
                    this.eventEmitter.removeAllListeners();
                }
                
                // Clear subscriptions unless we're in reconnection
                if (!this._pendingSubscriptions) {
                    this.subscriptions.clear();
                }
                
                resolve();
            };

            if (this.socket) {
                const socket = this.socket;
                this.socket = null; // Clear reference first
                
                socket.removeAllListeners();
                socket.once('close', cleanupComplete);
                
                try {
                    socket.close(1000, 'Normal closure');
                } catch (error) {
                    console.error('Error during socket close:', error);
                    cleanupComplete();
                }

                // Ensure cleanup completes even if close event doesn't fire
                setTimeout(cleanupComplete, 100);
            } else {
                cleanupComplete();
            }
        });
    }
}

module.exports = TranslatorBridge; 