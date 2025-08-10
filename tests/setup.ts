// Jest setup file for global test configuration

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
const originalConsole = console;

beforeEach(() => {
  // Optionally mock console methods
  // console.log = jest.fn();
  // console.warn = jest.fn();
  // console.error = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});