import { vi } from "vitest";

/**
 * Vitest setup file for worker tests
 * Configures global mocks and test environment
 */

// Mock Cloudflare Cache API
global.caches = {
  default: {
    match: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
  } as unknown as Cache,
} as unknown as CacheStorage;

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Suppress console.error in tests unless explicitly needed
  error: vi.fn((...args) => {
    // Log to stderr for debugging but don't fail tests
    if (process.env.DEBUG_TESTS) {
      console.error(...args);
    }
  }),
  warn: vi.fn((...args) => {
    if (process.env.DEBUG_TESTS) {
      console.warn(...args);
    }
  }),
};

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
declare global {
  function createMockExecutionContext(): ExecutionContext;
}

(global as unknown as { createMockExecutionContext: () => ExecutionContext }).createMockExecutionContext = (): ExecutionContext => ({
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
});
