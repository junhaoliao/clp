import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {renderHook, act} from "@testing-library/react";
import {useDebouncedVariableSetter} from "../use-debounced-variable";
import {useDashboardVariableStore} from "../../stores/variable-store";

describe("useDebouncedVariableSetter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useDashboardVariableStore.setState({variableValues: {}});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should debounce variable updates by 300ms", () => {
    const {result} = renderHook(() => useDebouncedVariableSetter());

    act(() => {
      result.current("env", "staging");
    });

    // Not updated yet (within debounce window)
    expect(useDashboardVariableStore.getState().variableValues["env"]).toBeUndefined();

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(useDashboardVariableStore.getState().variableValues["env"]).toBe("staging");
  });

  it("should only apply the last value when called rapidly", () => {
    const {result} = renderHook(() => useDebouncedVariableSetter());

    act(() => {
      result.current("env", "dev");
      result.current("env", "staging");
      result.current("env", "prod");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(useDashboardVariableStore.getState().variableValues["env"]).toBe("prod");
  });
});
