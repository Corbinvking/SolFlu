module.exports = {
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '\\.(css|less|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
        '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js'
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.test.js',
        '<rootDir>/src/**/*.test.js'
    ],
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
    },
    moduleDirectories: ['node_modules', 'src'],
    verbose: true,
    testTimeout: 10000
}; 