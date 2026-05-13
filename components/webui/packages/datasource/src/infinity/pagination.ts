interface PaginationConfig {
    mode: "none" | "offset" | "page" | "cursor";
    pageSize?: number;
    maxPages?: number;
    offsetParam?: string;
    limitParam?: string;
    pageParam?: string;
    cursorField?: string;
}

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_OFFSET_PARAM = "offset";
const DEFAULT_LIMIT_PARAM = "limit";
const DEFAULT_PAGE_PARAM = "page";
const MAX_PAGES_LIMIT = 10;

/**
 *
 * @param baseUrl
 * @param config
 * @param config.mode
 * @param config.page
 * @param config.pageSize
 * @param config.offsetParam
 * @param config.limitParam
 * @param config.pageParam
 */
export function buildPaginatedUrl (baseUrl: string, config: PaginationConfig & {page?: number}): string {
    if ("none" === config.mode) {
        return baseUrl;
    }

    const url = new URL(baseUrl);
    const pageSize = config.pageSize ?? DEFAULT_PAGE_SIZE;

    if ("offset" === config.mode) {
        const page = config.page ?? 1;
        const offsetParam = config.offsetParam ?? DEFAULT_OFFSET_PARAM;
        const limitParam = config.limitParam ?? DEFAULT_LIMIT_PARAM;
        url.searchParams.set(offsetParam, String((page - 1) * pageSize));
        url.searchParams.set(limitParam, String(pageSize));
    } else if ("page" === config.mode) {
        const page = config.page ?? 1;
        const pageParam = config.pageParam ?? DEFAULT_PAGE_PARAM;
        const limitParam = config.limitParam ?? DEFAULT_LIMIT_PARAM;
        url.searchParams.set(pageParam, String(page));
        url.searchParams.set(limitParam, String(pageSize));
    }

    return url.toString();
}

/**
 *
 * @param opts
 * @param opts.mode
 * @param opts.pageSize
 * @param opts.resultCount
 */
export function isPaginationComplete (opts: {
    mode: string;
    pageSize?: number;
    resultCount: number;
}): boolean {
    if ("none" === opts.mode) {
        return true;
    }

    const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;

    return opts.resultCount < pageSize;
}

/**
 *
 * @param pagination
 * @param pagination.mode
 * @param pagination.maxPages
 */
export function getMaxPages (pagination: {mode: string; maxPages?: number}): number {
    if ("none" === pagination.mode) {
        return 1;
    }

    return pagination.maxPages ?? MAX_PAGES_LIMIT;
}
