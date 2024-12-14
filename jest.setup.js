import '@testing-library/jest-dom';

// Mock performance.now() if it doesn't exist
if (!global.performance) {
    global.performance = {
        now: () => Date.now()
    };
}

// Mock requestAnimationFrame
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.cancelAnimationFrame = id => clearTimeout(id); 