import {
    describe,
    expect,
    it,
} from "vitest";


/**
 * Serialize variable values to URL search params (var-name=value)
 *
 * @param variables
 * @param values
 */
function serializeVariablesToUrlParams (
    variables: {name: string; multi?: boolean}[],
    values: Record<string, unknown>,
): URLSearchParams {
    const params = new URLSearchParams();
    for (const v of variables) {
        const value = values[v.name];
        if (value !== undefined && "" !== value) {
            const serialized = Array.isArray(value) ?
                value.join(",") :
                String(value);

            params.set(`var-${v.name}`, serialized);
        }
    }

    return params;
}

/**
 * Deserialize URL search params back to variable values
 *
 * @param params
 * @param variables
 */
function deserializeVariablesFromUrlParams (
    params: URLSearchParams,
    variables: {name: string; multi?: boolean}[],
): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const v of variables) {
        const urlValue = params.get(`var-${v.name}`);
        if (null !== urlValue) {
            if (v.multi) {
                values[v.name] = urlValue.split(",");
            } else {
                values[v.name] = urlValue;
            }
        }
    }

    return values;
}

describe("Variable URL param serialization", () => {
    const variables = [
        {name: "dataset", multi: false},
        {name: "host", multi: true},
        {name: "env", multi: false},
    ];

    it("should serialize single-value variables", () => {
        const params = serializeVariablesToUrlParams(variables, {dataset: "production"});
        expect(params.get("var-dataset")).toBe("production");
    });

    it("should serialize multi-value variables as comma-separated", () => {
        const params = serializeVariablesToUrlParams(variables, {host: ["server1",
            "server2"]});

        expect(params.get("var-host")).toBe("server1,server2");
    });

    it("should skip empty values", () => {
        const params = serializeVariablesToUrlParams(variables, {dataset: ""});
        expect(params.get("var-dataset")).toBeNull();
    });

    it("should skip undefined values", () => {
        const params = serializeVariablesToUrlParams(variables, {env: undefined});
        expect(params.get("var-env")).toBeNull();
    });

    it("should deserialize single-value params", () => {
        const params = new URLSearchParams("var-dataset=staging");
        const values = deserializeVariablesFromUrlParams(params, variables);
        expect(values["dataset"]).toBe("staging");
    });

    it("should deserialize multi-value params by splitting on comma", () => {
        const params = new URLSearchParams("var-host=server1,server2,server3");
        const values = deserializeVariablesFromUrlParams(params, variables);
        expect(values["host"]).toEqual(["server1",
            "server2",
            "server3"]);
    });

    it("should roundtrip single-value variables", () => {
        const original = {dataset: "production", env: "dev"};
        const params = serializeVariablesToUrlParams(variables, original);
        const restored = deserializeVariablesFromUrlParams(params, variables);
        expect(restored["dataset"]).toBe("production");
        expect(restored["env"]).toBe("dev");
    });

    it("should roundtrip multi-value variables", () => {
        const original = {host: ["a",
            "b",
            "c"]};
        const params = serializeVariablesToUrlParams(variables, original);
        const restored = deserializeVariablesFromUrlParams(params, variables);
        expect(restored["host"]).toEqual(["a",
            "b",
            "c"]);
    });

    it("should ignore unknown variable params", () => {
        const params = new URLSearchParams("var-unknown=value");
        const values = deserializeVariablesFromUrlParams(params, variables);
        expect(values).toEqual({});
    });
});
