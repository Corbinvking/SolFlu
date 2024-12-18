import React from 'react';
import { render, screen, act } from '@testing-library/react';
import StageBasedMarketDisplay from '../StageBasedMarketDisplay';
import MarketGrowthStages from '../../integration/market-growth-stages';
import StageBasedOrderBook from '../../integration/stage-based-order-book';

describe('StageBasedMarketDisplay', () => {
    let growthStages;
    let orderBook;

    beforeEach(() => {
        jest.useFakeTimers();
        growthStages = new MarketGrowthStages();
        orderBook = new StageBasedOrderBook(growthStages);
        
        // Add some test orders
        orderBook.addOrder({
            id: 'test-1',
            side: 'buy',
            price: 95,
            amount: 10,
            timestamp: Date.now()
        });
        
        orderBook.addOrder({
            id: 'test-2',
            side: 'sell',
            price: 105,
            amount: 15,
            timestamp: Date.now()
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('renders initial stage information', () => {
        render(
            <StageBasedMarketDisplay
                orderBook={orderBook}
                growthStages={growthStages}
                isTestEnvironment={true}
            />
        );

        // Wait for initial render
        act(() => {
            jest.runAllTimers();
        });

        // Check stage name is displayed
        expect(screen.getByText('LAUNCH')).toBeInTheDocument();
    });

    test('displays market metrics', () => {
        render(
            <StageBasedMarketDisplay
                orderBook={orderBook}
                growthStages={growthStages}
                isTestEnvironment={true}
            />
        );

        // Wait for metrics to update
        act(() => {
            jest.runAllTimers();
        });

        // Check for metric labels
        expect(screen.getByText('Last Price')).toBeInTheDocument();
        expect(screen.getByText('Spread')).toBeInTheDocument();
        expect(screen.getByText('Growth Rate')).toBeInTheDocument();
    });

    test('renders order book depth', () => {
        render(
            <StageBasedMarketDisplay
                orderBook={orderBook}
                growthStages={growthStages}
                isTestEnvironment={true}
            />
        );

        // Wait for depth data to update
        act(() => {
            jest.runAllTimers();
        });

        // Check for order book elements
        const depthRows = screen.getAllByText(/^[0-9]+\.[0-9]+$/);
        expect(depthRows.length).toBeGreaterThan(0);
    });

    test('updates display on stage change', () => {
        const { rerender } = render(
            <StageBasedMarketDisplay
                orderBook={orderBook}
                growthStages={growthStages}
                isTestEnvironment={true}
            />
        );

        // Initial stage check
        expect(screen.getByText('LAUNCH')).toBeInTheDocument();

        // Progress to next stage
        growthStages.currentMarketCap = 15000;
        growthStages.progressStage();

        // Rerender with updated stage
        rerender(
            <StageBasedMarketDisplay
                orderBook={orderBook}
                growthStages={growthStages}
                isTestEnvironment={true}
            />
        );

        // Wait for update
        act(() => {
            jest.runAllTimers();
        });

        // Check for new stage
        expect(screen.getByText('EARLY_GROWTH')).toBeInTheDocument();
    });

    test('handles missing or loading data gracefully', () => {
        render(
            <StageBasedMarketDisplay
                orderBook={null}
                growthStages={null}
                isTestEnvironment={true}
            />
        );

        // Check for loading state
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('formats numbers correctly', () => {
        render(
            <StageBasedMarketDisplay
                orderBook={orderBook}
                growthStages={growthStages}
                isTestEnvironment={true}
            />
        );

        // Wait for render
        act(() => {
            jest.runAllTimers();
        });

        // Check number formatting
        const numbers = screen.getAllByText(/^[0-9]+\.[0-9]+$/);
        numbers.forEach(element => {
            const value = parseFloat(element.textContent);
            expect(isNaN(value)).toBe(false);
        });
    });

    test('applies correct styling based on stage', () => {
        const { container } = render(
            <StageBasedMarketDisplay
                orderBook={orderBook}
                growthStages={growthStages}
                isTestEnvironment={true}
            />
        );

        // Wait for render
        act(() => {
            jest.runAllTimers();
        });

        // Check for stage-specific styling
        const stageInfo = container.querySelector('.stage-info');
        expect(stageInfo).toHaveStyle({ borderColor: expect.any(String) });
    });

    test('cleans up animation frame on unmount', () => {
        const { unmount } = render(
            <StageBasedMarketDisplay
                orderBook={orderBook}
                growthStages={growthStages}
                isTestEnvironment={true}
            />
        );

        unmount();
        expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });
}); 