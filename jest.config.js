/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(expo-sqlite|expo-modules-core|expo|@expo|react-native|@react-native)/)',
  ],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/src/__mocks__/expo-sqlite.js',
    '^expo$': '<rootDir>/src/__mocks__/expo.js',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.js',
    '^@testing-library/react-native$': '<rootDir>/src/__mocks__/@testing-library/react-native.js',
    '^@expo/vector-icons$': '<rootDir>/src/__mocks__/@expo/vector-icons.js',
    '^@expo/vector-icons/(.*)$': '<rootDir>/src/__mocks__/@expo/vector-icons.js',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
};
