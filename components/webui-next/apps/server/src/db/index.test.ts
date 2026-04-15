import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";


// Mock mysql2
vi.mock("mysql2/promise", () => ({
    default: {
        createPool: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue([[],
                []]),
        }),
    },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm/mysql2", () => ({
    drizzle: vi.fn().mockReturnValue({}),
}));

// Mock mongodb
vi.mock("mongodb", () => ({
    MongoClient: vi.fn().mockImplementation(function (this: any) {
        this.connect = vi.fn().mockResolvedValue(undefined);
        this.db = vi.fn().mockReturnValue({collection: vi.fn()});
    }),
}));

// Import after mocks
import {
    connectMongo,
    pool,
} from "./index.js";


describe("DB Index", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should export a pool", () => {
        expect(pool).toBeDefined();
        expect(pool.execute).toBeDefined();
    });

    it("should connect to MongoDB and return db instance", async () => {
        const db = await connectMongo();

        expect(db).toBeDefined();
        expect(db.collection).toBeDefined();
    });

    it("should return cached db instance on subsequent calls", async () => {
        const db1 = await connectMongo();
        const db2 = await connectMongo();

        // Both should return the same instance
        expect(db1).toBe(db2);
    });
});
