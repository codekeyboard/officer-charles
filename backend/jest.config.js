module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/core/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/$1'
  }
};
