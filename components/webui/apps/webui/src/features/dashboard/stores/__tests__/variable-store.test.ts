import {describe, it, expect, beforeEach} from "vitest";
import {useDashboardVariableStore} from "../variable-store";

describe("DashboardVariableStore", () => {
  beforeEach(() => {
    useDashboardVariableStore.setState({variableValues: {}});
  });

  it("should start with empty values", () => {
    expect(useDashboardVariableStore.getState().variableValues).toEqual({});
  });

  it("should set variable value", () => {
    useDashboardVariableStore.getState().setVariableValue("dataset", "prod");
    expect(useDashboardVariableStore.getState().variableValues["dataset"]).toBe("prod");
  });

  it("should update existing variable value", () => {
    useDashboardVariableStore.getState().setVariableValue("dataset", "dev");
    useDashboardVariableStore.getState().setVariableValue("dataset", "prod");
    expect(useDashboardVariableStore.getState().variableValues["dataset"]).toBe("prod");
  });

  it("should handle multiple variables", () => {
    useDashboardVariableStore.getState().setVariableValue("dataset", "prod");
    useDashboardVariableStore.getState().setVariableValue("region", "us-east");
    const state = useDashboardVariableStore.getState();
    expect(state.variableValues).toEqual({dataset: "prod", region: "us-east"});
  });
});
