import React, { useState, useEffect, useRef, useCallback } from 'react';
import StageBasedOrderBook from './stage-based-order-book';
import StageBasedOrderGenerator from './stage-based-order-generator';
import MarketGrowthStages from './market-growth-stages';
import MarketSimulator from './market-simulator';
import StageTimelinePanel from '../components/StageTimelinePanel';
import './TradingDOMIntegration.css';

const TradingDOMIntegration = ({ initialPrice = 100, initialMarketCap = 2000, isTestEnvironment = false }) => {
    const [orderBook, setOrderBook] = useState(null);
    const [currentStage, setCurrentStage] = useState('LAUNCH');
    const [marketMetrics, setMarketMetrics] = useState({
        marketCap: initialMarketCap,
        price: initialPrice,
        volume: 0,
        lastWhaleEvent: null
    });

    const marketSystem = useRef({
        orderBook: null,
        orderGenerator: null,
        growthStages: null,
        marketSimulator: null
    });

    const animationFrameRef = useRef(null);
    const lastUpdateRef = useRef(Date.now());

    useEffect(() => {
        // Initialize market system
        const growthStages = new MarketGrowthStages();
        const orderBook = new StageBasedOrderBook(growthStages);
        const orderGenerator = new StageBasedOrderGenerator(growthStages);
        const marketSimulator = new MarketSimulator({
            initialMarketCap,
            initialPrice
        });

        marketSystem.current = {
            orderBook,
            orderGenerator,
            growthStages,
            marketSimulator
        };

        // Set up stage change callback
        growthStages.setStageChangeCallback((oldStage, newStage, marketCap) => {
            console.log(`Stage transition: ${oldStage} -> ${newStage} at $${marketCap}`);
            setCurrentStage(newStage);
        });

        setOrderBook(orderBook);
        
        // Start simulation
        simulateMarket();

        return () => {
            if (animationFrameRef.current && typeof window !== 'undefined') {
                window.cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [initialPrice, initialMarketCap, isTestEnvironment]);

    const simulateMarket = useCallback(() => {
        if (!marketSystem.current.orderBook || !marketSystem.current.orderGenerator) {
            return;
        }

        const now = Date.now();
        const deltaTime = now - lastUpdateRef.current;
        lastUpdateRef.current = now;

        // Update market simulator
        const marketUpdate = marketSystem.current.marketSimulator.update();
        
        // Update growth stages with new market cap
        marketSystem.current.growthStages.setMarketCap(marketUpdate.marketCap);

        // Generate orders based on current stage
        const stageData = marketSystem.current.growthStages.getCurrentStageData();
        const orderFrequency = stageData.orderFrequency;

        if (deltaTime >= orderFrequency) {
            const order = marketSystem.current.orderGenerator.generateOrder(marketUpdate.price);
            if (order) {
                marketSystem.current.orderBook.addOrder(order);
            }
        }

        // Update market metrics
        setMarketMetrics({
            marketCap: marketUpdate.marketCap,
            price: marketUpdate.price,
            volume: marketUpdate.volume24h,
            lastWhaleEvent: marketSystem.current.marketSimulator.state.lastWhaleEvent
        });

        // Check for stage progression
        const newStage = marketSystem.current.growthStages.progressStage();
        if (newStage) {
            setCurrentStage(newStage.name);
        }

        // Schedule next update
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            animationFrameRef.current = window.requestAnimationFrame(simulateMarket);
        }
    }, []);

    const handleWhaleEvent = useCallback((side, size) => {
        if (marketSystem.current.marketSimulator) {
            const success = marketSystem.current.marketSimulator.generateWhaleOrder(side, size);
            if (success) {
                // Generate corresponding order in the order book
                const currentPrice = marketSystem.current.marketSimulator.state.price;
                const order = {
                    price: side === 'buy' ? currentPrice * 1.05 : currentPrice * 0.95,
                    amount: size,
                    side,
                    isWhale: true
                };
                marketSystem.current.orderBook.addOrder(order);

                console.log(`Whale ${side} order executed:`, {
                    size,
                    price: order.price,
                    marketCap: marketSystem.current.marketSimulator.state.marketCap
                });
            }
        }
    }, []);

    // Pass whale event handlers to parent component
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.handleWhaleBuy = (size) => handleWhaleEvent('buy', size);
            window.handleWhaleSell = (size) => handleWhaleEvent('sell', size);
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete window.handleWhaleBuy;
                delete window.handleWhaleSell;
            }
        };
    }, [handleWhaleEvent]);

    return (
        <div className="trading-dom-integration">
            <div className="market-info">
                <div className="stage-indicator" style={{ 
                    backgroundColor: currentStage === 'LAUNCH' ? '#ff4444' :
                                   currentStage === 'EARLY_GROWTH' ? '#ffbb33' :
                                   currentStage === 'VIRAL' ? '#00C851' :
                                   currentStage === 'ESTABLISHMENT' ? '#33b5e5' :
                                   currentStage === 'MATURATION' ? '#2BBBAD' :
                                   currentStage === 'PEAK' ? '#4285F4' : '#ffffff'
                }}>
                    {currentStage}
                </div>
                <div className="metrics">
                    <div>Market Cap: ${marketMetrics.marketCap.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div>Price: ${marketMetrics.price.toFixed(8)}</div>
                    <div>Volume: ${marketMetrics.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                </div>
            </div>
            {orderBook && (
                <div className="order-book-container">
                    {/* Order book visualization */}
                </div>
            )}
            {marketSystem.current.growthStages && (
                <StageTimelinePanel 
                    growthStages={marketSystem.current.growthStages}
                    isVisible={true}
                />
            )}
        </div>
    );
};

export default TradingDOMIntegration; 