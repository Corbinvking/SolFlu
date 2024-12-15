const { promisify } = require('util');

/**
 * Sleep for the specified number of milliseconds
 * @param {number} ms - Number of milliseconds to sleep
 * @returns {Promise} Promise that resolves after the specified time
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function until it succeeds or max attempts are reached
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} delay - Delay between attempts in milliseconds
 * @returns {Promise} Promise that resolves with the function result
 */
const retry = async (fn, maxAttempts = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                await sleep(delay);
            }
        }
    }
    
    throw lastError;
};

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns a boolean
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @param {number} interval - Interval between checks in milliseconds
 * @returns {Promise} Promise that resolves when condition is true
 */
const waitFor = async (condition, timeout = 5000, interval = 100) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return true;
        }
        await sleep(interval);
    }
    
    throw new Error('Timeout waiting for condition');
};

module.exports = {
    sleep,
    retry,
    waitFor
}; 