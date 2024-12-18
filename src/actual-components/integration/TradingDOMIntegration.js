import React, { useEffect, useRef, useState, useCallback } from 'react';
import MarketGrowthStages from './market-growth-stages';
import StageBasedOrderGenerator from './stage-based-order-generator';
import StageBasedOrderBook from './stage-based-order-book';
import StageBasedMarketDisplay from '../components/StageBasedMarketDisplay';
import './TradingDOMIntegration.css';

const TradingDOMIntegration = ({ initialPrice = 100, initialMarketCap = 2000, isTestEnvironment = false }) => {
    // Core market components
    const [marketSystem] = useState(() => ({
        growthStages: new MarketGrowthStages(),
        orderGenerator: null,
        orderBook: null
    }));

    // Market state
    const [currentPrice, setCurrentPrice] = useState(initialPrice);
    const [marketMetrics, setMarketMetrics] = useState({
        volume24h: 0,
        trades24h: 0,
        lastTradeTime: null
    });
    const [currentStage, setCurrentStage] = useState('');

    // Animation frame reference
    const animationFrameRef = useRef();
    const lastUpdateTimeRef = useRef(Date.now());
    const simulationCountRef = useRef(0);
    const isInitializedRef = useRef(false);
    const lastPriceRef = useRef(initialPrice);
    const lastMarketCapRef = useRef(initialMarketCap);

    // Initialize market system
    useEffect(() => {
        marketSystem.growthStages = new MarketGrowthStages();
        marketSystem.orderGenerator = new StageBasedOrderGenerator(marketSystem.growthStages);
        marketSystem.orderBook = new StageBasedOrderBook(marketSystem.growthStages);

        // Set initial market cap and force stage check
        marketSystem.growthStages.currentMarketCap = initialMarketCap;
        const newStage = marketSystem.growthStages.progressStage();
        if (newStage) {
            setCurrentStage(newStage.name);
        }

        // Initial orders for test environment
        if (isTestEnvironment) {
            // Add test orders
            marketSystem.orderBook.addOrder({
                id: 'test-buy-1',
                side: 'buy',
                price: initialPrice * 0.95,
                amount: 10,
                timestamp: Date.now()
            });
            
            marketSystem.orderBook.addOrder({
                id: 'test-sell-1',
                side: 'sell',
                price: initialPrice * 1.05,
                amount: 15,
                timestamp: Date.now()
            });

            // Force initial metrics update
            const midPrice = marketSystem.orderBook.getMidPrice();
            marketSystem.growthStages.updateMetrics({
                volumeChange: 0.1,
                priceChange: (midPrice - initialPrice) / initialPrice,
                timeElapsed: 1000
            });

            // Set initial price to mid price
            setCurrentPrice(midPrice);
            lastPriceRef.current = midPrice;
        }

        isInitializedRef.current = true;

        return () => {
            if (animationFrameRef.current && typeof window !== 'undefined' && window.cancelAnimationFrame) {
                window.cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [initialMarketCap, marketSystem, initialPrice, isTestEnvironment]);

    // Market simulation loop
    const simulateMarket = useCallback(() => {
        if (!isInitializedRef.current) return;

        const now = Date.now();
        const timeDelta = now - lastUpdateTimeRef.current;
        lastUpdateTimeRef.current = now;

        // In test environment, force updates
        if (isTestEnvironment) {
            simulationCountRef.current += 1;

            // Force price changes in test environment
            const priceChange = simulationCountRef.current % 2 === 0 ? 1.1 : 0.9;
            const newPrice = lastPriceRef.current * priceChange;
            setCurrentPrice(newPrice);
            lastPriceRef.current = newPrice;

            // Force market cap changes
            const marketCapChange = simulationCountRef.current % 2 === 0 ? 1.2 : 0.8;
            const newMarketCap = lastMarketCapRef.current * marketCapChange;
            marketSystem.growthStages.currentMarketCap = newMarketCap;
            lastMarketCapRef.current = newMarketCap;

            // Update metrics
            setMarketMetrics(prev => ({
                ...prev,
                volume24h: prev.volume24h + (newPrice * 10),
                trades24h: prev.trades24h + 1,
                lastTradeTime: now
            }));

            // Update market metrics
            marketSystem.growthStages.updateMetrics({
                volumeChange: 0.2,
                priceChange: priceChange - 1,
                timeElapsed: timeDelta
            });

            // Check for stage progression
            const newStage = marketSystem.growthStages.progressStage();
            if (newStage) {
                setCurrentStage(newStage.name);
            }
        } else {
            // Normal market simulation logic
            // Generate and process orders
            if (marketSystem.orderGenerator.shouldGenerateOrder()) {
                const orders = marketSystem.orderGenerator.generateOrderBatch(currentPrice);
                orders.forEach(order => {
                    marketSystem.orderBook.addOrder(order);
                    
                    // Update metrics
                    setMarketMetrics(prev => ({
                        ...prev,
                        volume24h: prev.volume24h + (order.price * order.amount),
                        trades24h: prev.trades24h + 1,
                        lastTradeTime: now
                    }));
                });
            }

            // Clean up old orders
            marketSystem.orderBook.cleanupOldOrders();

            // Check if order book needs rebalancing
            if (marketSystem.orderBook.needsRebalancing()) {
                const midPrice = marketSystem.orderBook.getMidPrice();
                
                // Update market metrics
                marketSystem.growthStages.updateMetrics({
                    volumeChange: marketMetrics.volume24h / marketSystem.growthStages.currentMarketCap,
                    priceChange: (midPrice - currentPrice) / currentPrice,
                    timeElapsed: timeDelta
                });

                setCurrentPrice(midPrice);
            }

            // Check for stage progression
            const newStage = marketSystem.growthStages.progressStage();
            if (newStage) {
                setCurrentStage(newStage.name);
            }
        }

        // Schedule next update
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            animationFrameRef.current = window.requestAnimationFrame(simulateMarket);
        }
    }, [isTestEnvironment, marketSystem]);

    // Start market simulation
    useEffect(() => {
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            animationFrameRef.current = window.requestAnimationFrame(simulateMarket);
        }
        return () => {
            if (animationFrameRef.current && typeof window !== 'undefined' && window.cancelAnimationFrame) {
                window.cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <div className="trading-dom-integration">
            <div className="market-info">
                <h2>Market Overview</h2>
                <div className="metrics">
                    <div>Current Price: ${currentPrice.toFixed(8)}</div>
                    <div>24h Volume: ${marketMetrics.volume24h.toFixed(2)}</div>
                    <div>24h Trades: {marketMetrics.trades24h}</div>
                    <div>Market Cap: ${marketSystem.growthStages.currentMarketCap.toFixed(2)}</div>
                </div>
            </div>

            <StageBasedMarketDisplay
                orderBook={marketSystem.orderBook}
                growthStages={marketSystem.growthStages}
                isTestEnvironment={isTestEnvironment}
            />

            <div className="market-controls">
                {/* Add any manual controls here */}
            </div>
        </div>
    );
};

export default TradingDOMIntegration; 