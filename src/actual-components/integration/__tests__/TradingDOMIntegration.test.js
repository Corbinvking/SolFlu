import React from 'react';
import { render, screen, act } from '@testing-library/react';
import TradingDOMIntegration from '../TradingDOMIntegration';

describe('TradingDOMIntegration', () => {
    // Mock window functions
    const originalRAF = window.requestAnimationFrame;
    const originalCAF = window.cancelAnimationFrame;

    beforeEach(() => {
        jest.useFakeTimers();
        window.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
        window.cancelAnimationFrame = jest.fn(id => clearTimeout(id));
    });

    afterEach(() => {
        jest.useRealTimers();
        window.requestAnimationFrame = originalRAF;
        window.cancelAnimationFrame = originalCAF;
        jest.clearAllMocks();
    });

    const advanceTimersAndRender = (time = 100) => {
        act(() => {
            jest.advanceTimersByTime(time);
            // Run any pending timers
            jest.runOnlyPendingTimers();
        });
    };

    const extractNumericValue = (text) => {
        const match = text.match(/\$?(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) : null;
    };

    const waitForValueChange = async (getValue, maxAttempts = 10) => {
        const initialValue = getValue();
        let attempts = 0;
        let currentValue = initialValue;

        while (attempts < maxAttempts) {
            advanceTimersAndRender(200);
            currentValue = getValue();
            if (currentValue !== initialValue) {
                return currentValue;
            }
            attempts++;
        }

        return currentValue;
    };

    test('renders initial market state', () => {
        render(<TradingDOMIntegration initialPrice={100} initialMarketCap={2000} isTestEnvironment={true} />);
        advanceTimersAndRender();

        // Check for market overview section
        expect(screen.getByText('Market Overview')).toBeInTheDocument();
        
        // Check for initial metrics
        expect(screen.getByText(/Current Price/)).toBeInTheDocument();
        expect(screen.getByText(/24h Volume/)).toBeInTheDocument();
        expect(screen.getByText(/24h Trades/)).toBeInTheDocument();
        expect(screen.getByText(/Market Cap/)).toBeInTheDocument();
    });

    test('updates market metrics over time', async () => {
        render(<TradingDOMIntegration initialPrice={100} initialMarketCap={2000} isTestEnvironment={true} />);

        // Initial state
        advanceTimersAndRender();
        const getPriceValue = () => extractNumericValue(screen.getByText(/Current Price/).textContent);
        const initialPrice = getPriceValue();

        // Wait for price change
        const updatedPrice = await waitForValueChange(getPriceValue);
        expect(updatedPrice).not.toBe(initialPrice);
    });

    test('starts market simulation on mount', () => {
        render(<TradingDOMIntegration isTestEnvironment={true} />);
        expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    test('cleans up animation frame on unmount', () => {
        const { unmount } = render(<TradingDOMIntegration isTestEnvironment={true} />);
        unmount();
        expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });

    test('handles stage progression', async () => {
        const { rerender } = render(
            <TradingDOMIntegration 
                initialPrice={100} 
                initialMarketCap={9000} 
                isTestEnvironment={true} 
            />
        );

        // Initial render
        advanceTimersAndRender();

        // Initial stage should be LAUNCH
        expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('LAUNCH');

        // Progress to next stage by increasing market cap
        rerender(
            <TradingDOMIntegration 
                initialPrice={100} 
                initialMarketCap={15000} 
                isTestEnvironment={true} 
            />
        );

        // Allow time for stage update and force a few simulation cycles
        for (let i = 0; i < 10; i++) {
            advanceTimersAndRender(200);
            // Check if stage has changed
            const currentStage = screen.getByRole('heading', { level: 3 }).textContent;
            if (currentStage === 'EARLY_GROWTH') {
                break;
            }
        }

        // Should now be in EARLY_GROWTH stage
        const stageInfo = screen.getByRole('heading', { level: 3 });
        expect(stageInfo.textContent).toBe('EARLY_GROWTH');
    });

    test('maintains order book state', () => {
        render(<TradingDOMIntegration isTestEnvironment={true} />);

        // Allow time for order book initialization
        advanceTimersAndRender(500);

        // Check for order book elements
        const depthRows = screen.getAllByText(/^[0-9]+\.[0-9]+$/);
        expect(depthRows.length).toBeGreaterThan(0);
    });

    test('updates market cap based on trading activity', async () => {
        render(<TradingDOMIntegration 
            initialPrice={100} 
            initialMarketCap={2000} 
            isTestEnvironment={true} 
        />);

        // Initial render
        advanceTimersAndRender();
        const getMarketCapValue = () => extractNumericValue(screen.getByText(/Market Cap/).textContent);
        const initialMarketCap = getMarketCapValue();

        // Wait for market cap change
        const updatedMarketCap = await waitForValueChange(getMarketCapValue);
        expect(updatedMarketCap).not.toBe(initialMarketCap);
    });
}); 