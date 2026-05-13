import {describe, it, expect, vi, beforeEach} from "vitest";
import {CircuitBreaker, getCircuitBreaker} from "../circuit-breaker";

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("should start in closed state", () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe("closed");
    expect(cb.canExecute()).toBe(true);
  });

  it("should open after reaching failure threshold", () => {
    const cb = new CircuitBreaker({failureThreshold: 3});
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("closed");
    cb.recordFailure();
    expect(cb.getState()).toBe("open");
    expect(cb.canExecute()).toBe(false);
  });

  it("should transition to half-open after reset timeout", () => {
    const cb = new CircuitBreaker({failureThreshold: 1, resetTimeoutMs: 10_000});
    cb.recordFailure();
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(10_000);
    expect(cb.getState()).toBe("half-open");
    expect(cb.canExecute()).toBe(true);
  });

  it("should close after success in half-open state", () => {
    const cb = new CircuitBreaker({failureThreshold: 1, resetTimeoutMs: 10_000});
    cb.recordFailure();
    vi.advanceTimersByTime(10_000);
    expect(cb.getState()).toBe("half-open");

    cb.recordSuccess();
    expect(cb.getState()).toBe("closed");
  });

  it("should reopen on failure in half-open state", () => {
    const cb = new CircuitBreaker({failureThreshold: 1, resetTimeoutMs: 10_000});
    cb.recordFailure();
    vi.advanceTimersByTime(10_000);
    expect(cb.getState()).toBe("half-open");

    cb.recordFailure();
    expect(cb.getState()).toBe("open");
    expect(cb.canExecute()).toBe(false);
  });

  it("should reset failure count on success in closed state", () => {
    const cb = new CircuitBreaker({failureThreshold: 3});
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    cb.recordFailure();
    expect(cb.getState()).toBe("closed");
  });

  it("getCircuitBreaker should return same instance for same id", () => {
    const cb1 = getCircuitBreaker("test-ds");
    const cb2 = getCircuitBreaker("test-ds");
    expect(cb1).toBe(cb2);
  });

  it("getCircuitBreaker should return different instances for different ids", () => {
    const cb1 = getCircuitBreaker("ds-a");
    const cb2 = getCircuitBreaker("ds-b");
    expect(cb1).not.toBe(cb2);
  });
});
