import {
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {useClppSettingsStore} from "../clpp-settings-store";


describe("ClppSettingsStore", () => {
    beforeEach(() => {
        useClppSettingsStore.setState({
            defaultSchemaId: null,
        });
    });

    it("should start with no default schema", () => {
        expect(useClppSettingsStore.getState().defaultSchemaId).toBeNull();
    });

    it("should set default schema id", () => {
        useClppSettingsStore.getState().setDefaultSchemaId("schema-123");
        expect(useClppSettingsStore.getState().defaultSchemaId).toBe("schema-123");
    });

    it("should clear default schema id", () => {
        useClppSettingsStore.getState().setDefaultSchemaId("schema-123");
        useClppSettingsStore.getState().setDefaultSchemaId(null);
        expect(useClppSettingsStore.getState().defaultSchemaId).toBeNull();
    });

    it("should reset all settings", () => {
        useClppSettingsStore.getState().setDefaultSchemaId("schema-456");
        useClppSettingsStore.getState().reset();
        expect(useClppSettingsStore.getState().defaultSchemaId).toBeNull();
    });
});
