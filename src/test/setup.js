import '@testing-library/jest-dom';
import { webcrypto } from 'crypto';

// Setup Mock SubtleCrypto globally for test runs
if (!globalThis.window) {
  globalThis.window = {};
}
if (!globalThis.window.crypto) {
  globalThis.window.crypto = webcrypto;
}
