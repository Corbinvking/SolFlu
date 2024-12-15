const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

class WebSocketMonitor {
    constructor() {
        this.stats = {
            connections: 0,
            messagesReceived: 0,
            messagesSent: 0,
            errors: 0,
            latencies: [],
            startTime: Date.now()
        };

        this.logFile = path.join(__dirname, '../logs/websocket-monitor.log');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} - ${message}\n`;
        
        console.log(message);
        fs.appendFileSync(this.logFile, logMessage);
    }

    calculateStats() {
        const uptime = (Date.now() - this.stats.startTime) / 1000; // in seconds
        const avgLatency = this.stats.latencies.length > 0
            ? this.stats.latencies.reduce((a, b) => a + b, 0) / this.stats.latencies.length
            : 0;

        return {
            uptime: uptime.toFixed(2) + 's',
            connections: this.stats.connections,
            messagesReceived: this.stats.messagesReceived,
            messagesSent: this.stats.messagesSent,
            errors: this.stats.errors,
            avgLatency: avgLatency.toFixed(2) + 'ms',
            messagesPerSecond: (this.stats.messagesReceived / uptime).toFixed(2)
        };
    }

    startMonitoring() {
        const ws = new WebSocket('ws://localhost:8003/translator');

        ws.on('open', () => {
            this.log('Connected to WebSocket server');
            this.stats.connections++;
            this.sendTestMessages(ws);
        });

        ws.on('message', (data) => {
            this.stats.messagesReceived++;
            try {
                const message = JSON.parse(data);
                if (message.type === 'test_response') {
                    const latency = Date.now() - message.timestamp;
                    this.stats.latencies.push(latency);
                }
            } catch (error) {
                this.log(`Error parsing message: ${error.message}`);
            }
        });

        ws.on('error', (error) => {
            this.stats.errors++;
            this.log(`WebSocket error: ${error.message}`);
        });

        ws.on('close', () => {
            this.log('Connection closed');
            setTimeout(() => this.startMonitoring(), 5000);
        });

        // Print stats every 10 seconds
        setInterval(() => {
            const stats = this.calculateStats();
            this.log('Performance Stats:');
            Object.entries(stats).forEach(([key, value]) => {
                this.log(`  ${key}: ${value}`);
            });
        }, 10000);
    }

    async sendTestMessages(ws) {
        const sendMessage = () => {
            if (ws.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'test',
                    timestamp: Date.now(),
                    data: {
                        price: Math.random() * 1000,
                        volume: Math.random() * 1000000,
                        marketCap: Math.random() * 10000000,
                        volatility: Math.random()
                    }
                };

                ws.send(JSON.stringify(message));
                this.stats.messagesSent++;
            }
        };

        // Send a message every second
        setInterval(sendMessage, 1000);
    }
}

// Start monitoring
const monitor = new WebSocketMonitor();
monitor.startMonitoring();

// Handle process termination
process.on('SIGINT', () => {
    const stats = monitor.calculateStats();
    monitor.log('Final Stats:');
    Object.entries(stats).forEach(([key, value]) => {
        monitor.log(`  ${key}: ${value}`);
    });
    process.exit(0);
}); 