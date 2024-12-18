import React, { useState, useEffect } from 'react';
import StageTimelineEstimator from '../integration/utils/StageTimelineEstimator';
import './StageTimelinePanel.css';

const StageTimelinePanel = ({ growthStages, isVisible }) => {
    const [timelineEstimator] = useState(() => new StageTimelineEstimator(growthStages));
    const [timeline, setTimeline] = useState([]);
    const [updateCounter, setUpdateCounter] = useState(0);

    useEffect(() => {
        // Update timeline every 30 seconds
        const interval = setInterval(() => {
            setUpdateCounter(prev => prev + 1);
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Update timeline data
        const newTimeline = timelineEstimator.getFullTimeline();
        setTimeline(newTimeline);
    }, [updateCounter, growthStages.currentStage, timelineEstimator]);

    const formatTimeEstimate = (estimate) => {
        if (estimate.hours) return `${estimate.hours}h`;
        if (estimate.days) return `${estimate.days}d`;
        return 'N/A';
    };

    const formatMarketCap = (value) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
        return `$${value.toFixed(0)}`;
    };

    const getProgressColor = (progress) => {
        if (progress >= 0.8) return '#4CAF50';
        if (progress >= 0.5) return '#FFC107';
        return '#2196F3';
    };

    if (!isVisible) return null;

    return (
        <div className="stage-timeline-panel">
            <h3>Market Stage Timeline</h3>
            <div className="timeline-container">
                {timeline.map((stage, index) => (
                    <div 
                        key={stage.stage} 
                        className={`timeline-stage ${stage.isCurrentStage ? 'current-stage' : ''}`}
                    >
                        <div className="stage-header">
                            <h4>{stage.stage}</h4>
                            {stage.isCurrentStage && (
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill"
                                        style={{ 
                                            width: `${stage.progress * 100}%`,
                                            backgroundColor: getProgressColor(stage.progress)
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="stage-details">
                            <p className="market-cap-range">
                                {formatMarketCap(stage.marketCapRange[0])} - {formatMarketCap(stage.marketCapRange[1])}
                            </p>
                            
                            {stage.isCurrentStage && stage.metrics && (
                                <div className="current-metrics">
                                    <p>Current: {formatMarketCap(stage.metrics.currentMarketCap)}</p>
                                    <p>Momentum: {(stage.metrics.momentum * 100).toFixed(1)}%</p>
                                    <p>Growth Rate: {(stage.metrics.growthRate * 100 - 100).toFixed(1)}%</p>
                                </div>
                            )}
                            
                            <div className="time-estimates">
                                <div className="estimate">
                                    <span>Best case:</span>
                                    <span>{formatTimeEstimate(stage.estimates.bestCase)}</span>
                                </div>
                                <div className="estimate highlight">
                                    <span>Realistic:</span>
                                    <span>{formatTimeEstimate(stage.estimates.realistic)}</span>
                                </div>
                                <div className="estimate">
                                    <span>Conservative:</span>
                                    <span>{formatTimeEstimate(stage.estimates.conservative)}</span>
                                </div>
                            </div>
                        </div>
                        
                        {index < timeline.length - 1 && (
                            <div className="stage-connector">
                                <div className="connector-line" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StageTimelinePanel; 