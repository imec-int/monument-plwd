module.exports = {
    clearMocks: true,
    moduleFileExtensions: ['js', 'ts'],
    transform: {
        '^.+\\.(ts)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    },
    testTimeout: 20000,
    testMatch: ['**/__integration_tests__/*.test.+(ts|js)', '**/__tests__/*.test.+(ts|js)'],
    coverageReporters: ['text', 'cobertura'],
    reporters: ['default'],
    // Load environment variables during test
    // See: https://stackoverflow.com/questions/48033841/test-process-env-with-jest
    setupFiles: ['<rootDir>/.jest/setEnvVars.js'],
};
