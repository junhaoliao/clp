import {
    type Static,
    Type,
} from "@sinclair/typebox";


/** Schema for a panel's position on the 12-column grid. */
export const GridPosSchema = Type.Object({
    h: Type.Integer({minimum: 1}),
    w: Type.Integer({minimum: 1, maximum: 12}),
    x: Type.Integer({minimum: 0, maximum: 11}),
    y: Type.Integer({minimum: 0}),
});

/** Enum of supported visualization panel types. */
export const PanelTypeSchema = Type.Union([
    Type.Literal("timeseries"),
    Type.Literal("stat"),
    Type.Literal("table"),
    Type.Literal("barchart"),
    Type.Literal("logs"),
    Type.Literal("markdown"),
    Type.Literal("gauge"),
    Type.Literal("heatmap"),
    Type.Literal("piechart"),
    Type.Literal("row"),
]);

/** Enum of supported datasource backends. */
export const DatasourceTypeSchema = Type.Union([
    Type.Literal("mysql"),
    Type.Literal("clp"),
    Type.Literal("infinity"),
]);

/** Reference to a specific datasource instance by type and uid. */
export const DatasourceRefSchema = Type.Object({
    type: DatasourceTypeSchema,
    uid: Type.String({minLength: 1, maxLength: 32}),
});

/** A single query bound to a datasource within a panel. */
export const PanelQuerySchema = Type.Object({
    datasource: DatasourceRefSchema,
    query: Type.Any(),
    refId: Type.String({minLength: 1}),
});

/** Template variable for dashboard parameterization. */
export const DashboardVariableSchema = Type.Object({
    current: Type.Optional(Type.Object({
        text: Type.String(),
        value: Type.Any(),
    })),
    datasource: Type.Optional(DatasourceRefSchema),
    defaultValue: Type.Optional(Type.Any()),
    dependsOn: Type.Optional(Type.Array(Type.String())),
    id: Type.String({minLength: 1}),
    includeAll: Type.Optional(Type.Boolean()),
    label: Type.Optional(Type.String()),
    multi: Type.Optional(Type.Boolean()),
    name: Type.String({minLength: 1}),
    options: Type.Optional(Type.Array(Type.Object({
        selected: Type.Boolean(),
        text: Type.String(),
        value: Type.Any(),
    }))),
    query: Type.Optional(Type.String()),
    type: Type.Union([
        Type.Literal("query"),
        Type.Literal("custom"),
        Type.Literal("textbox"),
        Type.Literal("datasource"),
        Type.Literal("interval"),
    ]),
});

/** Absolute time range for dashboard filtering. */
export const DashboardTimeRangeSchema = Type.Object({
    from: Type.String({minLength: 1}),
    to: Type.String({minLength: 1}),
});

/** Visualization panel within a dashboard. */
export const DashboardPanelSchema = Type.Object({
    collapsed: Type.Optional(Type.Boolean()),
    datasource: DatasourceRefSchema,
    description: Type.Optional(Type.String()),
    fieldConfig: Type.Optional(Type.Any()),
    gridPos: GridPosSchema,
    id: Type.String({minLength: 1}),
    options: Type.Record(Type.String(), Type.Any()),
    queries: Type.Array(PanelQuerySchema),
    repeatVariable: Type.Optional(Type.String()),
    schemaVersion: Type.Optional(Type.Integer()),
    tabId: Type.Optional(Type.String()),
    timeFrom: Type.Optional(Type.String()),
    title: Type.String(),
    transparent: Type.Optional(Type.Boolean()),
    type: PanelTypeSchema,
});

/** Tab grouping within a dashboard row. */
export const DashboardTabSchema = Type.Object({
    id: Type.String({minLength: 1}),
    order: Type.Integer({minimum: 1}),
    title: Type.String(),
});

/** Time-stamped annotation overlay on dashboards. */
export const AnnotationSchema = Type.Object({
    color: Type.Optional(Type.String()),
    id: Type.String({minLength: 1}),
    tags: Type.Optional(Type.Array(Type.String())),
    time: Type.Number(),
    timeEnd: Type.Optional(Type.Number()),
    title: Type.String(),
});

/** Request body for creating a new dashboard. */
export const CreateDashboardSchema = Type.Object({
    annotations: Type.Optional(Type.Array(AnnotationSchema)),
    description: Type.Optional(Type.String()),
    panels: Type.Optional(Type.Array(DashboardPanelSchema)),
    refreshInterval: Type.Optional(Type.String()),
    tabs: Type.Optional(Type.Array(DashboardTabSchema)),
    tags: Type.Optional(Type.Array(Type.String())),
    timeRange: Type.Optional(DashboardTimeRangeSchema),
    title: Type.String({minLength: 1, maxLength: 255}),
    uid: Type.Optional(Type.String({minLength: 1, maxLength: 32})),
    variables: Type.Optional(Type.Array(DashboardVariableSchema)),
});

export type CreateDashboardRequest = Static<typeof CreateDashboardSchema>;

/** Request body for updating an existing dashboard. */
export const UpdateDashboardSchema = Type.Object({
    annotations: Type.Optional(Type.Array(AnnotationSchema)),
    description: Type.Optional(Type.String()),
    panels: Type.Optional(Type.Array(DashboardPanelSchema)),
    refreshInterval: Type.Optional(Type.String()),
    tabs: Type.Optional(Type.Array(DashboardTabSchema)),
    tags: Type.Optional(Type.Array(Type.String())),
    timeRange: Type.Optional(DashboardTimeRangeSchema),
    title: Type.Optional(Type.String({minLength: 1, maxLength: 255})),
    variables: Type.Optional(Type.Array(DashboardVariableSchema)),
    version: Type.Integer({minimum: 1}),
});

export type UpdateDashboardRequest = Static<typeof UpdateDashboardSchema>;

/** Full dashboard object returned by the API. */
export const DashboardResponseSchema = Type.Object({
    annotations: Type.Optional(Type.Array(AnnotationSchema)),
    createdAt: Type.String(),
    description: Type.Optional(Type.String()),
    id: Type.String(),
    panels: Type.Array(DashboardPanelSchema),
    refreshInterval: Type.Optional(Type.String()),
    tabs: Type.Optional(Type.Array(DashboardTabSchema)),
    tags: Type.Array(Type.String()),
    timeRange: DashboardTimeRangeSchema,
    title: Type.String(),
    uid: Type.String(),
    updatedAt: Type.String(),
    variables: Type.Array(DashboardVariableSchema),
    version: Type.Integer(),
});

/** Compact dashboard metadata for list endpoints. */
export const DashboardSummarySchema = Type.Object({
    id: Type.String(),
    tags: Type.Array(Type.String()),
    title: Type.String(),
    uid: Type.String(),
    updatedAt: Type.String(),
});

/** Full datasource instance returned by the API. */
export const DatasourceInstanceSchema = Type.Object({
    config: Type.Record(Type.String(), Type.Any()),
    createdAt: Type.String(),
    id: Type.String(),
    isDefault: Type.Boolean(),
    name: Type.String({minLength: 1, maxLength: 255}),
    type: DatasourceTypeSchema,
    uid: Type.String(),
    updatedAt: Type.String(),
});

/** Request body for creating a new datasource. */
export const CreateDatasourceSchema = Type.Object({
    config: Type.Record(Type.String(), Type.Any()),
    isDefault: Type.Optional(Type.Boolean()),
    name: Type.String({minLength: 1, maxLength: 255}),
    type: DatasourceTypeSchema,
    uid: Type.Optional(Type.String({minLength: 1, maxLength: 32})),
});

export type CreateDatasourceRequest = Static<typeof CreateDatasourceSchema>;

/** Request body for updating an existing datasource. */
export const UpdateDatasourceSchema = Type.Object({
    config: Type.Optional(Type.Record(Type.String(), Type.Any())),
    isDefault: Type.Optional(Type.Boolean()),
    name: Type.Optional(Type.String({minLength: 1, maxLength: 255})),
});

export type UpdateDatasourceRequest = Static<typeof UpdateDatasourceSchema>;
