import {create} from "zustand";
import {persist} from "zustand/middleware";


interface ClppSettingsState {
    defaultSchemaId: string | null;
    experimentalMode: boolean;
    reset: () => void;
    setDefaultSchemaId: (id: string | null) => void;
    setExperimentalMode: (enabled: boolean) => void;
}

const initialState = {
    defaultSchemaId: null,
    experimentalMode: false,
};

export const useClppSettingsStore = create<ClppSettingsState>()(
    persist(
        (set) => ({
            ...initialState,
            setDefaultSchemaId: (id) => set({defaultSchemaId: id}),
            setExperimentalMode: (enabled) => set({experimentalMode: enabled}),
            reset: () => set(initialState),
        }),
        {name: "clpp-settings"},
    ),
);
