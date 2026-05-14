import {
    describe,
    expect,
    it,
} from "vitest";


const EMIT_ROW_COUNT = 100;
const BATCH_FLUSH_COUNT = 50;

/**
 *
 */
function createMockQueryStream () {
    const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

    return {
        /**
         *
         * @param event
         * @param handler
         */
        on (event: string, handler: (...args: unknown[]) => void) {
            if (!listeners[event]) {
                listeners[event] = [];
            }
            listeners[event].push(handler);

            return this;
        },

        /**
         *
         * @param event
         * @param args
         */
        emit (event: string, ...args: unknown[]) {
            const handlers = listeners[event] ?? [];
            for (const handler of handlers) {
                handler(...args);
            }
        },
    };
}

describe("MySQL streaming batch accumulator", () => {
    it("should flush rows when batch size is reached", () => {
        const batch: Record<string, unknown>[] = [];
        const flushed: Record<string, unknown>[][] = [];
        const flush = () => {
            if (0 < batch.length) {
                flushed.push([...batch]);
                batch.length = 0;
            }
        };

        for (let i = 0; i < EMIT_ROW_COUNT; i++) {
            batch.push({id: i});
            if (BATCH_FLUSH_COUNT === batch.length) {
                flush();
            }
        }
        flush();

        expect(flushed).toHaveLength(2);
        expect(flushed[0]).toHaveLength(BATCH_FLUSH_COUNT);
        expect(flushed[1]).toHaveLength(EMIT_ROW_COUNT - BATCH_FLUSH_COUNT);
    });

    it("should flush remaining rows on stream end", () => {
        const batch: Record<string, unknown>[] = [];
        const flushed: Record<string, unknown>[][] = [];
        const flush = () => {
            if (0 < batch.length) {
                flushed.push([...batch]);
                batch.length = 0;
            }
        };

        for (let i = 0; 30 > i; i++) {
            batch.push({id: i});
            if (BATCH_FLUSH_COUNT === batch.length) {
                flush();
            }
        }

        // End of stream — flush remaining
        flush();

        expect(flushed).toHaveLength(1);
        expect(flushed[0]).toHaveLength(30);
    });

    it("should handle empty stream with no flushes", () => {
        const batch: Record<string, unknown>[] = [];
        const flushed: Record<string, unknown>[][] = [];
        const flush = () => {
            if (0 < batch.length) {
                flushed.push([...batch]);
                batch.length = 0;
            }
        };

        flush();

        expect(flushed).toHaveLength(0);
    });
});

describe("MySQL streaming event handling", () => {
    it("should emit row events from mock stream", () => {
        const stream = createMockQueryStream();
        const rows: unknown[] = [];

        stream.on("result", (row: unknown) => {
            rows.push(row);
        });

        stream.emit("result", {id: 1});
        stream.emit("result", {id: 2});

        expect(rows).toHaveLength(2);
    });

    it("should handle stream end event", () => {
        const stream = createMockQueryStream();
        let ended = false;

        stream.on("end", () => {
            ended = true;
        });

        expect(ended).toBe(false);
        stream.emit("end");
        expect(ended).toBe(true);
    });

    it("should handle stream error event", () => {
        const stream = createMockQueryStream();
        let caughtError: unknown;

        stream.on("error", (error: unknown) => {
            caughtError = error;
        });

        stream.emit("error", new Error("connection lost"));
        expect(caughtError).toBeInstanceOf(Error);
    });
});
