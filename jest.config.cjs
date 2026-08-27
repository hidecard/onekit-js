module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 40,
      branches: 30,
      functions: 30,
      lines: 40,
    },
  },
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^onekit-js/isr$': '<rootDir>/src/modules/isr.ts',
  },
};
