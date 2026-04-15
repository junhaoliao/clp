import {
    describe,
    expect,
    test,
} from "vitest";

import {formatSizeInBytes} from "./format";


describe("formatSizeInBytes", () => {
    test("formats 0 bytes", () => {
        expect(formatSizeInBytes(0)).toBe("0 Bytes");
    });

    test("formats bytes", () => {
        expect(formatSizeInBytes(512)).toBe("512 Bytes");
    });

    test("formats KiB", () => {
        expect(formatSizeInBytes(1024)).toBe("1 KiB");
        expect(formatSizeInBytes(1536)).toBe("1.5 KiB");
    });

    test("formats MiB", () => {
        expect(formatSizeInBytes(1048576)).toBe("1 MiB");
        expect(formatSizeInBytes(1572864)).toBe("1.5 MiB");
    });

    test("formats GiB", () => {
        expect(formatSizeInBytes(1073741824)).toBe("1 GiB");
    });

    test("respects decimals parameter", () => {
        expect(formatSizeInBytes(1536, 0)).toBe("2 KiB");
        expect(formatSizeInBytes(1536, 3)).toBe("1.5 KiB");
    });
});
