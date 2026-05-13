import {Type, type Static} from "@sinclair/typebox";

/** Grid position schema */
export const GridPosSchema = Type.Object({
  x: Type.Integer({minimum: 0, maximum: 11}),
  y: Type.Integer({minimum: 0}),
  w: Type.Integer({minimum: 1, maximum: 12}),
  h: Type.Integer({minimum: 1}),
});

/** Panel type enum */
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

/** Datasource type enum */
export const DatasourceTypeSchema = Type.Union([
  Type.Literal("mysql"),
  Type.Literal("clp"),
  Type.Literal("infinity"),
]);

/** Datasource reference schema */
export const DatasourceRefSchema = Type.Object({
  type: DatasourceTypeSchema,
  uid: Type.String({minLength: 1, maxLength: 32}),
});

/** Panel query schema */
export const PanelQuerySchema = Type.Object({
  refId: Type.String({minLength: 1}),
  datasource: DatasourceRefSchema,
  query: Type.Any(),
});

/** Dashboard variable schema */
export const DashboardVariableSchema = Type.Object({
  id: Type.String({minLength: 1}),
  name: Type.String({minLength: 1}),
  label: Type.Optional(Type.String()),
  type: Type.Union([
    Type.Literal("query"),
    Type.Literal("custom"),
    Type.Literal("textbox"),
    Type.Literal("datasource"),
    Type.Literal("interval"),
  ]),
  defaultValue: Type.Optional(Type.Any()),
  current: Type.Optional(Type.Object({
    value: Type.Any(),
    text: Type.String(),
  })),
  options: Type.Optional(Type.Array(Type.Object({
    value: Type.Any(),
    text: Type.String(),
    selected: Type.Boolean(),
  }))),
  datasource: Type.Optional(DatasourceRefSchema),
  query: Type.Optional(Type.String()),
  multi: Type.Optional(Type.Boolean()),
  includeAll: Type.Optional(Type.Boolean()),
  dependsOn: Type.Optional(Type.Array(Type.String())),
});

/** Time range schema */
export const DashboardTimeRangeSchema = Type.Object({
  from: Type.String({minLength: 1}),
  to: Type.String({minLength: 1}),
});

/** Panel schema */
export const DashboardPanelSchema = Type.Object({
  id: Type.String({minLength: 1}),
  type: PanelTypeSchema,
  title: Type.String(),
  description: Type.Optional(Type.String()),
  gridPos: GridPosSchema,
  datasource: DatasourceRefSchema,
  queries: Type.Array(PanelQuerySchema),
  options: Type.Record(Type.String(), Type.Any()),
  fieldConfig: Type.Optional(Type.Any()),
  schemaVersion: Type.Optional(Type.Integer()),
  timeFrom: Type.Optional(Type.String()),
  transparent: Type.Optional(Type.Boolean()),
  repeatVariable: Type.Optional(Type.String()),
  collapsed: Type.Optional(Type.Boolean()),
  tabId: Type.Optional(Type.String()),
});

/** Dashboard tab schema */
export const DashboardTabSchema = Type.Object({
  id: Type.String({minLength: 1}),
  order: Type.Integer({minimum: 1}),
  title: Type.String(),
});

/** Annotation schema */
export const AnnotationSchema = Type.Object({
  id: Type.String({minLength: 1}),
  time: Type.Number(),
  timeEnd: Type.Optional(Type.Number()),
  title: Type.String(),
  tags: Type.Optional(Type.Array(Type.String())),
  color: Type.Optional(Type.String()),
});

/** Create dashboard request */
export const CreateDashboardSchema = Type.Object({
  uid: Type.Optional(Type.String({minLength: 1, maxLength: 32})),
  title: Type.String({minLength: 1, maxLength: 255}),
  description: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
  variables: Type.Optional(Type.Array(DashboardVariableSchema)),
  timeRange: Type.Optional(DashboardTimeRangeSchema),
  refreshInterval: Type.Optional(Type.String()),
  panels: Type.Optional(Type.Array(DashboardPanelSchema)),
  tabs: Type.Optional(Type.Array(DashboardTabSchema)),
  annotations: Type.Optional(Type.Array(AnnotationSchema)),
});

export type CreateDashboardRequest = Static<typeof CreateDashboardSchema>;

/** Update dashboard request */
export const UpdateDashboardSchema = Type.Object({
  title: Type.Optional(Type.String({minLength: 1, maxLength: 255})),
  description: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
  variables: Type.Optional(Type.Array(DashboardVariableSchema)),
  timeRange: Type.Optional(DashboardTimeRangeSchema),
  refreshInterval: Type.Optional(Type.String()),
  panels: Type.Optional(Type.Array(DashboardPanelSchema)),
  tabs: Type.Optional(Type.Array(DashboardTabSchema)),
  annotations: Type.Optional(Type.Array(AnnotationSchema)),
  version: Type.Integer({minimum: 1}),
});

export type UpdateDashboardRequest = Static<typeof UpdateDashboardSchema>;

/** Dashboard response */
export const DashboardResponseSchema = Type.Object({
  id: Type.String(),
  uid: Type.String(),
  title: Type.String(),
  description: Type.Optional(Type.String()),
  tags: Type.Array(Type.String()),
  variables: Type.Array(DashboardVariableSchema),
  timeRange: DashboardTimeRangeSchema,
  refreshInterval: Type.Optional(Type.String()),
  panels: Type.Array(DashboardPanelSchema),
  tabs: Type.Optional(Type.Array(DashboardTabSchema)),
  annotations: Type.Optional(Type.Array(AnnotationSchema)),
  version: Type.Integer(),
  updatedAt: Type.String(),
  createdAt: Type.String(),
});

/** Dashboard summary (for list endpoint) */
export const DashboardSummarySchema = Type.Object({
  id: Type.String(),
  uid: Type.String(),
  title: Type.String(),
  tags: Type.Array(Type.String()),
  updatedAt: Type.String(),
});

/** Datasource instance schema */
export const DatasourceInstanceSchema = Type.Object({
  id: Type.String(),
  uid: Type.String(),
  name: Type.String({minLength: 1, maxLength: 255}),
  type: DatasourceTypeSchema,
  config: Type.Record(Type.String(), Type.Any()),
  isDefault: Type.Boolean(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

/** Create datasource request */
export const CreateDatasourceSchema = Type.Object({
  uid: Type.Optional(Type.String({minLength: 1, maxLength: 32})),
  name: Type.String({minLength: 1, maxLength: 255}),
  type: DatasourceTypeSchema,
  config: Type.Record(Type.String(), Type.Any()),
  isDefault: Type.Optional(Type.Boolean()),
});

export type CreateDatasourceRequest = Static<typeof CreateDatasourceSchema>;

/** Update datasource request */
export const UpdateDatasourceSchema = Type.Object({
  name: Type.Optional(Type.String({minLength: 1, maxLength: 255})),
  config: Type.Optional(Type.Record(Type.String(), Type.Any())),
  isDefault: Type.Optional(Type.Boolean()),
});

export type UpdateDatasourceRequest = Static<typeof UpdateDatasourceSchema>;
