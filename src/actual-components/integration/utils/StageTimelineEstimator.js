/**
 * Stage Timeline Estimator
 * Estimates time to reach each market stage based on current metrics
 */

class StageTimelineEstimator {
    constructor(growthStages) {
        this.growthStages = growthStages;
        this.timelineEstimates = {
            LAUNCH: {
                bestCase: { hours: 2 },
                realistic: { hours: 12 },
                conservative: { days: 2 }
            },
            EARLY_GROWTH: {
                bestCase: { hours: 6 },
                realistic: { days: 1 },
                conservative: { days: 3 }
            },
            VIRAL: {
                bestCase: { hours: 12 },
                realistic: { days: 3 },
                conservative: { days: 7 }
            },
            ESTABLISHMENT: {
                bestCase: { days: 2 },
                realistic: { days: 7 },
                conservative: { days: 14 }
            },
            MATURATION: {
                bestCase: { days: 5 },
                realistic: { days: 20 },
                conservative: { days: 30 }
            },
            PEAK: {
                bestCase: { days: 8 },
                realistic: { days: 30 },
                conservative: { days: 45 }
            }
        };
    }

    /**
     * Calculate estimated time to reach next stage
     * @returns {Object} Time estimates for next stage
     */
    estimateTimeToNextStage() {
        const currentStage = this.growthStages.currentStage;
        const stageData = this.growthStages.getCurrentStageData();
        const currentMarketCap = this.growthStages.currentMarketCap;
        const targetMarketCap = stageData.range[1];
        const progress = (currentMarketCap - stageData.range[0]) / (targetMarketCap - stageData.range[0]);
        
        // Get base estimates for current stage
        const estimates = this.timelineEstimates[currentStage];
        
        // Adjust based on current metrics
        const momentum = this.growthStages.metrics.momentum;
        const growthRate = this.growthStages.metrics.growthRate;
        
        // Calculate remaining time based on progress
        const remainingProgress = 1 - progress;
        
        return {
            stage: currentStage,
            nextStage: this.getNextStage(currentStage),
            progress: progress,
            estimates: {
                bestCase: this.adjustEstimate(estimates.bestCase, remainingProgress, momentum, growthRate),
                realistic: this.adjustEstimate(estimates.realistic, remainingProgress, momentum, growthRate),
                conservative: this.adjustEstimate(estimates.conservative, remainingProgress, momentum, growthRate)
            },
            metrics: {
                momentum,
                growthRate,
                currentMarketCap,
                targetMarketCap
            }
        };
    }

    /**
     * Get timeline for all remaining stages
     * @returns {Array} Timeline estimates for all stages
     */
    getFullTimeline() {
        const stages = Object.keys(this.growthStages.STAGES);
        const currentIndex = stages.indexOf(this.growthStages.currentStage);
        const timeline = [];
        
        for (let i = currentIndex; i < stages.length; i++) {
            const stage = stages[i];
            const stageData = this.growthStages.STAGES[stage];
            const isCurrentStage = stage === this.growthStages.currentStage;
            
            let estimate;
            if (isCurrentStage) {
                estimate = this.estimateTimeToNextStage();
            } else {
                estimate = {
                    stage: stage,
                    nextStage: this.getNextStage(stage),
                    progress: 0,
                    estimates: this.timelineEstimates[stage],
                    metrics: null
                };
            }
            
            timeline.push({
                ...estimate,
                marketCapRange: stageData.range,
                description: stageData.description,
                isCurrentStage
            });
        }
        
        return timeline;
    }

    /**
     * Get the next stage name
     * @param {string} currentStage Current stage name
     * @returns {string} Next stage name or null if at peak
     */
    getNextStage(currentStage) {
        const stages = Object.keys(this.growthStages.STAGES);
        const currentIndex = stages.indexOf(currentStage);
        return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
    }

    /**
     * Adjust time estimate based on current metrics
     * @param {Object} baseEstimate Base time estimate
     * @param {number} remainingProgress Progress remaining to next stage
     * @param {number} momentum Current market momentum
     * @param {number} growthRate Current growth rate
     * @returns {Object} Adjusted time estimate
     */
    adjustEstimate(baseEstimate, remainingProgress, momentum, growthRate) {
        // Convert base estimate to hours
        let baseHours = 0;
        if (baseEstimate.hours) baseHours = baseEstimate.hours;
        if (baseEstimate.days) baseHours = baseEstimate.days * 24;
        
        // Adjust based on metrics
        const momentumFactor = 1 + (momentum * -0.3); // Higher momentum reduces time
        const growthFactor = 1 + ((growthRate - 1) * -0.5); // Higher growth rate reduces time
        const progressFactor = remainingProgress;
        
        // Calculate adjusted hours
        let adjustedHours = baseHours * momentumFactor * growthFactor * progressFactor;
        
        // Convert back to appropriate units
        if (adjustedHours < 48) {
            return { hours: Math.round(adjustedHours) };
        } else {
            return { days: Math.round(adjustedHours / 24) };
        }
    }
}

export default StageTimelineEstimator; 