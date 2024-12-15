export { default as TranslatorBridge } from './TranslatorBridge';
export { default as StateSync } from './StateSync';
export { MessageQueue, PriorityQueue } from './MessageQueue';

// Constants
export const WEBSOCKET_URL = 'ws://localhost:8006/translator';
export const DEFAULT_RECONNECT_ATTEMPTS = 5;
export const DEFAULT_RECONNECT_DELAY = 1000;
export const DEFAULT_HEARTBEAT_INTERVAL = 30000;
export const DEFAULT_QUEUE_PROCESS_INTERVAL = 100;

// Event Types
export const EVENT_TYPES = {
    STATE_CHANGED: 'stateChanged',
    STATE_ROLLBACK: 'stateRollback',
    STATE_CLEARED: 'stateCleared',
    CONNECTION_ERROR: 'connectionError',
    MESSAGE_PROCESSED: 'messageProcessed',
    MESSAGE_FAILED: 'messageFailed'
}; 