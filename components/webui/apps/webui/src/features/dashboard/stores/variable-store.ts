import {create} from "zustand";

interface DashboardVariableState {
  variableValues: Record<string, unknown>;
  setVariableValue: (name: string, value: unknown) => void;
}

export const useDashboardVariableStore = create<DashboardVariableState>()((set) => ({
  variableValues: {},
  setVariableValue: (name, value) =>
    set((state) => ({variableValues: {...state.variableValues, [name]: value}})),
}));
