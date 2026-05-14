import {parseTimeRange} from "./parse-time-range";


/**
 * Interpolate dashboard variables into a string.
 * Replaces $variable_name and ${variable_name} tokens with their current values.
 *
 * @param template
 * @param variables
 */
export function interpolateVariables (
    template: string,
    variables: Record<string, unknown>,
): string {
    return template.replace(/\$\{(\w+)\}|\$(\w+)/g, (_match, braced, bare) => {
        const name = braced ?? bare;
        const value = variables[name];
        if (value === undefined) {
            return _match;
        }
        if (Array.isArray(value)) {
            return value.join(",");
        }

        return String(value);
    });
}

/**
 * Parameterize dashboard variables for safe SQL execution.
 * Replaces $variable_name and ${variable_name} tokens with ? placeholders
 * and collects the values in order for MySQL parameterized queries.
 *
 * @param template
 * @param variables
 */
export function parameterizeVariables (
    template: string,
    variables: Record<string, unknown>,
): {sql: string; params: unknown[]} {
    const params: unknown[] = [];
    const sql = template.replace(/\$\{(\w+)\}|\$(\w+)/g, (_match, braced, bare) => {
        const name = braced ?? bare;
        const value = variables[name];
        if (value === undefined) {
            return _match;
        }
        if (Array.isArray(value)) {
            params.push(...value);

            return value.map(() => "?").join(", ");
        }
        params.push(value);

        return "?";
    });

    return {params, sql};
}

/**
 * Calculate $__interval based on time range and approximate panel width
 *
 * @param fromMs
 * @param toMs
 * @param panelWidthPx
 */
function calculateInterval (fromMs: number, toMs: number, panelWidthPx: number = 1000): string {
    const rangeMs = toMs - fromMs;
    const targetDataPoints = Math.max(30, Math.min(500, Math.floor(panelWidthPx / 3)));
    const intervalMs = Math.max(1000, Math.floor(rangeMs / targetDataPoints));

    if (60000 > intervalMs) {
        return `${Math.max(1, Math.round(intervalMs / 1000))}s`;
    }
    if (3600000 > intervalMs) {
        return `${Math.round(intervalMs / 60000)}m`;
    }
    if (86400000 > intervalMs) {
        return `${Math.round(intervalMs / 3600000)}h`;
    }

    return `${Math.round(intervalMs / 86400000)}d`;
}

/**
 * Resolve all variables including built-ins
 *
 * @param customVariables
 * @param timeRange
 * @param timeRange.from
 * @param timeRange.to
 * @param dashboardUid
 * @param panelWidthPx
 */
export function resolveVariables (
    customVariables: Record<string, unknown>,
    timeRange?: {from: string; to: string},
    dashboardUid?: string,
    panelWidthPx?: number,
): Record<string, unknown> {
    const resolved: Record<string, unknown> = {
        ...customVariables,
    };

    if (timeRange) {
        const fromMs = parseTimeRange(timeRange.from);
        const toMs = parseTimeRange(timeRange.to);
        resolved["__from"] = String(fromMs);
        resolved["__to"] = String(toMs);
        resolved["__interval"] = calculateInterval(fromMs, toMs, panelWidthPx);
    } else {
        resolved["__interval"] = "1m";
    }

    resolved["__dashboard"] = dashboardUid ?? "";

    return resolved;
}
