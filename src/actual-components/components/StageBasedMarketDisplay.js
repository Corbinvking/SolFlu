import React, { useState, useEffect, useRef } from 'react';
import '../styles/market-display.css';

/**
 * Stage-Based Market Display Component
 * Displays order book and market data with stage-appropriate styling
 */
const StageBasedMarketDisplay = ({ orderBook, growthStages, isTestEnvironment = false }) => {
    const [depthData, setDepthData] = useState({ bids: [], asks: [], lastPrice: 0 });
    const [currentStage, setCurrentStage] = useState(null);
    const animationFrameRef = useRef();
    const updateCountRef = useRef(0);
    const isInitializedRef = useRef(false);

    useEffect(() => {
        const updateDisplay = () => {
            if (orderBook && growthStages) {
                const depth = orderBook.getDepth();
                setDepthData(depth);
                
                const stageData = growthStages.getCurrentStageData();
                if (stageData) {
                    setCurrentStage(stageData);
                    isInitializedRef.current = true;

                    // Log stage and market data for debugging
                    console.log('Market Display Update:', {
                        stage: stageData.name,
                        marketCap: growthStages.currentMarketCap,
                        stageRange: stageData.range,
                        orderCount: depth.bids.length + depth.asks.length,
                        midPrice: depth.lastPrice
                    });
                }
            }

            // In test environment, limit updates
            if (isTestEnvironment) {
                updateCountRef.current += 1;
                if (updateCountRef.current > 10) {
                    return;
                }
            }

            if (typeof window !== 'undefined' && window.requestAnimationFrame) {
                animationFrameRef.current = window.requestAnimationFrame(updateDisplay);
            }
        };

        // Initial update
        updateDisplay();

        return () => {
            if (animationFrameRef.current && typeof window !== 'undefined' && window.cancelAnimationFrame) {
                window.cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [orderBook, growthStages, isTestEnvironment]);

    const getStageColor = () => {
        if (!currentStage) return '#ffffff';
        
        const stageColors = {
            'LAUNCH': '#ff4444',
            'EARLY_GROWTH': '#ffbb33',
            'VIRAL': '#00C851',
            'ESTABLISHMENT': '#33b5e5',
            'MATURATION': '#2BBBAD',
            'PEAK': '#4285F4'
        };

        const progress = (growthStages.currentMarketCap - currentStage.range[0]) / 
                        (currentStage.range[1] - currentStage.range[0]);
        
        // Adjust color intensity based on progress
        const color = stageColors[currentStage.name];
        const intensity = 0.5 + (progress * 0.5); // 50% to 100% intensity
        
        return color;
    };

    const formatPrice = (price) => {
        return Number(price).toFixed(8);
    };

    const formatAmount = (amount) => {
        return Number(amount).toFixed(2);
    };

    const renderDepthRow = (data, side) => {
        const total = data.total || 0;
        const maxTotal = Math.max(
            ...depthData.bids.map(b => b.total || 0),
            ...depthData.asks.map(a => a.total || 0),
            0.00000001 // Prevent division by zero
        );
        const percentage = (total / maxTotal) * 100;
        
        const style = {
            background: `linear-gradient(${side === 'bid' ? 'to right' : 'to left'}, 
                ${side === 'bid' ? '#113534' : '#351111'} ${percentage}%, 
                transparent ${percentage}%)`
        };

        return (
            <div className="depth-row" style={style}>
                <span className="price">{formatPrice(data.price)}</span>
                <span className="amount">{formatAmount(data.amount)}</span>
                <span className="total">{formatAmount(total)}</span>
            </div>
        );
    };

    const getCurrentSpread = () => {
        if (!orderBook) return 0;
        try {
            return orderBook.getCurrentSpread().toFixed(2);
        } catch (error) {
            return '0.00';
        }
    };

    return (
        <div className="stage-based-market-display">
            <div className="stage-info" style={{ borderColor: getStageColor() }}>
                <h3>{currentStage?.name || 'Loading...'}</h3>
                <p>{currentStage?.description || ''}</p>
            </div>
            
            <div className="market-metrics">
                <div className="metric">
                    <label>Last Price</label>
                    <span>{formatPrice(depthData.lastPrice)}</span>
                </div>
                <div className="metric">
                    <label>Spread</label>
                    <span>{getCurrentSpread()}%</span>
                </div>
                <div className="metric">
                    <label>Growth Rate</label>
                    <span>{((currentStage?.growthRate || 1) - 1) * 100}%</span>
                </div>
            </div>

            <div className="order-book">
                <div className="asks">
                    {depthData.asks.map((ask, i) => (
                        <div key={`ask-${i}`}>
                            {renderDepthRow(ask, 'ask')}
                        </div>
                    ))}
                </div>
                
                <div className="spread-indicator" style={{ color: getStageColor() }}>
                    <span>Spread: {getCurrentSpread()}%</span>
                </div>
                
                <div className="bids">
                    {depthData.bids.map((bid, i) => (
                        <div key={`bid-${i}`}>
                            {renderDepthRow(bid, 'bid')}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StageBasedMarketDisplay; 