import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
    background: rgba(0, 0, 0, 0.8);
    border-radius: 6px;
    padding: 10px;
    margin-top: 10px;
    font-family: monospace;
    font-size: 0.7rem;
    width: 100%;
`;

const Section = styled.div`
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #444;
    &:last-child {
        border-bottom: none;
        margin-bottom: 0;
    }
`;

const Title = styled.div`
    color: #64B5F6;
    font-weight: bold;
    margin-bottom: 4px;
`;

const MetricRow = styled.div`
    display: flex;
    justify-content: space-between;
    margin: 2px 0;
    color: ${props => {
        if (props.status === 'error') return '#ff4444';
        if (props.status === 'warning') return '#ffb700';
        return 'white';
    }};
`;

const PerformanceDisplay = ({ performanceMonitor }) => {
    const [metrics, setMetrics] = useState(null);

    useEffect(() => {
        let interval;
        if (performanceMonitor) {
            interval = setInterval(() => {
                const report = performanceMonitor.getPerformanceReport();
                setMetrics(report);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [performanceMonitor]);

    if (!metrics) return null;

    const getStatus = (type, value) => {
        const thresholds = {
            fps: { warning: 45, error: 30 },
            frameTime: { warning: 20, error: 33 },
            queueSize: { warning: 100, error: 500 },
            memoryUsage: { warning: 150, error: 200 }
        };

        if (!thresholds[type]) return 'normal';
        if (value > thresholds[type].error) return 'error';
        if (value > thresholds[type].warning) return 'warning';
        return 'normal';
    };

    return (
        <Container>
            <Section>
                <Title>Core Performance</Title>
                <MetricRow status={getStatus('fps', metrics.fps)}>
                    <span>FPS:</span>
                    <span>{metrics.fps}</span>
                </MetricRow>
                {Object.entries(metrics.metrics).map(([key, value]) => (
                    <MetricRow key={key} status={key === 'frameTime' ? getStatus('frameTime', parseFloat(value)) : 'normal'}>
                        <span>{key}:</span>
                        <span>{value}</span>
                    </MetricRow>
                ))}
            </Section>

            <Section>
                <Title>Market & Virus</Title>
                {Object.entries(metrics.virus).map(([key, value]) => (
                    <MetricRow key={key}>
                        <span>{key}:</span>
                        <span>{value}</span>
                    </MetricRow>
                ))}
                {Object.entries(metrics.market).map(([key, value]) => (
                    <MetricRow key={key}>
                        <span>{key}:</span>
                        <span>{value}</span>
                    </MetricRow>
                ))}
            </Section>

            <Section>
                <Title>System</Title>
                {Object.entries(metrics.system).map(([key, value]) => (
                    <MetricRow key={key} status={key === 'queueSize' ? getStatus('queueSize', parseInt(value)) : 'normal'}>
                        <span>{key}:</span>
                        <span>{value}</span>
                    </MetricRow>
                ))}
                {metrics.memoryUsage && (
                    <MetricRow status={getStatus('memoryUsage', metrics.memoryUsage.usedJSHeapSize / (1024 * 1024))}>
                        <span>Memory:</span>
                        <span>{Math.round(metrics.memoryUsage.usedJSHeapSize / (1024 * 1024))}MB / 
                              {Math.round(metrics.memoryUsage.totalJSHeapSize / (1024 * 1024))}MB</span>
                    </MetricRow>
                )}
            </Section>
        </Container>
    );
};

export default PerformanceDisplay; 