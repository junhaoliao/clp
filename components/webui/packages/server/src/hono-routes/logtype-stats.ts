import {tbValidator} from "@hono/typebox-validator";
import {
    type TSchema,
    Type,
} from "@sinclair/typebox";
import {Hono} from "hono";


const LogtypeStatsQuerySchema = Type.Object({
    archive_id: Type.String({minLength: 1}),
});

const MOCK_LOGTYPE_STATS = {
    logtypes: [
        {
            logtype: "INFO ResourceManager: Application " +
                "%VAR% is running on %VAR%",
            count: 15420,
            template: "INFO ResourceManager: Application " +
                "%VAR% is running on %VAR%",
            variables: [
                {index: 0, type: "string" as const},
                {index: 1, type: "string" as const},
            ],
        },
        {
            logtype: "WARN NodeManager: Container " +
                "%VAR% exceeded memory limit of %VAR% MB",
            count: 873,
            template: "WARN NodeManager: Container " +
                "%VAR% exceeded memory limit of %VAR% MB",
            variables: [
                {index: 0, type: "string" as const},
                {index: 1, type: "int" as const},
            ],
        },
        {
            logtype: "ERROR JobHistoryServer: Job " +
                "%VAR% failed with exit code %VAR% after %VAR% seconds",
            count: 342,
            template: "ERROR JobHistoryServer: Job " +
                "%VAR% failed with exit code %VAR% after %VAR% seconds",
            variables: [
                {index: 0, type: "string" as const},
                {index: 1, type: "int" as const},
                {index: 2, type: "float" as const},
            ],
        },
    ],
    sharedNodeWarnings: [
        {
            variableIndex: 0,
            variableType: "string",
            logtypes: [
                "INFO ResourceManager: Application " +
                    "%VAR% is running on %VAR%",
                "WARN NodeManager: Container " +
                    "%VAR% exceeded memory limit of %VAR% MB",
                "ERROR JobHistoryServer: Job " +
                    "%VAR% failed with exit code %VAR% " +
                    "after %VAR% seconds",
            ],
            message: "Variable at position 0 appears in " +
                "3 logtypes with consistent type (string). " +
                "This creates a shared node in the schema tree.",
        },
        {
            variableIndex: 1,
            variableType: "mixed",
            logtypes: [
                "WARN NodeManager: Container " +
                    "%VAR% exceeded memory limit of %VAR% MB",
                "ERROR JobHistoryServer: Job " +
                    "%VAR% failed with exit code %VAR% " +
                    "after %VAR% seconds",
            ],
            message: "Variable at position 1 appears in " +
                "2 logtypes with inconsistent types " +
                "(string, int). This creates a shared node " +
                "in the schema tree that may cause " +
                "ambiguous query results.",
        },
    ],
    totalCount: 16635,
};


export const logtypeStatsRoutes = new Hono()
    .get(
        "/",
        tbValidator("query", LogtypeStatsQuerySchema as unknown as TSchema),
        async (c) => {
            const query = c.req.valid("query") as {archive_id: string};
            // eslint-disable-next-line camelcase
            const {archive_id} = query;

            return c.json({
                // eslint-disable-next-line camelcase
                archiveId: archive_id,
                ...MOCK_LOGTYPE_STATS,
            });
        },
    );

export type LogtypeStatsRoutesType = typeof logtypeStatsRoutes;
