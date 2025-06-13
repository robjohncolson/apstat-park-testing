import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/server";

// Polyfill for React 18+ testing environment
import { TextEncoder, TextDecoder } from 'util';

// Setup global polyfills for jsdom environment
Object.assign(global, {
  TextEncoder,
  TextDecoder,
});

// Establish API mocking before all tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());

// Mock global fetch if not available
if (!global.fetch) {
  global.fetch = fetch;
}
