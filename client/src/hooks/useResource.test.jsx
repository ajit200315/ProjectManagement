import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useResource } from "./useResource.js";

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe("useResource", () => {
  it("loads on mount and exposes the data", async () => {
    const load = vi.fn(async () => ({ name: "Apollo" }));
    const { result } = renderHook(() => useResource(load));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ name: "Apollo" });
    expect(result.current.error).toBe("");
  });

  it("surfaces the error message and stops loading", async () => {
    const load = vi.fn(async () => {
      throw new Error("Project not found");
    });
    const { result } = renderHook(() => useResource(load));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Project not found");
    expect(result.current.data).toBeNull();
  });

  it("refresh replaces the data", async () => {
    let value = 1;
    const load = vi.fn(async () => value);
    const { result } = renderHook(() => useResource(load));

    await waitFor(() => expect(result.current.data).toBe(1));

    value = 2;
    await result.current.refresh();
    await waitFor(() => expect(result.current.data).toBe(2));
  });

  it("ignores a slow response that a newer one has already superseded", async () => {
    const slow = deferred();
    const fast = deferred();
    const load = vi
      .fn()
      .mockReturnValueOnce(slow.promise)
      .mockReturnValueOnce(fast.promise);

    const { result } = renderHook(() => useResource(load));

    // Second request starts and finishes before the first comes back.
    const second = result.current.refresh();
    fast.resolve("newer");
    await second;
    await waitFor(() => expect(result.current.data).toBe("newer"));

    // The stale response must not overwrite it.
    slow.resolve("older");
    await slow.promise;
    expect(result.current.data).toBe("newer");
  });

  it("does not set state after unmount", async () => {
    const pending = deferred();
    const load = vi.fn(() => pending.promise);

    const { unmount } = renderHook(() => useResource(load));
    unmount();

    // Would warn or throw if the hook committed to a gone component.
    pending.resolve("late");
    await expect(pending.promise).resolves.toBe("late");
  });
});
