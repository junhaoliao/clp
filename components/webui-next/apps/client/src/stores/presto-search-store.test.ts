import {act} from "@testing-library/react";
import {
    beforeEach,
    describe,
    expect,
    test,
} from "vitest";

import usePrestoSearchStore, {
    PRESTO_SEARCH_STATE_DEFAULT,
    PRESTO_SQL_INTERFACE,
} from "./presto-search-store";


describe("usePrestoSearchStore", () => {
    beforeEach(() => {
        act(() => {
            usePrestoSearchStore.setState({...PRESTO_SEARCH_STATE_DEFAULT});
        });
    });

    test("initializes with default state", () => {
        const state = usePrestoSearchStore.getState();

        expect(state.sqlInterface).toBe(PRESTO_SQL_INTERFACE.GUIDED);
        expect(state.select).toBe("*");
        expect(state.where).toBe("");
        expect(state.orderBy).toBe("");
        expect(state.timestampKey).toBeNull();
        expect(state.errorMsg).toBeNull();
        expect(state.errorName).toBeNull();
        expect(state.queryDrawerOpen).toBe(false);
        expect(state.cachedGuidedSearchQueryString).toBe("");
    });

    test("setSqlInterface switches between guided and freeform", () => {
        act(() => {
            usePrestoSearchStore.getState().setSqlInterface(PRESTO_SQL_INTERFACE.FREEFORM);
        });
        expect(usePrestoSearchStore.getState().sqlInterface).toBe(PRESTO_SQL_INTERFACE.FREEFORM);

        act(() => {
            usePrestoSearchStore.getState().setSqlInterface(PRESTO_SQL_INTERFACE.GUIDED);
        });
        expect(usePrestoSearchStore.getState().sqlInterface).toBe(PRESTO_SQL_INTERFACE.GUIDED);
    });

    test("updateSelect updates SELECT clause", () => {
        act(() => {
            usePrestoSearchStore.getState().updateSelect("timestamp, message");
        });
        expect(usePrestoSearchStore.getState().select).toBe("timestamp, message");
    });

    test("updateWhere updates WHERE clause", () => {
        act(() => {
            usePrestoSearchStore.getState().updateWhere("level = 'ERROR'");
        });
        expect(usePrestoSearchStore.getState().where).toBe("level = 'ERROR'");
    });

    test("updateOrderBy updates ORDER BY clause", () => {
        act(() => {
            usePrestoSearchStore.getState().updateOrderBy("timestamp DESC");
        });
        expect(usePrestoSearchStore.getState().orderBy).toBe("timestamp DESC");
    });

    test("updateTimestampKey updates timestamp key", () => {
        act(() => {
            usePrestoSearchStore.getState().updateTimestampKey("created_at");
        });
        expect(usePrestoSearchStore.getState().timestampKey).toBe("created_at");
    });

    test("updateTimestampKey can set to null", () => {
        act(() => {
            usePrestoSearchStore.getState().updateTimestampKey("created_at");
        });
        act(() => {
            usePrestoSearchStore.getState().updateTimestampKey(null);
        });
        expect(usePrestoSearchStore.getState().timestampKey).toBeNull();
    });

    test("updateErrorMsg updates error message", () => {
        act(() => {
            usePrestoSearchStore.getState().updateErrorMsg("Query failed: timeout");
        });
        expect(usePrestoSearchStore.getState().errorMsg).toBe("Query failed: timeout");
    });

    test("updateErrorName updates error name", () => {
        act(() => {
            usePrestoSearchStore.getState().updateErrorName("TIMEOUT_ERROR");
        });
        expect(usePrestoSearchStore.getState().errorName).toBe("TIMEOUT_ERROR");
    });

    test("updateQueryDrawerOpen toggles drawer", () => {
        expect(usePrestoSearchStore.getState().queryDrawerOpen).toBe(false);
        act(() => {
            usePrestoSearchStore.getState().updateQueryDrawerOpen(true);
        });
        expect(usePrestoSearchStore.getState().queryDrawerOpen).toBe(true);
    });

    test("updateCachedGuidedSearchQueryString updates cached query", () => {
        act(() => {
            usePrestoSearchStore.getState().updateCachedGuidedSearchQueryString(
                "SELECT * FROM table"
            );
        });
        expect(usePrestoSearchStore.getState().cachedGuidedSearchQueryString).toBe(
            "SELECT * FROM table"
        );
    });

    test("multiple updates compose correctly", () => {
        act(() => {
            const store = usePrestoSearchStore.getState();
            store.setSqlInterface(PRESTO_SQL_INTERFACE.FREEFORM);
            store.updateSelect("col1, col2");
            store.updateWhere("col1 > 0");
            store.updateErrorMsg("some error");
        });

        const state = usePrestoSearchStore.getState();
        expect(state.sqlInterface).toBe(PRESTO_SQL_INTERFACE.FREEFORM);
        expect(state.select).toBe("col1, col2");
        expect(state.where).toBe("col1 > 0");
        expect(state.errorMsg).toBe("some error");
    });
});
