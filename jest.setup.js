import '@testing-library/jest-dom';

// Mock window functions that might not be available in JSDOM
if (typeof window !== 'undefined') {
    window.requestAnimationFrame = window.requestAnimationFrame || (cb => setTimeout(cb, 0));
    window.cancelAnimationFrame = window.cancelAnimationFrame || (id => clearTimeout(id));
}

// Mock ResizeObserver
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
    constructor(callback) {
        this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
}

window.IntersectionObserver = window.IntersectionObserver || IntersectionObserverMock;

// Mock matchMedia
window.matchMedia = window.matchMedia || function() {
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};

// Suppress console errors during tests
const originalError = console.error;
console.error = (...args) => {
    if (
        /Warning.*not wrapped in act/.test(args[0]) ||
        /Warning.*Cannot update a component/.test(args[0])
    ) {
        return;
    }
    originalError.call(console, ...args);
};