import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ReportContainer = styled.div`
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.9);
    padding: 15px;
    border-radius: 8px;
    color: #fff;
    font-family: monospace;
    font-size: 11px;
    max-width: 300px;
    z-index: 1000;
`;

const Section = styled.div`
    margin-bottom: 10px;
    border-bottom: 1px solid #333;
    padding-bottom: 5px;
`;

const Title = styled.div`
    font-weight: bold;
    color: #66d9ef;
    margin-bottom: 5px;
`;

const MetricRow = styled.div`
    display: flex;
    justify-content: space-between;
    margin: 2px 0;
    ${props => props.alert && `color: ${props.alert === 'warning' ? '#ffb700' : '#ff4444'};`}
`;

const ToggleButton = styled.button`
    position: absolute;
    top: 10px;
    right: 10px;
    background: transparent;
    border: 1px solid #666;
    color: #fff;
    padding: 2px 6px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
    &:hover {
        background: #333;
    }
`;

const PerformanceReport = ({ marketSimulator }) => {
    const [expanded, setExpanded] = useState(false);
    const [metrics, setMetrics] = useState({
        performance: {},
        queue: {},
        memory: {},
        errors: []
    });

    useEffect(() => {
        let interval;
        if (marketSimulator) {
            interval = setInterval(() => {
                const perfMetrics = marketSimulator.getPerformanceMetrics();
                const queueMetrics = marketSimulator.messageQueue.getMetrics();
                const memoryUsage = performance.memory ? {
                    usedHeap: Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)),
                    totalHeap: Math.round(performance.memory.totalJSHeapSize / (1024 * 1024))
                } : null;

                setMetrics({
                    performance: {
                        orderProcessing: perfMetrics.orderProcessingAvg,
                        stateUpdates: perfMetrics.stateUpdatesAvg,
                        frameTime: perfMetrics.frameTimeAvg,
                        fps: Math.round(1000 / perfMetrics.frameTimeAvg)
                    },
                    queue: {
                        length: queueMetrics.queueLength,
                        processed: queueMetrics.processedCount,
                        processingTime: queueMetrics.lastProcessTime
                    },
                    memory: memoryUsage,
                    marketState: {
                        buyLevels: marketSimulator.orderBook.buyLevels.size,
                        sellLevels: marketSimulator.orderBook.sellLevels.size,
                        trades: marketSimulator.orderBook.recentTrades.length
                    }
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [marketSimulator]);

    const getAlert = (metric, value) => {
        const thresholds = {
            frameTime: { warning: 14, error: 16 },
            queueLength: { warning: 100, error: 500 },
            processingTime: { warning: 5, error: 10 }
        };

        if (!thresholds[metric]) return null;
        if (value > thresholds[metric].error) return 'error';
        if (value > thresholds[metric].warning) return 'warning';
        return null;
    };

    if (!expanded) {
        return (
            <ReportContainer style={{ padding: '5px 10px' }}>
                <MetricRow>
                    <span>FPS: {metrics.performance.fps || 0}</span>
                    <ToggleButton onClick={() => setExpanded(true)}>+</ToggleButton>
                </MetricRow>
            </ReportContainer>
        );
    }

    return (
        <ReportContainer>
            <ToggleButton onClick={() => setExpanded(false)}>-</ToggleButton>
            
            <Section>
                <Title>Performance</Title>
                <MetricRow alert={getAlert('frameTime', metrics.performance.frameTime)}>
                    <span>Frame Time:</span>
                    <span>{metrics.performance.frameTime?.toFixed(1)}ms</span>
                </MetricRow>
                <MetricRow>
                    <span>FPS:</span>
                    <span>{metrics.performance.fps || 0}</span>
                </MetricRow>
                <MetricRow>
                    <span>Order Processing:</span>
                    <span>{metrics.performance.orderProcessing?.toFixed(1)}ms</span>
                </MetricRow>
                <MetricRow>
                    <span>State Updates:</span>
                    <span>{metrics.performance.stateUpdates?.toFixed(1)}ms</span>
                </MetricRow>
            </Section>

            <Section>
                <Title>Message Queue</Title>
                <MetricRow alert={getAlert('queueLength', metrics.queue.length)}>
                    <span>Queue Length:</span>
                    <span>{metrics.queue.length}</span>
                </MetricRow>
                <MetricRow>
                    <span>Processed:</span>
                    <span>{metrics.queue.processed}</span>
                </MetricRow>
                <MetricRow alert={getAlert('processingTime', metrics.queue.processingTime)}>
                    <span>Processing Time:</span>
                    <span>{metrics.queue.processingTime?.toFixed(1)}ms</span>
                </MetricRow>
            </Section>

            <Section>
                <Title>Market State</Title>
                <MetricRow>
                    <span>Buy Levels:</span>
                    <span>{metrics.marketState?.buyLevels}</span>
                </MetricRow>
                <MetricRow>
                    <span>Sell Levels:</span>
                    <span>{metrics.marketState?.sellLevels}</span>
                </MetricRow>
                <MetricRow>
                    <span>Recent Trades:</span>
                    <span>{metrics.marketState?.trades}</span>
                </MetricRow>
            </Section>

            {metrics.memory && (
                <Section>
                    <Title>Memory</Title>
                    <MetricRow>
                        <span>Heap Usage:</span>
                        <span>{metrics.memory.usedHeap}MB / {metrics.memory.totalHeap}MB</span>
                    </MetricRow>
                </Section>
            )}
        </ReportContainer>
    );
};

export default PerformanceReport; 