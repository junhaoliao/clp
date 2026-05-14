import {create} from "zustand";
import {persist} from "zustand/middleware";


interface ClppSettingsState {
    defaultSchemaId: string | null;
    setDefaultSchemaId: (id: string | null) => void;
    reset: () => void;
}

const initialState = {
    defaultSchemaId: null,
};

export const useClppSettingsStore = create<ClppSettingsState>()(
    persist(
        (set) => ({
            ...initialState,
            setDefaultSchemaId: (id) => set({defaultSchemaId: id}),
            reset: () => set(initialState),
        }),
        {name: "clpp-settings"},
    ),
);
