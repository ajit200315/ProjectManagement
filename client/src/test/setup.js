import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // restoreAllMocks does not undo useFakeTimers. Left on, they leak into the
  // next test, where userEvent waits on timers that never advance and the
  // test times out with a failure that has nothing to do with its subject.
  vi.useRealTimers();
});

beforeEach(() => {
  // Tokens live here, so a leftover value from one test would silently change
  // what the next one sends.
  localStorage.clear();
});
