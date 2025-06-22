import '@testing-library/jest-dom/vitest';

// Polyfill IndexedDB for environments that don't provide it (e.g. node)
// but still run with the `node` environment in Vitest.
try {
  if (typeof indexedDB === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { indexedDB: idb, IDBKeyRange } = require('fake-indexeddb');
    // @ts-ignore – global injection for tests
    globalThis.indexedDB = idb;
    // @ts-ignore – global injection for tests
    globalThis.IDBKeyRange = IDBKeyRange;
  }
} catch {
  // ignore if require fails in browser-like environments
} 