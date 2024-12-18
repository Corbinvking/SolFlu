import React, { useState, useEffect } from 'react';
import StageTimelineEstimator from '../integration/utils/StageTimelineEstimator';
import './StageTimelinePanel.css';

const StageTimelinePanel = ({ growthStages, isVisible }) => {
    const [timelineEstimator] = useState(() => new StageTimelineEstimator(growthStages));
    const [timeline, setTimeline] = useState([]);
    const [currentStage, setCurrentStage] = useState(null);
    const [marketMetrics, setMarketMetrics] = useState(null);

    useEffect(() => {
        // Update timeline every 5 seconds
        const interval = setInterval(() => {
            const stageData = growthStages.getCurrentStageData();
            setCurrentStage(stageData);
            setMarketMetrics({
                currentMarketCap: growthStages.currentMarketCap,
                momentum: growthStages.metrics.momentum,
                growthRate: growthStages.metrics.growthRate
            });

            // Update timeline data
            const newTimeline = timelineEstimator.getFullTimeline();
            setTimeline(newTimeline);

            // Log stage progression for debugging
            console.log('Stage Update:', {
                currentStage: stageData.name,
                marketCap: growthStages.currentMarketCap,
                stageRange: stageData.range,
                metrics: growthStages.metrics
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [growthStages, timelineEstimator]);

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

    const calculateStageProgress = (stage) => {
        if (!currentStage || !marketMetrics) return 0;
        if (stage.stage !== currentStage.name) return 0;

        const [min, max] = stage.marketCapRange;
        const progress = (marketMetrics.currentMarketCap - min) / (max - min);
        return Math.min(Math.max(progress, 0), 1);
    };

    if (!isVisible || !currentStage) return null;

    return (
        <div className="stage-timeline-panel">
            <h3>Market Stage Timeline</h3>
            <div className="timeline-container">
                {timeline.map((stage, index) => {
                    const isCurrentStage = stage.stage === currentStage.name;
                    const progress = calculateStageProgress(stage);
                    
                    return (
                        <div 
                            key={stage.stage} 
                            className={`timeline-stage ${isCurrentStage ? 'current-stage' : ''}`}
                        >
                            <div className="stage-header">
                                <h4>{stage.stage}</h4>
                                {isCurrentStage && (
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill"
                                            style={{ 
                                                width: `${progress * 100}%`,
                                                backgroundColor: getProgressColor(progress)
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                            
                            <div className="stage-details">
                                <p className="market-cap-range">
                                    {formatMarketCap(stage.marketCapRange[0])} - {formatMarketCap(stage.marketCapRange[1])}
                                </p>
                                
                                {isCurrentStage && marketMetrics && (
                                    <div className="current-metrics">
                                        <p>Current: {formatMarketCap(marketMetrics.currentMarketCap)}</p>
                                        <p>Momentum: {(marketMetrics.momentum * 100).toFixed(1)}%</p>
                                        <p>Growth Rate: {((marketMetrics.growthRate - 1) * 100).toFixed(1)}%</p>
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
                    );
                })}
            </div>
        </div>
    );
};

export default StageTimelinePanel; 