import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import PerformanceDisplay from './PerformanceDisplay';

const Panel = styled.div`
    position: fixed;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    padding: 10px;
    border-radius: 6px;
    color: white;
    font-family: monospace;
    z-index: 1000;
    width: fit-content;
    transform: scale(0.75);
    transform-origin: top left;
`;

const Button = styled.button`
    background: #2c3e50;
    color: white;
    border: none;
    padding: 4px 8px;
    margin: 2px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.75rem;
    &:hover {
        background: #34495e;
    }
`;

const MetricsDisplay = styled.div`
    margin-top: 6px;
    font-size: 0.7rem;
    border-top: 1px solid #666;
    padding-top: 6px;
    width: 100%;
`;

const MetricRow = styled.div`
    display: flex;
    justify-content: space-between;
    margin: 2px 0;
    gap: 8px;
`;

const ButtonContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-bottom: 6px;
    width: 100%;
`;

const ChildrenContainer = styled.div`
    margin-top: 8px;
    border-top: 1px solid #666;
    padding-top: 8px;
    width: 100%;
`;

const DevPanel = ({ onVirusBoost, onVirusSuppress, onResetSimulation, marketSimulator, children }) => {
    const [metrics, setMetrics] = useState(null);
    const [showMetrics, setShowMetrics] = useState(false);
    const [showTimeline, setShowTimeline] = useState(false);
    const [showPerformance, setShowPerformance] = useState(false);

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

    const toggleTimeline = () => {
        setShowTimeline(!showTimeline);
    };

    const togglePerformance = () => {
        setShowPerformance(!showPerformance);
        if (!showPerformance && marketSimulator && marketSimulator.performanceMonitor) {
            marketSimulator.performanceMonitor.enableDebug();
        } else if (marketSimulator && marketSimulator.performanceMonitor) {
            marketSimulator.performanceMonitor.disableDebug();
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
                <Button onClick={toggleTimeline}>
                    {showTimeline ? 'Hide Timeline' : 'Show Timeline'}
                </Button>
                <Button onClick={togglePerformance}>
                    {showPerformance ? 'Hide Performance' : 'Show Performance'}
                </Button>
            </ButtonContainer>

            {showMetrics && metrics && metrics.market && (
                <MetricsDisplay>
                    <MetricRow>
                        <span>Orders:</span>
                        <span>{metrics.system.queueSize}</span>
                    </MetricRow>
                    <MetricRow>
                        <span>Market Cap:</span>
                        <span>{metrics.market.marketCap}</span>
                    </MetricRow>
                    <MetricRow>
                        <span>Volatility:</span>
                        <span>{metrics.market.volatility}</span>
                    </MetricRow>
                    <MetricRow>
                        <span>FPS:</span>
                        <span>{metrics.fps}</span>
                    </MetricRow>
                </MetricsDisplay>
            )}

            {showPerformance && marketSimulator && marketSimulator.performanceMonitor && (
                <PerformanceDisplay performanceMonitor={marketSimulator.performanceMonitor} />
            )}

            {children && React.cloneElement(children, { isVisible: showTimeline })}
        </Panel>
    );
};

export default DevPanel; 