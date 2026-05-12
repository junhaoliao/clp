import {
    beforeAll,
    describe,
    expect,
    it,
} from "vitest";


// Polyfill ResizeObserver for @dnd-kit/dom which references it at module level

beforeAll(() => {
    if ("undefined" === typeof globalThis.ResizeObserver) {
        /* eslint-disable class-methods-use-this, no-empty-function */
        globalThis.ResizeObserver = class {
            public observe () {
            }

            public unobserve () {
            }

            public disconnect () {
            }
        };
        /* eslint-enable class-methods-use-this, no-empty-function */
    }
});

describe("DnD Sensor Configuration", () => {
    it("should configure PointerSensor with distance activation constraint", async () => {
        const {"PointerSensor": PS} = await import("@dnd-kit/react");
        const {"PointerActivationConstraints": PAC} = await import("@dnd-kit/dom");

        const descriptor = PS.configure({
            activationConstraints: [
                new PAC.Distance({value: 5}),
            ],
        });

        expect(descriptor).toBeDefined();
        expect(descriptor.plugin).toBe(PS);
    });

    it("should configure KeyboardSensor with grid-cell offset", async () => {
        const {"KeyboardSensor": KS} = await import("@dnd-kit/react");

        const descriptor = KS.configure({
            offset: {x: 60, y: 60},
        });

        expect(descriptor).toBeDefined();
        expect(descriptor.plugin).toBe(KS);
    });

    it("should produce a stable sensors array", async () => {
        const {"PointerSensor": PS, "KeyboardSensor": KS} = await import("@dnd-kit/react");
        const {"PointerActivationConstraints": PAC} = await import("@dnd-kit/dom");

        const sensors = [
            PS.configure({
                activationConstraints: [
                    new PAC.Distance({value: 5}),
                ],
            }),
            KS.configure({
                offset: {x: 60, y: 60},
            }),
        ];

        expect(sensors).toHaveLength(2);
        expect(sensors[0]?.plugin).toBe(PS);
        expect(sensors[1]?.plugin).toBe(KS);
    });
});
