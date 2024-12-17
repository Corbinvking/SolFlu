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
    flex-wrap: wrap;
    gap: 5px;
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
                setMetrics(currentMetrics);
            }, 100);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [showMetrics, marketSimulator]);

    const toggleMetrics = () => {
        if (!showMetrics) {
            setShowMetrics(true);
            if (marketSimulator && marketSimulator.performanceMonitor) {
                marketSimulator.performanceMonitor.enableDebug();
            }
        } else {
            setShowMetrics(false);
            if (marketSimulator && marketSimulator.performanceMonitor) {
                marketSimulator.performanceMonitor.disableDebug();
            }
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
                        <span>{metrics.orderCount}</span>
                    </MetricRow>
                    <MetricRow>
                        <span>Update Rate:</span>
                        <span>{metrics.updateRate.toFixed(1)}/s</span>
                    </MetricRow>
                    <MetricRow>
                        <span>Market Cap:</span>
                        <span>${metrics.marketCap.toLocaleString()}</span>
                    </MetricRow>
                    <MetricRow>
                        <span>Volatility:</span>
                        <span>{(metrics.volatility * 100).toFixed(1)}%</span>
                    </MetricRow>
                    <MetricRow>
                        <span>Queue Size:</span>
                        <span>{metrics.messageQueueSize}</span>
                    </MetricRow>
                    <MetricRow>
                        <span>Update Time:</span>
                        <span>{metrics.lastUpdateDuration.toFixed(1)}ms</span>
                    </MetricRow>
                </MetricsDisplay>
            )}
        </Panel>
    );
};

export default DevPanel; 