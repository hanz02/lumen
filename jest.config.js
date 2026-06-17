module.exports = {
  preset: '@react-native/jest-preset',
  // Only run *.test / *.spec files (not fixtures/helpers that live in __tests__).
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  // Stub react-native-svg / linear-gradient (untranspiled native UI libs).
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
