import {
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";


// Mock socket.io-client with a module-level factory
const {mockIo} = vi.hoisted(() => {
    const mockIo = vi.fn().mockReturnValue({connected: true});
    return {mockIo};
});

vi.mock("socket.io-client", () => ({
    io: (...args: unknown[]) => mockIo(...args),
    Socket: class {
    },
}));

describe("getSharedSocket", () => {
    beforeEach(() => {
        // Reset the module's internal state by re-importing
        vi.resetModules();
    });

    test("creates a new socket connection on first call", async () => {
        mockIo.mockReturnValue({connected: true});
        const {getSharedSocket: getSocket} = await import("./SocketSingleton");
        const socket = getSocket();

        expect(mockIo).toHaveBeenCalled();
        expect(socket).toEqual({connected: true});
    });
});
