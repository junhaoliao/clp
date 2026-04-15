interface PrestoRowObject {
    row: Record<string, unknown>;
}

interface PrestoSearchResult extends PrestoRowObject {
    _id: string;
}

export type {
    PrestoRowObject,
    PrestoSearchResult,
};
