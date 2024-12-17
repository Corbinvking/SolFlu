import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Panel = styled.div`
    position: fixed;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    padding: 15px;
    border-radius: 8px;
    color: white;
    font-family: monospace;
    z-index: 1000;
    max-width: 200px;
`;

const Button = styled.button`
    background: #2c3e50;
    color: white;
    border: none;
    padding: 8px 12px;
    margin: 5px;
    border-radius: 4px;
    cursor: pointer;
    &:hover {
        background: #34495e;
    }
`;

const MetricsDisplay = styled.div`
    margin-top: 10px;
    font-size: 12px;
    border-top: 1px solid #666;
    padding-top: 10px;
`;

const MetricRow = styled.div`
    display: flex;
    justify-content: space-between;
    margin: 2px 0;
`;

const ButtonContainer = styled.div`
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
`;

const DevPanel = ({ onVirusBoost, onVirusSuppress, onResetSimulation, marketSimulator }) => {
    const [metrics, setMetrics] = useState(null);
    const [showMetrics, setShowMetrics] = useState(false);

    useEffect(() => {
        let interval;
        if (showMetrics && marketSimulator) {
            interval = setInterval(() => {
                const currentMetrics = marketSimulator.getPerformanceMetrics();
                const queueMetrics = marketSimulator.messageQueue.getMetrics();
                setMetrics({
                    ...currentMetrics,
                    queueMetrics
                });
            }, 100);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [showMetrics, marketSimulator]);

    const toggleMetrics = () => {
        setShowMetrics(!showMetrics);
        if (!showMetrics && marketSimulator) {
            marketSimulator.enablePerformanceDebug();
        } else if (marketSimulator) {
            marketSimulator.disablePerformanceDebug();
        }
    };

    return (
        <Panel>
            <ButtonContainer>
                <Button onClick={onVirusBoost}>Boost</Button>
                <Button onClick={onVirusSuppress}>Suppress</Button>
                <Button onClick={onResetSimulation}>Reset</Button>
                <Button onClick={toggleMetrics}>
                    {showMetrics ? 'Hide Stats' : 'Show Stats'}
                </Button>
            </ButtonContainer>

            {showMetrics && metrics && (
                <MetricsDisplay>
                    <MetricRow>
                        <span>Orders:</span>
                        <span>{metrics.orderProcessingAvg.toFixed(1)}ms</span>
                    </MetricRow>
                    <MetricRow>
                        <span>Updates:</span>
                        <span>{metrics.stateUpdatesAvg.toFixed(1)}ms</span>
                    </MetricRow>
                    <MetricRow>
                        <span>Frame:</span>
                        <span>{metrics.frameTimeAvg.toFixed(1)}ms</span>
                    </MetricRow>
                    <MetricRow>
                        <span>Queue:</span>
                        <span>{metrics.queueMetrics?.queueLength || 0}</span>
                    </MetricRow>
                    <MetricRow>
                        <span>Processed:</span>
                        <span>{metrics.queueMetrics?.processedCount || 0}</span>
                    </MetricRow>
                </MetricsDisplay>
            )}
        </Panel>
    );
};

export default DevPanel; 