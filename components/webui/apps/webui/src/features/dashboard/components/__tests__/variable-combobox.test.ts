import {
    describe,
    expect,
    it,
    vi,
} from "vitest";
import {
    renderHook,
    waitFor,
} from "@testing-library/react";
import {useVariableComboboxSearch} from "../variable-combobox";


describe("useVariableComboboxSearch", () => {
    it("should not fetch when disabled", () => {
        const mockFetch = vi.fn();
        vi.stubGlobal("fetch", mockFetch);

        renderHook(() => useVariableComboboxSearch({
            datasourceUid: "ds-1",
            enabled: false,
            query: "SELECT host FROM hosts",
        }));

        expect(mockFetch).not.toHaveBeenCalled();
        vi.restoreAllMocks();
    });

    it("should fetch options on mount when enabled", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({
                data: [{fields: [{name: "host", values: ["host-1", "host-2"]}], length: 2}],
            }),
            ok: true,
        });
        vi.stubGlobal("fetch", mockFetch);

        const {result} = renderHook(() => useVariableComboboxSearch({
            datasourceUid: "ds-1",
            enabled: true,
            query: "SELECT host FROM hosts",
        }));

        await waitFor(() => {
            expect(result.current.items.length).toBe(2);
        });

        expect(result.current.items[0]!.label).toBe("host-1");
        expect(result.current.isLoading).toBe(false);
        vi.restoreAllMocks();
    });

    it("should handle fetch errors gracefully", async () => {
        const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
        vi.stubGlobal("fetch", mockFetch);

        const {result} = renderHook(() => useVariableComboboxSearch({
            datasourceUid: "ds-1",
            enabled: true,
            query: "SELECT host FROM hosts",
        }));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.items).toEqual([]);
        vi.restoreAllMocks();
    });

    it("should handle empty response data", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({data: []}),
            ok: true,
        });
        vi.stubGlobal("fetch", mockFetch);

        const {result} = renderHook(() => useVariableComboboxSearch({
            datasourceUid: "ds-1",
            enabled: true,
            query: "SELECT host FROM hosts",
        }));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.items).toEqual([]);
        vi.restoreAllMocks();
    });

    it("should not fetch when query is empty", async () => {
        const mockFetch = vi.fn();
        vi.stubGlobal("fetch", mockFetch);

        renderHook(() => useVariableComboboxSearch({
            datasourceUid: "ds-1",
            enabled: true,
        }));

        expect(mockFetch).not.toHaveBeenCalled();
        vi.restoreAllMocks();
    });
});
